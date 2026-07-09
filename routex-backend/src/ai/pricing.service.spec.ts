import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { CreateEtaDto } from './dto/create-eta.dto';

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PricingService],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('estimatePrice', () => {
    const testDto: CreatePricingDto = {
      pickup: 'Delhi Airport',
      destination: 'Mumbai Port',
      distanceKm: 1400,
      weightTons: 10,
      truckType: 'Container',
      currentFuelPrice: 95.0,
      weather: 'Rainy',
      traffic: 'High',
    };

    it('should calculate fallback pricing when Groq is not configured', async () => {
      const result = await service.estimatePrice(testDto);
      expect(result).toBeDefined();
      expect(result.estimatedPrice).toBeGreaterThan(0);
      expect(result.confidence).toEqual(0.65);
      expect(result.reason).toContain('local rate cards');
    });

    it('should cache repeated requests and retrieve cached results', async () => {
      const firstResult = await service.estimatePrice(testDto);
      const secondResult = await service.estimatePrice(testDto);

      expect(secondResult).toEqual(firstResult);
    });

    it('should calculate different prices for different inputs', async () => {
      const baseResult = await service.estimatePrice(testDto);

      const lowDistanceDto = { ...testDto, distanceKm: 100 };
      const lowDistanceResult = await service.estimatePrice(lowDistanceDto);

      expect(lowDistanceResult.estimatedPrice).toBeLessThan(
        baseResult.estimatedPrice,
      );
    });
  });

  describe('recommendTruck', () => {
    const testRecDto: CreateRecommendationDto = {
      pickup: 'Delhi Airport',
      destination: 'Mumbai Port',
      weight: 15.0,
      loadType: 'Steel Coils',
      roadType: 'Highway',
    };

    it('should calculate fallback recommendation when Groq is not configured', async () => {
      const result = await service.recommendTruck(testRecDto);
      expect(result).toBeDefined();
      expect(result.recommendedTruck).toEqual('Container');
      expect(result.alternativeTruck).toEqual('HCV');
      expect(result.estimatedFuel).toBeGreaterThan(0);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.reason).toContain('Fallback');
    });

    it('should cache repeated recommendations', async () => {
      const firstResult = await service.recommendTruck(testRecDto);
      const secondResult = await service.recommendTruck(testRecDto);

      expect(secondResult).toEqual(firstResult);
    });

    it('should recommend different trucks based on load weight', async () => {
      const heavyResult = await service.recommendTruck(testRecDto);

      const lightDto = { ...testRecDto, weight: 0.5 };
      const lightResult = await service.recommendTruck(lightDto);

      expect(lightResult.recommendedTruck).toEqual('Tata Ace');
      expect(heavyResult.recommendedTruck).not.toEqual('Tata Ace');
    });
  });

  describe('predictEta', () => {
    const testEtaDto: CreateEtaDto = {
      distanceKm: 450,
      traffic: 'High',
      weather: 'Rainy',
      averageSpeedKmh: 50,
      departureTime: '2026-07-05T12:00:00.000Z',
    };

    it('should calculate fallback ETA values when Groq is not configured', async () => {
      const result = await service.predictEta(testEtaDto);
      expect(result).toBeDefined();
      expect(result.estimatedArrival).toBeDefined();
      expect(result.confidence).toEqual(0.7);
      expect(result.delayProbability).toBeGreaterThan(0.5);
    });

    it('should cache repeated ETA requests', async () => {
      const firstResult = await service.predictEta(testEtaDto);
      const secondResult = await service.predictEta(testEtaDto);

      expect(secondResult).toEqual(firstResult);
    });

    it('should predict higher delay probability for heavier traffic', async () => {
      const heavyResult = await service.predictEta(testEtaDto);

      const lightDto = { ...testEtaDto, traffic: 'Low' };
      const lightResult = await service.predictEta(lightDto);

      expect(lightResult.delayProbability).toBeLessThan(
        heavyResult.delayProbability,
      );
    });
  });
});
