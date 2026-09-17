import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/utils/pagination.util';

export class CreateProductDto {
  @ApiProperty({ example: 'Logitech MX Master 3S' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'LOG-MX-3S-BLK' })
  @IsString()
  @IsNotEmpty()
  SKU: string;

  @ApiPropertyOptional({ example: '097855175922' })
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiProperty({ example: '65f1234567890abcdef12345' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: '65f1234567890abcdef12346' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ example: '65f1234567890abcdef12347' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiPropertyOptional({ example: 'High performance ergonomic wireless mouse' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ example: 65.0 })
  @IsNumber()
  @Min(0)
  purchasePrice: number;

  @ApiProperty({ example: 99.99 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiPropertyOptional({ example: 85.0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  @ApiPropertyOptional({ example: 20, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  openingStock?: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiPropertyOptional({
    example: { Connectivity: 'Bluetooth/USB', DPI: '8000', Color: 'Graphite' },
  })
  @IsOptional()
  @IsObject()
  customAttributes?: Record<string, any>;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Logitech MX Master 3S Wireless' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'LOG-MX-3S-BLK-V2' })
  @IsOptional()
  @IsString()
  SKU?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  barcode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  purchasePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  sellingPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  wholesalePrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackStock?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customAttributes?: Record<string, any>;
}

export class QueryProductDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ enum: ['all', 'inStock', 'lowStock', 'outOfStock'] })
  @IsOptional()
  @IsString()
  stockStatus?: 'all' | 'inStock' | 'lowStock' | 'outOfStock';

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Boolean)
  isArchived?: boolean;
}
