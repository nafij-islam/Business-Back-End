import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type BusinessSettingsDocument = HydratedDocument<BusinessSettings>;

@Schema({ _id: false })
export class BusinessInformation {
  @Prop({ default: 'Apex Enterprise' })
  businessName: string;

  @Prop({ default: null })
  legalName?: string;

  @Prop({ default: null })
  logo?: string;

  @Prop({ default: null })
  favicon?: string;

  @Prop({ default: '+1 (555) 019-2834' })
  phone: string;

  @Prop({ default: 'contact@apexenterprise.com' })
  email: string;

  @Prop({ default: 'https://apexenterprise.com' })
  website?: string;

  @Prop({ default: '100 Business Parkway, Suite 400' })
  address: string;

  @Prop({ default: 'New York' })
  city: string;

  @Prop({ default: 'United States' })
  country: string;
}

@Schema({ _id: false })
export class LocalizationSettings {
  @Prop({ default: 'USD' })
  currencyCode: string;

  @Prop({ default: '$' })
  currencySymbol: string;

  @Prop({ default: 'UTC' })
  timezone: string;

  @Prop({ default: 'YYYY-MM-DD' })
  dateFormat: string;

  @Prop({ default: 'en-US' })
  numberFormat: string;
}

@Schema({ _id: false })
export class BrandingSettings {
  @Prop({ default: '#0d9488' }) // Primary teal/green
  primaryColor: string;

  @Prop({ default: '#0f766e' })
  secondaryColor: string;

  @Prop({ default: '#0f172a' }) // Dark navy sidebar
  sidebarColor: string;

  @Prop({ default: '#10b981' }) // Emerald accent
  accentColor: string;

  @Prop({ default: null })
  loginLogo?: string;

  @Prop({ default: null })
  dashboardLogo?: string;
}

@Schema({ _id: false })
export class InventorySettings {
  @Prop({ default: 5 })
  defaultLowStockThreshold: number;

  @Prop({ default: false })
  allowNegativeStock: boolean;

  @Prop({ default: false })
  enableExpiryTracking: boolean;

  @Prop({ default: false })
  enableBatchTracking: boolean;

  @Prop({ default: true })
  enableBrands: boolean;

  @Prop({ default: true })
  enableCustomAttributes: boolean;
}

@Schema({ _id: false })
export class ModuleSettings {
  @Prop({ default: true })
  enableSales: boolean;

  @Prop({ default: true })
  enablePurchases: boolean;

  @Prop({ default: true })
  enableSuppliers: boolean;

  @Prop({ default: true })
  enableCustomers: boolean;

  @Prop({ default: true })
  enableExpenses: boolean;

  @Prop({ default: true })
  enableProfitReports: boolean;
}

@Schema({ _id: false })
export class InvoiceSettings {
  @Prop({ default: 'INV-' })
  invoicePrefix: string;

  @Prop({ default: 'PUR-' })
  purchasePrefix: string;

  @Prop({ default: null })
  businessTaxId?: string;

  @Prop({ default: 'Thank you for your business!' })
  invoiceFooter: string;

  @Prop({ default: 'Goods once sold are non-refundable unless defective within 7 days.' })
  invoiceTerms: string;
}

@Schema({ timestamps: true })
export class BusinessSettings {
  @Prop({ required: true, default: 'business_settings_singleton', unique: true, index: true })
  singletonKey: string;

  @Prop({ type: BusinessInformation, default: () => ({}) })
  information: BusinessInformation;

  @Prop({ type: LocalizationSettings, default: () => ({}) })
  localization: LocalizationSettings;

  @Prop({ type: BrandingSettings, default: () => ({}) })
  branding: BrandingSettings;

  @Prop({ type: InventorySettings, default: () => ({}) })
  inventory: InventorySettings;

  @Prop({ type: ModuleSettings, default: () => ({}) })
  modules: ModuleSettings;

  @Prop({ type: InvoiceSettings, default: () => ({}) })
  invoice: InvoiceSettings;
}

export const BusinessSettingsSchema = SchemaFactory.createForClass(BusinessSettings);
