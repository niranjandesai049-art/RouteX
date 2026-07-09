import { Module } from '@nestjs/common';
import { AiPricingService } from './ai-pricing.service';
import { AiPricingController } from './ai-pricing.controller';

@Module({
  controllers: [AiPricingController],
  providers: [AiPricingService],
  exports: [AiPricingService],
})
export class AiPricingModule {}
