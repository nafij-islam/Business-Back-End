import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBrandDto {
  @ApiProperty({ example: 'Logitech' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional({ example: 'Computer peripherals and accessories' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBrandDto {
  @ApiPropertyOptional({ example: 'Logitech International' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
