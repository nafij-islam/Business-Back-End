import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums';
import { PaginationQueryDto } from '../../common/utils/pagination.util';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Rent' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Office, warehouse or showroom rent' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateExpenseCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateExpenseDto {
  @ApiProperty({ example: '65f1234567890abcdef12350' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 1200.0, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expenseDate?: Date;

  @ApiPropertyOptional({ enum: PaymentMethod, default: PaymentMethod.CASH })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional({ example: 'INV-OCT-RENT' })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  attachment?: string;

  @ApiPropertyOptional({ example: 'Monthly warehouse facility rent payment' })
  @IsOptional()
  @IsString()
  note?: string;
}

export class QueryExpenseDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;
}
