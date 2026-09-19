import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, ClientSession } from 'mongoose';
import { StockTransaction, StockTransactionDocument } from './schemas/stock-transaction.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { BusinessSettingsService } from '../business-settings/business-settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import {
  NotificationType,
  StockOutReason,
  StockTransactionType,
  AuditAction,
} from '../common/enums';
import {
  StockAdjustmentDto,
  StockInDto,
  StockOutDto,
  QueryStockTransactionsDto,
} from './dto/inventory.dto';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { roundToTwoDecimals } from '../common/utils/currency.util';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(StockTransaction.name)
    private readonly stockTransactionModel: Model<StockTransactionDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly settingsService: BusinessSettingsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Helper to execute an operation inside a MongoDB transaction session.
   * Gracefully handles standalone instances (e.g. if replica set is not initialized) while fully supporting replica sets.
   */
  async withTransaction<T>(work: (session: ClientSession | null) => Promise<T>): Promise<T> {
    let session: ClientSession | null = null;
    try {
      session = await this.connection.startSession();
      session.startTransaction();
      const result = await work(session);
      await session.commitTransaction();
      return result;
    } catch (error: any) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }
      // If error indicates transactions aren't supported (standalone mongo), fallback to session-less
      if (error?.message?.includes('Transactions are not supported')) {
        this.logger.warn('Standalone MongoDB detected; falling back to transaction-free execution');
        return work(null);
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Core atomic stock mutation method that guarantees an immutable StockTransaction log entry.
   */
  async recordMovement(
    params: {
      productId: string;
      quantityDelta: number; // positive for increases, negative for decreases
      type: StockTransactionType;
      unitCost?: number;
      referenceType?: string;
      referenceId?: any;
      reason?: string;
      note?: string;
      performedBy?: string;
      transactionDate?: Date;
    },
    session: ClientSession | null = null,
  ): Promise<{ product: ProductDocument; transaction: StockTransactionDocument }> {
    const {
      productId,
      quantityDelta,
      type,
      unitCost,
      referenceType,
      referenceId,
      reason,
      note,
      performedBy,
      transactionDate = new Date(),
    } = params;

    const initialQuery = this.productModel.findById(productId);
    if (session) initialQuery.session(session);
    const existingProduct = await initialQuery.exec();

    if (!existingProduct) {
      throw new NotFoundException(`Product with ID '${productId}' not found`);
    }

    if (!existingProduct.trackStock) {
      // For service items or untracked products, return without transaction
      return { product: existingProduct, transaction: null as any };
    }

    const settings = await this.settingsService.getSettings();
    const allowNegative = settings.inventory?.allowNegativeStock ?? false;

    // Database-level concurrency protection:
    // If reducing stock and negative stock is disallowed, match only if currentStock >= requested deduction
    const filter: Record<string, any> = { _id: productId };
    if (quantityDelta < 0 && !allowNegative) {
      filter.currentStock = { $gte: Math.abs(quantityDelta) };
    }

    const updateQuery = this.productModel.findOneAndUpdate(
      filter,
      { $inc: { currentStock: quantityDelta } },
      { new: true, session: session || undefined },
    );

    const updatedProduct = await updateQuery.exec();

    if (!updatedProduct) {
      // Stock was insufficient under concurrent condition
      throw new BadRequestException(
        `Insufficient stock for product '${existingProduct.name}' (SKU: ${existingProduct.SKU}). Current: ${existingProduct.currentStock}, Requested deduction: ${Math.abs(quantityDelta)}`,
      );
    }

    const newStock = updatedProduct.currentStock;
    const previousStock = newStock - quantityDelta;

    // Create StockTransaction log entry
    const transaction = new this.stockTransactionModel({
      product: updatedProduct._id,
      type,
      quantity: quantityDelta,
      previousStock,
      newStock,
      unitCost: unitCost !== undefined ? unitCost : updatedProduct.purchasePrice,
      referenceType,
      referenceId,
      reason,
      note,
      performedBy: performedBy || null,
      transactionDate,
    });

    if (session) {
      await transaction.save({ session });
    } else {
      await transaction.save();
    }

    // Check low stock & out of stock triggers (dispatched asynchronously after mutation)
    setImmediate(async () => {
      await this.evaluateStockAlerts(updatedProduct);
    });

    return { product: updatedProduct, transaction };
  }

  async stockIn(dto: StockInDto, userId?: string) {
    return this.withTransaction(async (session) => {
      const result = await this.recordMovement(
        {
          productId: dto.product,
          quantityDelta: Math.abs(dto.quantity),
          type: StockTransactionType.STOCK_IN,
          unitCost: dto.unitCost,
          referenceType: 'StockIn',
          referenceId: null,
          reason: 'Manual Stock In',
          note: dto.note || (dto.referenceNumber ? `Ref: ${dto.referenceNumber}` : undefined),
          performedBy: userId,
          transactionDate: dto.transactionDate || new Date(),
        },
        session,
      );

      await this.auditLogsService.log({
        userId,
        action: AuditAction.STOCK_IN,
        entityType: 'Inventory',
        entityId: dto.product,
        summary: `Stock in +${dto.quantity} for product ${result.product.name} (SKU: ${result.product.SKU})`,
        metadata: dto,
      });

      return {
        product: result.product,
        transaction: result.transaction,
      };
    });
  }

  async stockOut(dto: StockOutDto, userId?: string) {
    let txType: StockTransactionType = StockTransactionType.STOCK_OUT;
    if (dto.reason === StockOutReason.DAMAGE) txType = StockTransactionType.DAMAGE;
    else if (dto.reason === StockOutReason.LOST) txType = StockTransactionType.LOST;

    return this.withTransaction(async (session) => {
      const result = await this.recordMovement(
        {
          productId: dto.product,
          quantityDelta: -Math.abs(dto.quantity),
          type: txType,
          reason: dto.reason,
          referenceType: 'StockOut',
          note: dto.note,
          performedBy: userId,
          transactionDate: dto.transactionDate || new Date(),
        },
        session,
      );

      await this.auditLogsService.log({
        userId,
        action: AuditAction.STOCK_OUT,
        entityType: 'Inventory',
        entityId: dto.product,
        summary: `Stock out -${dto.quantity} (${dto.reason}) for product ${result.product.name}`,
        metadata: dto,
      });

      return {
        product: result.product,
        transaction: result.transaction,
      };
    });
  }

  async adjustStock(dto: StockAdjustmentDto, userId?: string) {
    return this.withTransaction(async (session) => {
      const product = await this.productModel.findById(dto.product).session(session).exec();
      if (!product) {
        throw new NotFoundException(`Product with ID '${dto.product}' not found`);
      }

      const diff = dto.newStock - product.currentStock;
      if (diff === 0) {
        return { product, transaction: null, message: 'Stock already matches specified quantity' };
      }

      const txType =
        diff > 0 ? StockTransactionType.ADJUSTMENT_IN : StockTransactionType.ADJUSTMENT_OUT;

      const result = await this.recordMovement(
        {
          productId: dto.product,
          quantityDelta: diff,
          type: txType,
          reason: dto.reason,
          referenceType: 'Adjustment',
          note: dto.note,
          performedBy: userId,
        },
        session,
      );

      await this.auditLogsService.log({
        userId,
        action: AuditAction.STOCK_ADJUSTMENT,
        entityType: 'Inventory',
        entityId: dto.product,
        summary: `Adjusted stock for ${product.name} from ${result.transaction.previousStock} to ${dto.newStock}. Reason: ${dto.reason}`,
        metadata: dto,
      });

      return {
        product: result.product,
        transaction: result.transaction,
      };
    });
  }

  async getCurrentInventory(query: {
    page?: number;
    limit?: number;
    search?: string;
    category?: string;
    stockStatus?: 'all' | 'inStock' | 'lowStock' | 'outOfStock';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      stockStatus = 'all',
      sortBy = 'name',
      sortOrder = 'asc',
    } = query;

    const settings = await this.settingsService.getSettings();
    const defaultThreshold = settings.inventory.defaultLowStockThreshold || 5;

    const filter: Record<string, any> = { isArchived: false };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { SKU: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      filter.category = category;
    }

    if (stockStatus === 'outOfStock') {
      filter.currentStock = { $lte: 0 };
    } else if (stockStatus === 'inStock') {
      filter.currentStock = { $gt: 0 };
    } else if (stockStatus === 'lowStock') {
      filter.$expr = {
        $and: [
          { $gt: ['$currentStock', 0] },
          {
            $lte: ['$currentStock', { $ifNull: ['$lowStockThreshold', defaultThreshold] }],
          },
        ],
      };
    }

    const sortObj: Record<string, any> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [products, total, aggregates] = await Promise.all([
      this.productModel
        .find(filter)
        .populate('category', 'name slug')
        .populate('brand', 'name slug')
        .populate('unit', 'name shortName')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.productModel.countDocuments(filter).exec(),
      this.getValuationSummary(),
    ]);

    const formattedData = products.map((p) => {
      const threshold = p.lowStockThreshold ?? defaultThreshold;
      const isOutOfStock = p.currentStock <= 0;
      const isLowStock = !isOutOfStock && p.currentStock <= threshold;

      return {
        _id: p._id,
        name: p.name,
        SKU: p.SKU,
        barcode: p.barcode,
        category: p.category,
        brand: p.brand,
        unit: p.unit,
        currentStock: p.currentStock,
        lowStockThreshold: threshold,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        purchaseValue: roundToTwoDecimals(p.currentStock * p.purchasePrice),
        potentialSellingValue: roundToTwoDecimals(p.currentStock * p.sellingPrice),
        stockStatus: isOutOfStock ? 'OUT_OF_STOCK' : isLowStock ? 'LOW_STOCK' : 'IN_STOCK',
        trackStock: p.trackStock,
      };
    });

    const paginated = createPaginatedResponse(formattedData, total, page, limit);

    return {
      ...paginated,
      summary: aggregates,
    };
  }

  async getValuationSummary() {
    const result = await this.productModel.aggregate([
      { $match: { isArchived: false } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalStockQuantity: { $sum: '$currentStock' },
          totalPurchaseValue: {
            $sum: { $multiply: ['$currentStock', '$purchasePrice'] },
          },
          totalPotentialSellingValue: {
            $sum: { $multiply: ['$currentStock', '$sellingPrice'] },
          },
        },
      },
    ]);

    const summary = result[0] || {
      totalProducts: 0,
      totalStockQuantity: 0,
      totalPurchaseValue: 0,
      totalPotentialSellingValue: 0,
    };

    return {
      totalProducts: summary.totalProducts,
      totalStockQuantity: summary.totalStockQuantity,
      totalPurchaseValue: roundToTwoDecimals(summary.totalPurchaseValue),
      totalPotentialSellingValue: roundToTwoDecimals(summary.totalPotentialSellingValue),
      potentialGrossMargin: roundToTwoDecimals(
        summary.totalPotentialSellingValue - summary.totalPurchaseValue,
      ),
    };
  }

  async getLowStockAlerts() {
    const settings = await this.settingsService.getSettings();
    const defaultThreshold = settings.inventory.defaultLowStockThreshold || 5;

    const [lowStockProducts, outOfStockCount, lowStockCount] = await Promise.all([
      this.productModel
        .find({
          isArchived: false,
          trackStock: true,
          $expr: {
            $lte: ['$currentStock', { $ifNull: ['$lowStockThreshold', defaultThreshold] }],
          },
        })
        .populate('category', 'name')
        .populate('unit', 'name shortName')
        .sort({ currentStock: 1 })
        .limit(20)
        .lean()
        .exec(),
      this.productModel.countDocuments({
        isArchived: false,
        trackStock: true,
        currentStock: { $lte: 0 },
      }),
      this.productModel.countDocuments({
        isArchived: false,
        trackStock: true,
        $expr: {
          $and: [
            { $gt: ['$currentStock', 0] },
            {
              $lte: ['$currentStock', { $ifNull: ['$lowStockThreshold', defaultThreshold] }],
            },
          ],
        },
      }),
    ]);

    return {
      outOfStockCount,
      lowStockCount,
      totalAlerts: outOfStockCount + lowStockCount,
      products: lowStockProducts.map((p) => ({
        _id: p._id,
        name: p.name,
        SKU: p.SKU,
        currentStock: p.currentStock,
        lowStockThreshold: p.lowStockThreshold ?? defaultThreshold,
        category: p.category,
        unit: p.unit,
        isOutOfStock: p.currentStock <= 0,
      })),
    };
  }

  async getTransactions(query: QueryStockTransactionsDto) {
    const { page = 1, limit = 20, product, type, startDate, endDate } = query;
    const filter: Record<string, any> = {};

    if (product) filter.product = product;
    if (type) filter.type = type;

    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.transactionDate.$lte = end;
      }
    }

    const [data, total] = await Promise.all([
      this.stockTransactionModel
        .find(filter)
        .populate('product', 'name SKU barcode unit')
        .populate('performedBy', 'firstName lastName')
        .sort({ transactionDate: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.stockTransactionModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  private async evaluateStockAlerts(product: ProductDocument) {
    try {
      const settings = await this.settingsService.getSettings();
      const threshold =
        product.lowStockThreshold ?? settings.inventory.defaultLowStockThreshold ?? 5;

      if (product.currentStock <= 0) {
        await this.notificationsService.create({
          title: `Product Out of Stock: ${product.name}`,
          message: `${product.name} (SKU: ${product.SKU}) is out of stock! Current stock: ${product.currentStock}`,
          type: NotificationType.OUT_OF_STOCK,
          relatedEntity: { entityType: 'Product', entityId: product._id.toString() },
        });
      } else if (product.currentStock <= threshold) {
        await this.notificationsService.create({
          title: `Low Stock Alert: ${product.name}`,
          message: `${product.name} (SKU: ${product.SKU}) is low on stock (${product.currentStock} remaining, threshold: ${threshold})`,
          type: NotificationType.LOW_STOCK,
          relatedEntity: { entityType: 'Product', entityId: product._id.toString() },
        });
      }
    } catch (err: any) {
      this.logger.error(`Stock alert evaluation failed: ${err.message}`);
    }
  }
}
