import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Brand, BrandDocument } from './schemas/brand.schema';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';
import { PaginationQueryDto, createPaginatedResponse } from '../common/utils/pagination.util';
import { generateSlug } from '../common/utils/slug.util';

@Injectable()
export class BrandsService {
  constructor(
    @InjectModel(Brand.name)
    private readonly brandModel: Model<BrandDocument>,
  ) {}

  async create(dto: CreateBrandDto): Promise<BrandDocument> {
    const slug = generateSlug(dto.name);
    const existing = await this.brandModel.findOne({ slug }).exec();
    if (existing) {
      throw new BadRequestException(`Brand '${dto.name}' already exists`);
    }

    const brand = new this.brandModel({
      name: dto.name,
      slug,
      logo: dto.logo || null,
      description: dto.description || null,
      isActive: true,
    });

    return brand.save();
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = query;
    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortObj: Record<string, any> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      this.brandModel
        .find(filter)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.brandModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findAllActive() {
    return this.brandModel.find({ isActive: true }).sort({ name: 1 }).lean().exec();
  }

  async findOne(id: string): Promise<BrandDocument> {
    const brand = await this.brandModel.findById(id).exec();
    if (!brand) {
      throw new NotFoundException(`Brand with ID '${id}' not found`);
    }
    return brand;
  }

  async update(id: string, dto: UpdateBrandDto): Promise<BrandDocument> {
    const brand = await this.findOne(id);

    if (dto.name && dto.name !== brand.name) {
      const slug = generateSlug(dto.name);
      const existing = await this.brandModel.findOne({ slug, _id: { $ne: id } }).exec();
      if (existing) {
        throw new BadRequestException(`Brand name '${dto.name}' conflicts with an existing brand`);
      }
      brand.name = dto.name;
      brand.slug = slug;
    }

    if (dto.logo !== undefined) brand.logo = dto.logo;
    if (dto.description !== undefined) brand.description = dto.description;
    if (dto.isActive !== undefined) brand.isActive = dto.isActive;

    return brand.save();
  }

  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const brand = await this.findOne(id);
    await this.brandModel.findByIdAndDelete(id).exec();
    return { success: true, message: `Brand '${brand.name}' deleted successfully` };
  }
}
