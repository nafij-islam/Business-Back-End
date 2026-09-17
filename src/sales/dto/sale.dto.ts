import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod, SaleStatus } from '../../common/enums';
import { PaginationQueryDto } from '../../common/utils/pagination.util';

export class SaleItemDto {
  @ApiProperty({ example: '65f1234567890abcdef12348' })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 99.99, minimum: 0 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional({ example: 'INV-202609-001' })
  @IsOptional()
  @IsString()
  saleNumber?: string;

  @ApiPropertyOptional({ example: '65f1234567890abcdef1234c' })
  @IsOptional()
  @IsString()
  customer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  saleDate?: Date;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;

  @ApiPropertyOptional({ example: 199.98, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: SaleStatus, default: SaleStatus.COMPLETED })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SaleReturnItemDto {
  @ApiProperty({ example: '65f1234567890abcdef12348' })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class SaleReturnDto {
  @ApiProperty({ type: [SaleReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleReturnItemDto)
  items: SaleReturnItemDto[];

  @ApiProperty({ example: 'Customer decided on a different model' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class QuerySaleDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customer?: string;

  @ApiPropertyOptional({ enum: SaleStatus })
  @IsOptional()
  @IsEnum(SaleStatus)
  status?: SaleStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
