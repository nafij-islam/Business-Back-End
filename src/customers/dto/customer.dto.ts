import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Johnathan Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+1 (555) 782-9912' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'johndoe@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '452 Elm Street, Suite 2B' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  openingBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCustomerDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
