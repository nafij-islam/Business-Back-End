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
import { PaymentMethod, PurchaseStatus } from '../../common/enums';
import { PaginationQueryDto } from '../../common/utils/pagination.util';

export class PurchaseItemDto {
  @ApiProperty({ example: '65f1234567890abcdef12348' })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ example: 50, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 60.0, minimum: 0 })
  @IsNumber()
  @Min(0)
  unitCost: number;
}

export class CreatePurchaseDto {
  @ApiPropertyOptional({ example: 'PUR-202609-001' })
  @IsOptional()
  @IsString()
  purchaseNumber?: string;

  @ApiProperty({ example: '65f1234567890abcdef12349' })
  @IsString()
  @IsNotEmpty()
  supplier: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  purchaseDate?: Date;

  @ApiProperty({ type: [PurchaseItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items: PurchaseItemDto[];

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

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @ApiPropertyOptional({ example: 3000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ enum: PurchaseStatus, default: PurchaseStatus.COMPLETED })
  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class PurchaseReturnItemDto {
  @ApiProperty({ example: '65f1234567890abcdef12348' })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ example: 5, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class PurchaseReturnDto {
  @ApiProperty({ type: [PurchaseReturnItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseReturnItemDto)
  items: PurchaseReturnItemDto[];

  @ApiProperty({ example: 'Defective batch returned to supplier' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class QueryPurchaseDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({ enum: PurchaseStatus })
  @IsOptional()
  @IsEnum(PurchaseStatus)
  status?: PurchaseStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
