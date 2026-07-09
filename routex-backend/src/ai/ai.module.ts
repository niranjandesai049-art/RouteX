import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { PricingService } from './pricing.service';
import { AiController } from './ai.controller';

@Module({
  controllers: [AiController],
  providers: [AiService, PricingService],
  exports: [AiService, PricingService],
})
export class AiModule {}
