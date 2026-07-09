import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AiPricingService } from './ai-pricing.service';
import { PredictPricingDto } from './dto/predict-pricing.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('ai-pricing')
@Controller('ai')
export class AiPricingController {
  constructor(private readonly aiPricingService: AiPricingService) {}

  @Post('pricing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Predict freight pricing using Groq Llama 3.3 model',
  })
  @ApiResponse({
    status: 200,
    description: 'Pricing prediction successfully generated',
  })
  async predict(@Body() dto: PredictPricingDto) {
    return this.aiPricingService.predictPricing(dto);
  }
}
