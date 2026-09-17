import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Purchase, PurchaseDocument } from './schemas/purchase.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { Supplier, SupplierDocument } from '../suppliers/schemas/supplier.schema';
import { InventoryService } from '../inventory/inventory.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { PaymentsService } from '../payments/payments.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { BusinessSettingsService } from '../business-settings/business-settings.service';
import { CreatePurchaseDto, PurchaseReturnDto, QueryPurchaseDto } from './dto/purchase.dto';
import {
  AuditAction,
  PaymentMethod,
  PaymentStatus,
  PaymentType,
  PurchaseStatus,
  StockTransactionType,
} from '../common/enums';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { roundToTwoDecimals } from '../common/utils/currency.util';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectModel(Purchase.name)
    private readonly purchaseModel: Model<PurchaseDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    private readonly inventoryService: InventoryService,
    private readonly suppliersService: SuppliersService,
    private readonly paymentsService: PaymentsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly settingsService: BusinessSettingsService,
  ) {}

  async create(dto: CreatePurchaseDto, userId?: string): Promise<PurchaseDocument> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Purchase must contain at least one item');
    }

    const supplier = await this.supplierModel.findById(dto.supplier).exec();
    if (!supplier) {
      throw new NotFoundException(`Supplier with ID '${dto.supplier}' not found`);
    }

    // Generate or validate purchaseNumber
    const settings = await this.settingsService.getSettings();
    const prefix = settings.invoice.purchasePrefix || 'PUR-';
    const purchaseNumber =
      dto.purchaseNumber?.trim().toUpperCase() ||
      `${prefix}${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`;

    const existing = await this.purchaseModel.findOne({ purchaseNumber }).exec();
    if (existing) {
      throw new BadRequestException(`Purchase number '${purchaseNumber}' already exists`);
    }

    // Calculate line items and totals
    let subtotal = 0;
    const itemsWithSnapshots: {
      product: any;
      productName: string;
      productSku: string;
      quantity: number;
      unitCost: number;
      subtotal: number;
    }[] = [];

    for (const item of dto.items) {
      const product = await this.productModel.findById(item.product).exec();
      if (!product) {
        throw new NotFoundException(`Product with ID '${item.product}' not found`);
      }
      const lineSubtotal = roundToTwoDecimals(item.quantity * item.unitCost);
      subtotal += lineSubtotal;

      itemsWithSnapshots.push({
        product: product._id,
        productName: product.name,
        productSku: product.SKU,
        quantity: item.quantity,
        unitCost: item.unitCost,
        subtotal: lineSubtotal,
      });
    }

    subtotal = roundToTwoDecimals(subtotal);
    const discount = roundToTwoDecimals(dto.discount || 0);
    const tax = roundToTwoDecimals(dto.tax || 0);
    const shippingCost = roundToTwoDecimals(dto.shippingCost || 0);
    const grandTotal = roundToTwoDecimals(subtotal - discount + tax + shippingCost);
    const paidAmount = roundToTwoDecimals(dto.paidAmount || 0);
    const dueAmount = roundToTwoDecimals(Math.max(0, grandTotal - paidAmount));

    let paymentStatus = PaymentStatus.UNPAID;
    if (paidAmount >= grandTotal && grandTotal > 0) {
      paymentStatus = PaymentStatus.PAID;
    } else if (paidAmount > 0) {
      paymentStatus = PaymentStatus.PARTIAL;
    }

    const status = dto.status || PurchaseStatus.COMPLETED;

    // Use atomic transaction session
    return this.inventoryService.withTransaction(async (session) => {
      const purchase = new this.purchaseModel({
        purchaseNumber,
        supplier: supplier._id,
        purchaseDate: dto.purchaseDate || new Date(),
        items: itemsWithSnapshots,
        subtotal,
        discount,
        tax,
        shippingCost,
        grandTotal,
        paidAmount,
        dueAmount,
        paymentStatus,
        paymentMethod: dto.paymentMethod || PaymentMethod.CASH,
        status,
        note: dto.note || null,
        createdBy: userId || null,
      });

      const savedPurchase = session ? await purchase.save({ session }) : await purchase.save();

      // If COMPLETED: update inventory, supplier payable, and record payment
      if (status === PurchaseStatus.COMPLETED) {
        for (const item of itemsWithSnapshots) {
          await this.inventoryService.recordMovement(
            {
              productId: item.product.toString(),
              quantityDelta: item.quantity,
              type: StockTransactionType.PURCHASE,
              unitCost: item.unitCost,
              referenceType: 'Purchase',
              referenceId: savedPurchase._id,
              note: `Purchase ${purchaseNumber}`,
              performedBy: userId,
              transactionDate: savedPurchase.purchaseDate,
            },
            session,
          );
        }

        // Adjust supplier payable by the due amount
        if (dueAmount > 0) {
          await this.suppliersService.adjustPayable(supplier._id.toString(), dueAmount, session);
        }

        // Record payment for paid amount
        if (paidAmount > 0) {
          await this.paymentsService.recordPayment(
            {
              amount: paidAmount,
              method: dto.paymentMethod || PaymentMethod.CASH,
              type: PaymentType.PURCHASE_PAYMENT,
              reference: purchaseNumber,
              purchase: savedPurchase._id.toString(),
              supplier: supplier._id.toString(),
              transactionDate: savedPurchase.purchaseDate,
              note: `Payment for Purchase ${purchaseNumber}`,
            },
            userId,
            session,
          );
        }
      }

      await this.auditLogsService.log({
        userId,
        action: AuditAction.PURCHASE_CREATED,
        entityType: 'Purchase',
        entityId: savedPurchase._id.toString(),
        summary: `Created purchase ${purchaseNumber} from ${supplier.name} for grand total $${grandTotal}`,
        metadata: { grandTotal, paidAmount, dueAmount, status },
      });

      return savedPurchase;
    });
  }

  async findAll(query: QueryPurchaseDto) {
    const { page = 1, limit = 20, supplier, status, startDate, endDate, search } = query;
    const filter: Record<string, any> = {};

    if (supplier) filter.supplier = supplier;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.purchaseDate = {};
      if (startDate) filter.purchaseDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.purchaseDate.$lte = end;
      }
    }

    if (search) {
      filter.$or = [
        { purchaseNumber: { $regex: search, $options: 'i' } },
        { note: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total, summary] = await Promise.all([
      this.purchaseModel
        .find(filter)
        .populate('supplier', 'name companyName phone')
        .populate('createdBy', 'firstName lastName')
        .sort({ purchaseDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.purchaseModel.countDocuments(filter).exec(),
      this.purchaseModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalGrandTotal: { $sum: '$grandTotal' },
            totalPaid: { $sum: '$paidAmount' },
            totalDue: { $sum: '$dueAmount' },
          },
        },
      ]),
    ]);

    const paginated = createPaginatedResponse(data, total, page, limit);

    return {
      ...paginated,
      summary: {
        totalGrandTotal: roundToTwoDecimals(summary[0]?.totalGrandTotal || 0),
        totalPaid: roundToTwoDecimals(summary[0]?.totalPaid || 0),
        totalDue: roundToTwoDecimals(summary[0]?.totalDue || 0),
      },
    };
  }

  async findOne(id: string): Promise<PurchaseDocument> {
    const purchase = await this.purchaseModel
      .findById(id)
      .populate('supplier', 'name companyName phone email address')
      .populate('items.product', 'name SKU barcode unit')
      .populate('createdBy', 'firstName lastName')
      .exec();

    if (!purchase) {
      throw new NotFoundException(`Purchase with ID '${id}' not found`);
    }
    return purchase;
  }

  async processReturn(
    id: string,
    dto: PurchaseReturnDto,
    userId?: string,
  ): Promise<{ message: string; purchase: PurchaseDocument }> {
    const purchase = await this.findOne(id);
    if (purchase.status !== PurchaseStatus.COMPLETED) {
      throw new BadRequestException('Returns can only be processed on COMPLETED purchases');
    }

    return this.inventoryService.withTransaction(async (session) => {
      let refundTotal = 0;

      for (const retItem of dto.items) {
        const item = purchase.items.find(
          (i) =>
            i.product.toString() === retItem.product ||
            (i.product as any)._id?.toString() === retItem.product,
        );

        if (!item) {
          throw new BadRequestException(
            `Product '${retItem.product}' was not found in purchase '${purchase.purchaseNumber}'`,
          );
        }

        if (retItem.quantity > item.quantity) {
          throw new BadRequestException(
            `Return quantity ${retItem.quantity} exceeds purchased quantity ${item.quantity}`,
          );
        }

        const itemRefund = roundToTwoDecimals(retItem.quantity * item.unitCost);
        refundTotal += itemRefund;

        // Reduce inventory atomically and record PURCHASE_RETURN
        await this.inventoryService.recordMovement(
          {
            productId: retItem.product,
            quantityDelta: -retItem.quantity,
            type: StockTransactionType.PURCHASE_RETURN,
            unitCost: item.unitCost,
            referenceType: 'PurchaseReturn',
            referenceId: purchase._id,
            reason: dto.reason,
            performedBy: userId,
          },
          session,
        );
      }

      // Adjust supplier payable
      const supplierId = (purchase.supplier as any)._id?.toString() || purchase.supplier.toString();
      await this.suppliersService.adjustPayable(supplierId, -refundTotal, session);

      await this.auditLogsService.log({
        userId,
        action: AuditAction.PURCHASE_RETURN,
        entityType: 'Purchase',
        entityId: purchase._id.toString(),
        summary: `Processed return of $${refundTotal} on purchase ${purchase.purchaseNumber}. Reason: ${dto.reason}`,
        metadata: dto,
      });

      return {
        message: `Successfully processed return of $${refundTotal}`,
        purchase,
      };
    });
  }
}
