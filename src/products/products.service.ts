import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto, QueryProductDto, UpdateProductDto } from './dto/product.dto';
import { InventoryService } from '../inventory/inventory.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction, StockTransactionType } from '../common/enums';
import { generateSlug } from '../common/utils/slug.util';
import { createPaginatedResponse } from '../common/utils/pagination.util';
import { BusinessSettingsService } from '../business-settings/business-settings.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @Inject(forwardRef(() => InventoryService))
    private readonly inventoryService: InventoryService,
    private readonly auditLogsService: AuditLogsService,
    private readonly settingsService: BusinessSettingsService,
  ) {}

  async create(dto: CreateProductDto, userId?: string): Promise<ProductDocument> {
    const sku = dto.SKU.trim().toUpperCase();

    const existingSku = await this.productModel.findOne({ SKU: sku }).exec();
    if (existingSku) {
      throw new ConflictException(`Product with SKU '${sku}' already exists`);
    }

    if (dto.barcode) {
      const existingBarcode = await this.productModel
        .findOne({ barcode: dto.barcode.trim() })
        .exec();
      if (existingBarcode) {
        throw new ConflictException(`Product with barcode '${dto.barcode}' already exists`);
      }
    }

    const slug = generateSlug(dto.name);
    const openingStock = dto.openingStock || 0;

    const product = new this.productModel({
      name: dto.name.trim(),
      slug,
      SKU: sku,
      barcode: dto.barcode ? dto.barcode.trim() : null,
      category: dto.category,
      brand: dto.brand || null,
      unit: dto.unit,
      description: dto.description || null,
      images: dto.images || [],
      purchasePrice: dto.purchasePrice,
      sellingPrice: dto.sellingPrice,
      wholesalePrice: dto.wholesalePrice || null,
      currentStock: 0,
      openingStock,
      lowStockThreshold: dto.lowStockThreshold || null,
      trackStock: dto.trackStock !== undefined ? dto.trackStock : true,
      customAttributes: dto.customAttributes || {},
      isActive: true,
      isArchived: false,
    });

    let saved: ProductDocument = (await product.save()) as ProductDocument;

    // If opening stock was specified and trackStock is true, record OPENING_STOCK transaction
    if (openingStock > 0 && product.trackStock) {
      const movement = await this.inventoryService.recordMovement({
        productId: saved._id.toString(),
        quantityDelta: openingStock,
        type: StockTransactionType.OPENING_STOCK,
        unitCost: dto.purchasePrice,
        referenceType: 'ProductOpeningStock',
        referenceId: saved._id,
        reason: 'Initial Opening Stock',
        performedBy: userId,
      });
      saved = movement.product as ProductDocument;
    }

    await this.auditLogsService.log({
      userId,
      action: AuditAction.PRODUCT_CREATED,
      entityType: 'Product',
      entityId: saved._id.toString(),
      summary: `Created product '${saved.name}' (SKU: ${saved.SKU}) with opening stock ${openingStock}`,
      metadata: {
        SKU: saved.SKU,
        purchasePrice: saved.purchasePrice,
        sellingPrice: saved.sellingPrice,
      },
    });

    return saved;
  }

  async findAll(query: QueryProductDto) {
    const {
      page = 1,
      limit = 20,
      search,
      category,
      brand,
      stockStatus,
      minPrice,
      maxPrice,
      isArchived = false,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const filter: Record<string, any> = { isArchived };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { SKU: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) filter.category = category;
    if (brand) filter.brand = brand;

    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.sellingPrice = {};
      if (minPrice !== undefined) filter.sellingPrice.$gte = minPrice;
      if (maxPrice !== undefined) filter.sellingPrice.$lte = maxPrice;
    }

    if (stockStatus) {
      const settings = await this.settingsService.getSettings();
      const defaultThreshold = settings.inventory.defaultLowStockThreshold || 5;

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
    }

    const sortObj: Record<string, any> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
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
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string): Promise<ProductDocument> {
    const product = await this.productModel
      .findById(id)
      .populate('category', 'name slug')
      .populate('brand', 'name slug')
      .populate('unit', 'name shortName')
      .exec();

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }
    return product;
  }

  async findBySkuOrBarcode(code: string): Promise<ProductDocument | null> {
    const clean = code.trim();
    return this.productModel
      .findOne({
        $or: [{ SKU: clean.toUpperCase() }, { barcode: clean }],
        isArchived: false,
      })
      .populate('category', 'name')
      .populate('brand', 'name')
      .populate('unit', 'name shortName')
      .exec();
  }

  async update(id: string, dto: UpdateProductDto, userId?: string): Promise<ProductDocument> {
    const product = await this.findOne(id);

    if (dto.SKU && dto.SKU.trim().toUpperCase() !== product.SKU) {
      const newSku = dto.SKU.trim().toUpperCase();
      const existing = await this.productModel.findOne({ SKU: newSku, _id: { $ne: id } }).exec();
      if (existing) {
        throw new ConflictException(`SKU '${newSku}' is already in use by another product`);
      }
      product.SKU = newSku;
    }

    if (dto.barcode !== undefined && dto.barcode !== product.barcode) {
      if (dto.barcode) {
        const newBarcode = dto.barcode.trim();
        const existing = await this.productModel
          .findOne({ barcode: newBarcode, _id: { $ne: id } })
          .exec();
        if (existing) {
          throw new ConflictException(
            `Barcode '${newBarcode}' is already in use by another product`,
          );
        }
        product.barcode = newBarcode;
      } else {
        product.barcode = undefined;
      }
    }

    if (dto.name) {
      product.name = dto.name.trim();
      product.slug = generateSlug(dto.name);
    }
    if (dto.category) product.category = dto.category as any;
    if (dto.brand !== undefined) product.brand = (dto.brand || null) as any;
    if (dto.unit) product.unit = dto.unit as any;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.images) product.images = dto.images;
    if (dto.purchasePrice !== undefined) product.purchasePrice = dto.purchasePrice;
    if (dto.sellingPrice !== undefined) product.sellingPrice = dto.sellingPrice;
    if (dto.wholesalePrice !== undefined) product.wholesalePrice = dto.wholesalePrice;
    if (dto.lowStockThreshold !== undefined) product.lowStockThreshold = dto.lowStockThreshold;
    if (dto.trackStock !== undefined) product.trackStock = dto.trackStock;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;
    if (dto.customAttributes) {
      product.customAttributes = { ...product.customAttributes, ...dto.customAttributes };
    }

    const saved = await product.save();

    await this.auditLogsService.log({
      userId,
      action: AuditAction.PRODUCT_UPDATED,
      entityType: 'Product',
      entityId: saved._id.toString(),
      summary: `Updated product '${saved.name}' (SKU: ${saved.SKU})`,
      metadata: dto,
    });

    return saved;
  }

  async archive(id: string, userId?: string): Promise<ProductDocument> {
    const product = await this.findOne(id);
    product.isArchived = true;
    const saved = await product.save();

    await this.auditLogsService.log({
      userId,
      action: AuditAction.PRODUCT_ARCHIVED,
      entityType: 'Product',
      entityId: saved._id.toString(),
      summary: `Archived product '${saved.name}' (SKU: ${saved.SKU})`,
    });

    return saved;
  }

  async restore(id: string, userId?: string): Promise<ProductDocument> {
    const product = await this.findOne(id);
    product.isArchived = false;
    const saved = await product.save();

    await this.auditLogsService.log({
      userId,
      action: AuditAction.PRODUCT_RESTORED,
      entityType: 'Product',
      entityId: saved._id.toString(),
      summary: `Restored archived product '${saved.name}' (SKU: ${saved.SKU})`,
    });

    return saved;
  }
}
