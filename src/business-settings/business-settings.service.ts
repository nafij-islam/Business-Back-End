import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { BusinessSettings, BusinessSettingsDocument } from './schemas/business-settings.schema';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
import { APP_CONSTANTS } from '../common/constants/app.constants';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { AuditAction } from '../common/enums';

@Injectable()
export class BusinessSettingsService {
  private readonly logger = new Logger(BusinessSettingsService.name);

  constructor(
    @InjectModel(BusinessSettings.name)
    private readonly settingsModel: Model<BusinessSettingsDocument>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async getSettings(): Promise<BusinessSettingsDocument> {
    let settings = await this.settingsModel
      .findOne({
        singletonKey: APP_CONSTANTS.SETTINGS_SINGLETON_ID,
      })
      .exec();

    if (!settings) {
      settings = new this.settingsModel({
        singletonKey: APP_CONSTANTS.SETTINGS_SINGLETON_ID,
      });
      await settings.save();
    }

    return settings;
  }

  async updateSettings(
    dto: UpdateBusinessSettingsDto,
    userId?: string,
  ): Promise<BusinessSettingsDocument> {
    const settings = await this.getSettings();

    if (dto.information) {
      if (!settings.information) settings.information = {} as any;
      Object.assign(settings.information, dto.information);
      settings.markModified('information');
    }
    if (dto.localization) {
      if (!settings.localization) settings.localization = {} as any;
      Object.assign(settings.localization, dto.localization);
      settings.markModified('localization');
    }
    if (dto.branding) {
      if (!settings.branding) settings.branding = {} as any;
      Object.assign(settings.branding, dto.branding);
      settings.markModified('branding');
    }
    if (dto.inventory) {
      if (!settings.inventory) settings.inventory = {} as any;
      Object.assign(settings.inventory, dto.inventory);
      settings.markModified('inventory');
    }
    if (dto.modules) {
      if (!settings.modules) settings.modules = {} as any;
      Object.assign(settings.modules, dto.modules);
      settings.markModified('modules');
    }
    if (dto.invoice) {
      if (!settings.invoice) settings.invoice = {} as any;
      Object.assign(settings.invoice, dto.invoice);
      settings.markModified('invoice');
    }

    const saved = await settings.save();

    await this.auditLogsService.log({
      userId,
      action: AuditAction.SETTINGS_UPDATED,
      entityType: 'BusinessSettings',
      entityId: saved._id.toString(),
      summary: 'Business settings updated',
      metadata: dto,
    });

    return saved;
  }

  async resetTheme(userId?: string): Promise<BusinessSettingsDocument> {
    const settings = await this.getSettings();
    settings.branding = {
      primaryColor: '#0d9488',
      secondaryColor: '#0f766e',
      sidebarColor: '#0f172a',
      accentColor: '#10b981',
      loginLogo: undefined,
      dashboardLogo: undefined,
    } as any;

    const saved = await settings.save();

    await this.auditLogsService.log({
      userId,
      action: AuditAction.SETTINGS_UPDATED,
      entityType: 'BusinessSettings',
      entityId: saved._id.toString(),
      summary: 'Branding theme reset to defaults',
    });

    return saved;
  }
}
