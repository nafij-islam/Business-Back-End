import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PaymentMethod, PaymentType } from '../../common/enums';
import { PaginationQueryDto } from '../../common/utils/pagination.util';

export class RecordPaymentDto {
  @ApiProperty({ example: 500, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  @IsNotEmpty()
  method: PaymentMethod;

  @ApiProperty({ enum: PaymentType, example: PaymentType.CUSTOMER_RECEIPT })
  @IsEnum(PaymentType)
  @IsNotEmpty()
  type: PaymentType;

  @ApiPropertyOptional({ example: 'TXN-984210' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({ example: '65f1234567890abcdef1234a' })
  @IsOptional()
  @IsString()
  sale?: string;

  @ApiPropertyOptional({ example: '65f1234567890abcdef1234b' })
  @IsOptional()
  @IsString()
  purchase?: string;

  @ApiPropertyOptional({ example: '65f1234567890abcdef1234c' })
  @IsOptional()
  @IsString()
  customer?: string;

  @ApiPropertyOptional({ example: '65f1234567890abcdef1234d' })
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  transactionDate?: Date;

  @ApiPropertyOptional({ example: 'Partial installment payment received' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class QueryPaymentDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PaymentType })
  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
