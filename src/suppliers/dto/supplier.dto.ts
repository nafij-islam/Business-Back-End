import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Global Tech Components Ltd.' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Global Tech Inc.' })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ example: '+1 (555) 349-2910' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({ example: 'sales@globaltechcomponents.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '742 Evergreen Terrace, Springfield' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Michael Chang' })
  @IsOptional()
  @IsString()
  contactPerson?: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  openingBalance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateSupplierDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  companyName?: string;

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
  contactPerson?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
