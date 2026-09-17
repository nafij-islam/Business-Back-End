import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { StockOutReason, StockTransactionType } from '../../common/enums';
import { PaginationQueryDto } from '../../common/utils/pagination.util';

export class StockInDto {
  @ApiProperty({ example: '65f1234567890abcdef12348' })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ example: 50, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 62.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  unitCost?: number;

  @ApiPropertyOptional({ example: '65f1234567890abcdef12349' })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional({ example: 'BATCH-2026-09' })
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  transactionDate?: Date;

  @ApiPropertyOptional({ example: 'Restock shipment received' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class StockOutDto {
  @ApiProperty({ example: '65f1234567890abcdef12348' })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ example: 3, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ enum: StockOutReason, example: StockOutReason.DAMAGE })
  @IsEnum(StockOutReason)
  @IsNotEmpty()
  reason: StockOutReason;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  transactionDate?: Date;

  @ApiPropertyOptional({ example: 'Damaged during unloading at shelf' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class StockAdjustmentDto {
  @ApiProperty({ example: '65f1234567890abcdef12348' })
  @IsString()
  @IsNotEmpty()
  product: string;

  @ApiProperty({ example: 45, minimum: 0 })
  @IsNumber()
  @Min(0)
  newStock: number;

  @ApiProperty({ example: 'Physical stock count discrepancy reconciliation' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class QueryStockTransactionsDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  product?: string;

  @ApiPropertyOptional({ enum: StockTransactionType })
  @IsOptional()
  @IsEnum(StockTransactionType)
  type?: StockTransactionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
