import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { PaginationQueryDto, createPaginatedResponse } from '../common/utils/pagination.util';
import { generateSlug } from '../common/utils/slug.util';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(dto: CreateCategoryDto): Promise<CategoryDocument> {
    const slug = generateSlug(dto.name);
    const existing = await this.categoryModel.findOne({ slug }).exec();
    if (existing) {
      throw new BadRequestException(`A category with name '${dto.name}' already exists.`);
    }

    const category = new this.categoryModel({
      name: dto.name,
      slug,
      description: dto.description || null,
      image: dto.image || null,
      parentCategory: dto.parentCategory || null,
      sortOrder: dto.sortOrder || 0,
      isActive: true,
    });

    return category.save();
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search, sortBy = 'sortOrder', sortOrder = 'asc' } = query;
    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const sortObj: Record<string, any> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      this.categoryModel
        .find(filter)
        .populate('parentCategory', 'name slug')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.categoryModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findAllActive() {
    return this.categoryModel
      .find({ isActive: true })
      .populate('parentCategory', 'name slug')
      .sort({ sortOrder: 1, name: 1 })
      .lean()
      .exec();
  }

  async findOne(id: string): Promise<CategoryDocument> {
    const category = await this.categoryModel
      .findById(id)
      .populate('parentCategory', 'name slug')
      .exec();
    if (!category) {
      throw new NotFoundException(`Category with ID '${id}' not found`);
    }
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryDocument> {
    const category = await this.findOne(id);

    if (dto.name && dto.name !== category.name) {
      const slug = generateSlug(dto.name);
      const existing = await this.categoryModel.findOne({ slug, _id: { $ne: id } }).exec();
      if (existing) {
        throw new BadRequestException(
          `Category name '${dto.name}' conflicts with an existing category`,
        );
      }
      category.name = dto.name;
      category.slug = slug;
    }

    if (dto.description !== undefined) category.description = dto.description;
    if (dto.image !== undefined) category.image = dto.image;
    if (dto.parentCategory !== undefined)
      category.parentCategory = (dto.parentCategory || null) as any;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;

    return category.save();
  }

  async archive(id: string): Promise<CategoryDocument> {
    const category = await this.findOne(id);
    category.isActive = false;
    return category.save();
  }

  async restore(id: string): Promise<CategoryDocument> {
    const category = await this.findOne(id);
    category.isActive = true;
    return category.save();
  }
}
