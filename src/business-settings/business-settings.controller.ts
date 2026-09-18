import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessSettingsService } from './business-settings.service';
import {
  UpdateBusinessSettingsDto,
  BusinessInformationDto,
  BrandingSettingsDto,
  LocalizationSettingsDto,
  InventorySettingsDto,
  InvoiceSettingsDto,
} from './dto/update-business-settings.dto';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums';

@ApiTags('Business Settings')
@Controller('settings')
export class BusinessSettingsController {
  constructor(private readonly settingsService: BusinessSettingsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get business settings (branding, localization, inventory rules)' })
  async getSettings() {
    return this.settingsService.getSettings();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @Patch()
  @ApiOperation({ summary: 'Update all business settings' })
  async updateSettings(@Body() dto: UpdateBusinessSettingsDto, @CurrentUser('id') userId: string) {
    return this.settingsService.updateSettings(dto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @Patch('general')
  @ApiOperation({ summary: 'Update business general information' })
  async updateGeneral(@Body() dto: BusinessInformationDto, @CurrentUser('id') userId: string) {
    return this.settingsService.updateSettings({ information: dto }, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @Patch('branding')
  @ApiOperation({ summary: 'Update branding colors and logo' })
  async updateBranding(@Body() dto: BrandingSettingsDto, @CurrentUser('id') userId: string) {
    return this.settingsService.updateSettings({ branding: dto }, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @Patch('localization')
  @ApiOperation({ summary: 'Update localization and currency' })
  async updateLocalization(
    @Body() dto: LocalizationSettingsDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.settingsService.updateSettings({ localization: dto }, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @Patch('inventory')
  @ApiOperation({ summary: 'Update inventory rules' })
  async updateInventory(@Body() dto: InventorySettingsDto, @CurrentUser('id') userId: string) {
    return this.settingsService.updateSettings({ inventory: dto }, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @Patch('invoice')
  @ApiOperation({ summary: 'Update invoice and billing settings' })
  async updateInvoice(@Body() dto: InvoiceSettingsDto, @CurrentUser('id') userId: string) {
    return this.settingsService.updateSettings({ invoice: dto }, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @Post('reset-theme')
  @ApiOperation({ summary: 'Reset branding colors to default' })
  async resetTheme(@CurrentUser('id') userId: string) {
    return this.settingsService.resetTheme(userId);
  }
}
