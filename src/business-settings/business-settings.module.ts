import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BusinessSettings, BusinessSettingsSchema } from './schemas/business-settings.schema';
import { BusinessSettingsService } from './business-settings.service';
import { BusinessSettingsController } from './business-settings.controller';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([{ name: BusinessSettings.name, schema: BusinessSettingsSchema }]),
  ],
  controllers: [BusinessSettingsController],
  providers: [BusinessSettingsService],
  exports: [BusinessSettingsService, MongooseModule],
})
export class BusinessSettingsModule {}
