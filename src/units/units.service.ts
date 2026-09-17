import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Unit, UnitDocument } from './schemas/unit.schema';
import { CreateUnitDto, UpdateUnitDto } from './dto/unit.dto';
import { PaginationQueryDto, createPaginatedResponse } from '../common/utils/pagination.util';

@Injectable()
export class UnitsService {
  constructor(
    @InjectModel(Unit.name)
    private readonly unitModel: Model<UnitDocument>,
  ) {}

  async create(dto: CreateUnitDto): Promise<UnitDocument> {
    const existing = await this.unitModel.findOne({ name: dto.name.trim() }).exec();
    if (existing) {
      throw new BadRequestException(`Unit '${dto.name}' already exists`);
    }

    const unit = new this.unitModel({
      name: dto.name.trim(),
      shortName: dto.shortName.trim(),
      isActive: true,
    });

    return unit.save();
  }

  async findAll(query: PaginationQueryDto) {
    const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = query;
    const filter: Record<string, any> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
      ];
    }

    const sortObj: Record<string, any> = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [data, total] = await Promise.all([
      this.unitModel
        .find(filter)
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.unitModel.countDocuments(filter).exec(),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findAllActive() {
    return this.unitModel.find({ isActive: true }).sort({ name: 1 }).lean().exec();
  }

  async findOne(id: string): Promise<UnitDocument> {
    const unit = await this.unitModel.findById(id).exec();
    if (!unit) {
      throw new NotFoundException(`Unit with ID '${id}' not found`);
    }
    return unit;
  }

  async update(id: string, dto: UpdateUnitDto): Promise<UnitDocument> {
    const unit = await this.findOne(id);

    if (dto.name && dto.name !== unit.name) {
      const existing = await this.unitModel
        .findOne({ name: dto.name.trim(), _id: { $ne: id } })
        .exec();
      if (existing) {
        throw new BadRequestException(`Unit name '${dto.name}' already exists`);
      }
      unit.name = dto.name.trim();
    }

    if (dto.shortName) unit.shortName = dto.shortName.trim();
    if (dto.isActive !== undefined) unit.isActive = dto.isActive;

    return unit.save();
  }
}
