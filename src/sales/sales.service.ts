import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Sale, SaleDocument } from './schemas/sale.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { InventoryService } from '../inventory/inventory.service';
import { CustomersService } from '../customers/customers.service';
import { PaymentsService } from '../payments/payments.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessSettingsService } from '../business-settings/business-settings.service';
import { CreateSaleDto, QuerySaleDto, SaleReturnDto } from './dto/sale.dto';
import {
  AuditAction,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  SaleStatus,
  StockTransactionType,
} from '../common/enums';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { roundToTwoDecimals } from '../common/utils/currency.util';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectModel(Sale.name)
    private readonly saleModel: Model<SaleDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    private readonly inventoryService: InventoryService,
    private readonly customersService: CustomersService,
    private readonly paymentsService: PaymentsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly settingsService: BusinessSettingsService,
  ) {}

  async create(dto: CreateSaleDto, userId?: string): Promise<SaleDocument> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Sale must contain at least one product item');
    }

    let customer: CustomerDocument | null = null;
    if (dto.customer) {
      customer = await this.customerModel.findById(dto.customer).exec();
      if (!customer) {
        throw new NotFoundException(`Customer with ID '${dto.customer}' not found`);
      }
    }

    const settings = await this.settingsService.getSettings();
    const prefix = settings.invoice.invoicePrefix || 'INV-';
    const saleNumber =
      dto.saleNumber?.trim().toUpperCase() ||
      `${prefix}${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    const existing = await this.saleModel.findOne({ saleNumber }).exec();
    if (existing) {
      throw new BadRequestException(`Sale invoice '${saleNumber}' already exists`);
    }

    // Build line items with exact purchaseCostAtSale snapshots
    let subtotal = 0;
    let itemsGrossProfit = 0;
    const itemsWithSnapshots: {
      product: any;
      productName: string;
      productSku: string;
      quantity: number;
      sellingPrice: number;
      purchaseCostAtSale: number;
      subtotal: number;
      profit: number;
    }[] = [];

    for (const item of dto.items) {
      const product = await this.productModel.findById(item.product).exec();
      if (!product) {
        throw new NotFoundException(`Product with ID '${item.product}' not found`);
      }

      const lineSubtotal = roundToTwoDecimals(item.quantity * item.sellingPrice);
      // Purchase cost snapshot at the moment of sale
      const costAtSale = product.purchasePrice;
      const lineProfit = roundToTwoDecimals((item.sellingPrice - costAtSale) * item.quantity);

      subtotal += lineSubtotal;
      itemsGrossProfit += lineProfit;

      itemsWithSnapshots.push({
        product: product._id,
        productName: product.name,
        productSku: product.SKU,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
        purchaseCostAtSale: costAtSale,
        subtotal: lineSubtotal,
        profit: lineProfit,
      });
    }

    subtotal = roundToTwoDecimals(subtotal);
    const discount = roundToTwoDecimals(dto.discount || 0);
    const tax = roundToTwoDecimals(dto.tax || 0);
    const grandTotal = roundToTwoDecimals(subtotal - discount + tax);
    const paidAmount = roundToTwoDecimals(dto.paidAmount || 0);
    const dueAmount = roundToTwoDecimals(Math.max(0, grandTotal - paidAmount));
    const totalProfit = roundToTwoDecimals(itemsGrossProfit - discount);

    let paymentStatus = PaymentStatus.UNPAID;
    if (paidAmount >= grandTotal && grandTotal > 0) {
      paymentStatus = PaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = PaymentStatus.PARTIAL;
    }

    const status = dto.status || SaleStatus.COMPLETED;

    // Execute atomically inside session
    return this.inventoryService.withTransaction(async (session) => {
      const sale = new this.saleModel({
        saleNumber,
        customer: customer ? customer._id : null,
        saleDate: dto.saleDate || new Date(),
        items: itemsWithSnapshots,
        subtotal,
        discount,
        tax,
        grandTotal,
        paidAmount,
        dueAmount,
        totalProfit,
        paymentStatus,
        paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
        status,
        notes: dto.notes || null,
        createdBy: userId || null,
      });

      const savedSale = session ? await sale.save({ session }) : await sale.save();

      // If COMPLETED: reduce inventory, update customer receivable, record payment
      if (status === SaleStatus.COMPLETED) {
        for (const item of itemsWithSnapshots) {
          await this.inventoryService.recordMovement(
            {
              productId: item.product.toString(),
              quantityDelta: -item.quantity,
              type: StockTransactionType.SALE,
              unitCost: item.purchaseCostAtSale,
              referenceType: 'Sale',
              referenceId: savedSale._id,
              note: `Sale invoice ${saleNumber}`,
              performedBy: userId,
              transactionDate: savedSale.saleDate,
            },
            session,
          );
        }

        // If customer provided and due amount exists, increment customer receivable
        if (customer && dueAmount > 0) {
          await this.customersService.adjustReceivable(customer._id.toString(), dueAmount, session);
        }

        // Record payment for paid amount
        if (paidAmount > 0) {
          await this.paymentsService.recordPayment(
            {
              amount: paidAmount,
              method: dto.paymentMethod || PaymentMethod.CASH,
              type: PaymentType.SALE_PAYMENT,
              reference: saleNumber,
              sale: savedSale._id.toString(),
              customer: customer ? customer._id.toString() : undefined,
              transactionDate: savedSale.saleDate,
              note: `Payment for Sale ${saleNumber}`,
            },
            userId,
            session,
          );
        }
      }

      await this.auditLogsService.log({
        userId,
        action: AuditAction.SALE_CREATED,
        entityType: 'Sale',
        entityId: savedSale._id.toString(),
        summary: `Created sale ${saleNumber} for grand total $${grandTotal} (Profit: $${totalProfit})`,
        metadata: { grandTotal, paidAmount, dueAmount, totalProfit },
      });

      return savedSale;
    });
  }

  async findAll(query: QuerySaleDto) {
    const { page = 1, limit = 20, customer, status, startDate, endDate, search } = query;
    const filter: Record<string, any> = {};

    if (customer) filter.customer = customer;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.saleDate = {};
      if (startDate) filter.saleDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.saleDate.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { saleNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total, summary] = await Promise.all([
      this.saleModel
        .find(filter)
        .populate('customer', 'name phone')
        .populate('createdBy', 'firstName lastName')
        .sort({ saleDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.saleModel.countDocuments(filter).exec(),
      this.saleModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$grandTotal' },
            totalPaid: { $sum: '$paidAmount' },
            totalDue: { $sum: '$dueAmount' },
            totalProfit: { $sum: '$totalProfit' },
          },
        },
      ]),
    ]);

    const paginated = createPaginatedResponse(data, total, page, limit);

    return {
      ...paginated,
      summary: {
        totalSales: roundToTwoDecimals(summary[0]?.totalSales || 0),
        totalPaid: roundToTwoDecimals(summary[0]?.totalPaid || 0),
        totalDue: roundToTwoDecimals(summary[0]?.totalDue || 0),
        totalProfit: roundToTwoDecimals(summary[0]?.totalProfit || 0),
      },
    };
  }

  async findOne(id: string): Promise<SaleDocument> {
    const sale = await this.saleModel
      .findById(id)
      .populate('customer', 'name phone email address')
      .populate('items.product', 'name SKU barcode unit')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!sale) {
      throw new NotFoundException(`Sale with ID '${id}' not found`);
    }
    return sale;
  }

  async processReturn(
    id: string,
    dto: SaleReturnDto,
    userId?: string,
  ): Promise<{ message: string; sale: SaleDocument }> {
    const sale = await this.findOne(id);
    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException('Returns can only be processed on COMPLETED sales');
    }

    return this.inventoryService.withTransaction(async (session) => {
      let returnTotal = 0;

      for (const retItem of dto.items) {
        const item = sale.items.find(
          (i) =>
            i.product.toString() === retItem.product ||
            (i.product as any)._id?.toString() === retItem.product,
        );

        if (!item) {
          throw new BadRequestException(
            `Product '${retItem.product}' was not found in sale '${sale.saleNumber}'`,
          );
        }

        if (retItem.quantity > item.quantity) {
          throw new BadRequestException(
            `Return quantity ${retItem.quantity} exceeds sold quantity ${item.quantity}`,
          );
        }

        returnTotal += roundToTwoDecimals(retItem.quantity * item.sellingPrice);

        // Increase inventory atomically and record SALE_RETURN
        await this.inventoryService.recordMovement(
          {
            productId: retItem.product,
            quantityDelta: retItem.quantity,
            type: StockTransactionType.SALE_RETURN,
            unitCost: item.purchaseCostAtSale,
            referenceType: 'SaleReturn',
            referenceId: sale._id,
            reason: dto.reason,
            performedBy: userId,
          },
          session,
        );
      }

      // If customer was attached, reduce customer receivable
      if (sale.customer) {
        const customerId = (sale.customer as any)._id?.toString() || sale.customer.toString();
        await this.customersService.adjustReceivable(customerId, -returnTotal, session);
      }

      await this.auditLogsService.log({
        userId,
        action: AuditAction.SALE_RETURN,
        entityType: 'Sale',
        entityId: sale._id.toString(),
        summary: `Processed sale return of $${returnTotal} on sale ${sale.saleNumber}. Reason: ${dto.reason}`,
        metadata: dto,
      });

      return {
        message: `Successfully processed sale return of $${returnTotal}`,
        sale,
      };
    });
  }
}
