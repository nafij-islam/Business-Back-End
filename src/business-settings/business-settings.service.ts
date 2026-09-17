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
      settings.information = { ...settings.information, ...dto.information };
    }
    if (dto.localization) {
      settings.localization = { ...settings.localization, ...dto.localization };
    }
    if (dto.branding) {
      settings.branding = { ...settings.branding, ...dto.branding };
    }
    if (dto.inventory) {
      settings.inventory = { ...settings.inventory, ...dto.inventory };
    }
    if (dto.modules) {
      settings.modules = { ...settings.modules, ...dto.modules };
    }
    if (dto.invoice) {
      settings.invoice = { ...settings.invoice, ...dto.invoice };
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
