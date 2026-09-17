import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUnitDto {
  @ApiProperty({ example: 'Piece' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'pc' })
  @IsString()
  @IsNotEmpty()
  shortName: string;
}

export class UpdateUnitDto {
  @ApiPropertyOptional({ example: 'Pieces' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'pcs' })
  @IsOptional()
  @IsString()
  shortName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
