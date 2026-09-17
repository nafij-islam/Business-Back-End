import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BusinessSettingsService } from './business-settings.service';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';
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
  @ApiOperation({ summary: 'Update business settings' })
  async updateSettings(@Body() dto: UpdateBusinessSettingsDto, @CurrentUser('id') userId: string) {
    return this.settingsService.updateSettings(dto, userId);
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
