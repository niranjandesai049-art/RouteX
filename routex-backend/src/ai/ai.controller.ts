import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  PricingService,
  PricingResult,
  RecommendationResult,
  EtaResult,
} from './pricing.service';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { CreateEtaDto } from './dto/create-eta.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('AI Engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly pricingService: PricingService) {}

  @Post('pricing')
  @ApiOperation({
    summary:
      'Calculate dynamic pricing for freight shipment routes using Groq AI',
  })
  @ApiResponse({
    status: 201,
    description: 'Dynamic price estimation completed successfully.',
    schema: {
      type: 'object',
      properties: {
        estimatedPrice: { type: 'number', example: 45000 },
        confidence: { type: 'number', example: 0.95 },
        reason: {
          type: 'string',
          example: 'Calculated using Groq dynamic fuel pricing adjustment.',
        },
      },
    },
  })
  async calculateDynamicPricing(
    @Body() dto: CreatePricingDto,
  ): Promise<PricingResult> {
    return this.pricingService.estimatePrice(dto);
  }

  @Post('recommend-truck')
  @ApiOperation({
    summary:
      'Recommend the most suitable truck for freight cargo load and road requirements using Groq AI',
  })
  @ApiResponse({
    status: 201,
    description: 'Truck recommendation completed successfully.',
    schema: {
      type: 'object',
      properties: {
        recommendedTruck: { type: 'string', example: 'Container' },
        reason: {
          type: 'string',
          example: 'Recommended based on cargo weight and road category.',
        },
        alternativeTruck: { type: 'string', example: 'HCV' },
        estimatedFuel: { type: 'number', example: 280 },
        estimatedCost: { type: 'number', example: 77000 },
      },
    },
  })
  async recommendTruck(
    @Body() dto: CreateRecommendationDto,
  ): Promise<RecommendationResult> {
    return this.pricingService.recommendTruck(dto);
  }

  @Post('eta')
  @ApiOperation({
    summary:
      'Predict the estimated arrival time (ETA), confidence, and delay probability of a shipment using OSRM, weather, and traffic patterns with Groq AI',
  })
  @ApiResponse({
    status: 201,
    description: 'ETA prediction completed successfully.',
    schema: {
      type: 'object',
      properties: {
        estimatedArrival: {
          type: 'string',
          example: '2026-07-05T22:30:00.000Z',
        },
        confidence: { type: 'number', example: 0.92 },
        delayProbability: { type: 'number', example: 0.15 },
      },
    },
  })
  async predictEta(@Body() dto: CreateEtaDto): Promise<EtaResult> {
    return this.pricingService.predictEta(dto);
  }
}
