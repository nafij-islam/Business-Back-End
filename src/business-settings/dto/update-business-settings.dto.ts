import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class BusinessInformationDto {
  @ApiPropertyOptional({ example: 'Apex Enterprise' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: 'Apex Global Corp Ltd.' })
  @IsOptional()
  @IsString()
  legalName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  favicon?: string;

  @ApiPropertyOptional({ example: '+1 (555) 019-2834' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@apexenterprise.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({ example: 'https://apexenterprise.com' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ example: '100 Business Parkway, Suite 400' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'New York' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'United States' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class LocalizationSettingsDto {
  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currencyCode?: string;

  @ApiPropertyOptional({ example: '$' })
  @IsOptional()
  @IsString()
  currencySymbol?: string;

  @ApiPropertyOptional({ example: 'UTC' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ example: 'en-US' })
  @IsOptional()
  @IsString()
  numberFormat?: string;
}

export class BrandingSettingsDto {
  @ApiPropertyOptional({ example: '#0d9488' })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#0f766e' })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: '#0f172a' })
  @IsOptional()
  @IsString()
  sidebarColor?: string;

  @ApiPropertyOptional({ example: '#10b981' })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  loginLogo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dashboardLogo?: string;
}

export class InventorySettingsDto {
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  defaultLowStockThreshold?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  allowNegativeStock?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  enableExpiryTracking?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  enableBatchTracking?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enableBrands?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enableCustomAttributes?: boolean;
}

export class ModuleSettingsDto {
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enableSales?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enablePurchases?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enableSuppliers?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enableCustomers?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enableExpenses?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enableProfitReports?: boolean;
}

export class InvoiceSettingsDto {
  @ApiPropertyOptional({ example: 'INV-' })
  @IsOptional()
  @IsString()
  invoicePrefix?: string;

  @ApiPropertyOptional({ example: 'PUR-' })
  @IsOptional()
  @IsString()
  purchasePrefix?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessTaxId?: string;

  @ApiPropertyOptional({ example: 'Thank you for your business!' })
  @IsOptional()
  @IsString()
  invoiceFooter?: string;

  @ApiPropertyOptional({
    example: 'Goods once sold are non-refundable unless defective within 7 days.',
  })
  @IsOptional()
  @IsString()
  invoiceTerms?: string;
}

export class UpdateBusinessSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessInformationDto)
  information?: BusinessInformationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizationSettingsDto)
  localization?: LocalizationSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BrandingSettingsDto)
  branding?: BrandingSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => InventorySettingsDto)
  inventory?: InventorySettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => ModuleSettingsDto)
  modules?: ModuleSettingsDto;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => InvoiceSettingsDto)
  invoice?: InvoiceSettingsDto;
}
