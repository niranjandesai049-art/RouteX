import { Injectable, Logger } from '@nestjs/common';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { CreateEtaDto } from './dto/create-eta.dto';
import { Groq } from 'groq-sdk';

export interface PricingResult {
  estimatedPrice: number;
  confidence: number;
  reason: string;
}

export interface RecommendationResult {
  recommendedTruck: string;
  reason: string;
  alternativeTruck: string;
  estimatedFuel: number;
  estimatedCost: number;
}

export interface EtaResult {
  estimatedArrival: string;
  confidence: number;
  delayProbability: number;
}

interface CacheEntry {
  data: PricingResult;
  expiry: number;
}

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly recCache = new Map<
    string,
    { data: RecommendationResult; expiry: number }
  >();
  private readonly etaCache = new Map<
    string,
    { data: EtaResult; expiry: number }
  >();
  private readonly cacheTtlMs = 10 * 60 * 1000; // 10 minutes cache TTL
  private groq: Groq | null = null;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (
      apiKey &&
      apiKey !== 'gsk_production_placeholder_key' &&
      apiKey !== 'gsk_development_placeholder_key'
    ) {
      try {
        this.groq = new Groq({ apiKey });
        this.logger.log('Groq SDK initialized successfully.');
      } catch (err: any) {
        this.logger.error('Failed to initialize Groq SDK:', err.message);
      }
    } else {
      this.logger.warn(
        'GROQ_API_KEY is not defined or is placeholder. Operating in fallback mode.',
      );
    }
  }

  /**
   * Estimates dynamic freight rate. Uses cached values if present; queries Groq LLM;
   * falls back to deterministic local rule engine on failure.
   */
  async estimatePrice(dto: CreatePricingDto): Promise<PricingResult> {
    const cacheKey = this.generateCacheKey(dto);
    const cached = this.cache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      this.logger.log(
        `Cache hit for route: ${dto.pickup} -> ${dto.destination}`,
      );
      return cached.data;
    }

    let result: PricingResult;

    if (this.groq) {
      try {
        result = await this.queryGroqModel(dto);
        this.logger.log(
          `Successfully retrieved price from Groq: ${result.estimatedPrice} INR`,
        );
      } catch (err: any) {
        this.logger.error(
          `Groq API pricing query failed: ${err.message}. Invoking backup model.`,
        );
        result = this.calculateLocalFallback(dto);
      }
    } else {
      result = this.calculateLocalFallback(dto);
    }

    // Cache the resolved rate estimate
    this.cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + this.cacheTtlMs,
    });

    return result;
  }

  /**
   * Queries Groq llama-3.3-70b-versatile model to estimate dynamic pricing.
   */
  private async queryGroqModel(dto: CreatePricingDto): Promise<PricingResult> {
    if (!this.groq) throw new Error('Groq SDK is not initialized.');

    const prompt = `You are a freight dynamic pricing agent for RouteX, India's AI-Powered Digital Freight Marketplace.
Given the following freight details, estimate the dynamic freight rate in Indian Rupees (INR):
- Pickup: ${dto.pickup}
- Destination: ${dto.destination}
- Distance: ${dto.distanceKm} km
- Load Weight: ${dto.weightTons} Tons
- Truck Type: ${dto.truckType}
- Current Fuel Price: INR ${dto.currentFuelPrice}/Liter
- Weather Condition: ${dto.weather || 'Normal'}
- Traffic Level: ${dto.traffic || 'Medium'}

Calculate the dynamic rate based on fuel cost (mileage based on truck type), toll estimations for the distance, weight cargo factors, weather delay surcharges, and current traffic.

You MUST return a JSON object ONLY. No markdown syntax, no formatting, no wrapping in code blocks. Just return valid raw JSON matching this structure:
{
  "estimatedPrice": number,
  "confidence": number,
  "reason": "string explaining calculations"
}`;

    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Received empty response from Groq completions API.');
    }

    const parsed: PricingResult = JSON.parse(content.trim());
    if (
      typeof parsed.estimatedPrice !== 'number' ||
      typeof parsed.confidence !== 'number' ||
      typeof parsed.reason !== 'string'
    ) {
      throw new Error(
        'Groq response does not match the required pricing structure.',
      );
    }

    return parsed;
  }

  /**
   * Deterministic local backup pricing rules if the LLM API is unavailable.
   */
  private calculateLocalFallback(dto: CreatePricingDto): PricingResult {
    const baseRates: Record<string, number> = {
      Pickup: 18,
      'Tata Ace': 15,
      'Bolero Pickup': 20,
      'Mini Truck': 22,
      LCV: 28,
      HCV: 45,
      Trailer: 65,
      Container: 55,
      'Open Truck': 35,
    };

    const ratePerKm = baseRates[dto.truckType] || 30;
    let price = dto.distanceKm * ratePerKm;

    // Weight factor sycharge (+4% per ton beyond 1 ton)
    if (dto.weightTons > 1) {
      price += price * (dto.weightTons - 1) * 0.04;
    }

    // Fuel cost adjustment (reference base price 90 INR/L)
    const fuelDiff = dto.currentFuelPrice - 90;
    if (fuelDiff > 0) {
      price += price * (fuelDiff * 0.005); // +0.5% per INR above base
    }

    // Weather impact surcharge
    let weatherImpact = 1.0;
    if (dto.weather === 'Rainy') weatherImpact = 1.08;
    else if (dto.weather === 'Stormy' || dto.weather === 'Heavy Rain')
      weatherImpact = 1.2;

    // Traffic impact surcharge
    let trafficImpact = 1.0;
    if (dto.traffic === 'High' || dto.traffic === 'Heavy') trafficImpact = 1.12;

    const finalPrice = Math.round(price * weatherImpact * trafficImpact);

    return {
      estimatedPrice: finalPrice,
      confidence: 0.65, // Standard fallback confidence
      reason: `Calculated using standard local rate cards (Base: INR ${ratePerKm}/km, adjusted for fuel cost: INR ${dto.currentFuelPrice}/L, weather: ${dto.weather || 'Normal'}, traffic: ${dto.traffic || 'Medium'}).`,
    };
  }

  /**
   * Generates a stable cache key based on input parameters.
   */
  private generateCacheKey(dto: CreatePricingDto): string {
    return `${dto.pickup.toLowerCase().trim()}_${dto.destination.toLowerCase().trim()}_${dto.distanceKm}_${dto.weightTons}_${dto.truckType.toLowerCase().trim()}_${dto.currentFuelPrice}_${(dto.weather || 'normal').toLowerCase()}_${(dto.traffic || 'medium').toLowerCase()}`;
  }

  /**
   * Recommends the best truck class based on load weight, road/cargo parameters,
   * estimating fuel and dynamic cost.
   */
  async recommendTruck(
    dto: CreateRecommendationDto,
  ): Promise<RecommendationResult> {
    const cacheKey = `${dto.pickup.toLowerCase().trim()}_${dto.destination.toLowerCase().trim()}_${dto.weight}_${dto.loadType.toLowerCase().trim()}_${dto.roadType.toLowerCase().trim()}`;
    const cached = this.recCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      this.logger.log(
        `Cache hit for truck recommendation: ${dto.pickup} -> ${dto.destination}`,
      );
      return cached.data;
    }

    let result: RecommendationResult;

    if (this.groq) {
      try {
        result = await this.queryGroqRecommendation(dto);
        this.logger.log(
          `Successfully retrieved recommendation from Groq: ${result.recommendedTruck}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Groq API recommendation query failed: ${err.message}. Invoking backup model.`,
        );
        result = this.calculateLocalRecommendationFallback(dto);
      }
    } else {
      result = this.calculateLocalRecommendationFallback(dto);
    }

    this.recCache.set(cacheKey, {
      data: result,
      expiry: Date.now() + this.cacheTtlMs,
    });

    return result;
  }

  /**
   * Queries Groq model for a logistics recommendation.
   */
  private async queryGroqRecommendation(
    dto: CreateRecommendationDto,
  ): Promise<RecommendationResult> {
    if (!this.groq) throw new Error('Groq SDK is not initialized.');

    const prompt = `You are a logistics dynamic truck recommendation agent for RouteX, India's AI-Powered Digital Freight Marketplace.
Given the following cargo requirements, recommend the most suitable truck type:
- Pickup: ${dto.pickup}
- Destination: ${dto.destination}
- Cargo Weight: ${dto.weight} Tons
- Load Type: ${dto.loadType}
- Road Type: ${dto.roadType}

Calculate the best vehicle recommendations, fuel requirements in liters, and estimated price in INR.

You MUST return a JSON object ONLY. No markdown formatting, no wrapping in code blocks. Just return valid raw JSON matching this structure:
{
  "recommendedTruck": "string",
  "reason": "string explaining why this truck was recommended",
  "alternativeTruck": "string",
  "estimatedFuel": number,
  "estimatedCost": number
}`;

    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Received empty response from Groq completions API.');
    }

    const parsed: RecommendationResult = JSON.parse(content.trim());
    if (
      typeof parsed.recommendedTruck !== 'string' ||
      typeof parsed.reason !== 'string' ||
      typeof parsed.alternativeTruck !== 'string' ||
      typeof parsed.estimatedFuel !== 'number' ||
      typeof parsed.estimatedCost !== 'number'
    ) {
      throw new Error(
        'Groq response does not match the required recommendation structure.',
      );
    }

    return parsed;
  }

  /**
   * Local rule-based recommendation model fallback.
   */
  private calculateLocalRecommendationFallback(
    dto: CreateRecommendationDto,
  ): RecommendationResult {
    let recommendedTruck = 'Tata Ace';
    let alternativeTruck = 'Bolero Pickup';
    let fuelPer100Km = 12;
    let costPerKm = 15;

    const w = dto.weight;
    if (w > 1 && w <= 3) {
      recommendedTruck = 'Bolero Pickup';
      alternativeTruck = 'Mini Truck';
      fuelPer100Km = 15;
      costPerKm = 20;
    } else if (w > 3 && w <= 8) {
      recommendedTruck = 'LCV';
      alternativeTruck = 'Open Truck';
      fuelPer100Km = 20;
      costPerKm = 30;
    } else if (w > 8 && w <= 16) {
      recommendedTruck = 'Container';
      alternativeTruck = 'HCV';
      fuelPer100Km = 28;
      costPerKm = 55;
    } else if (w > 16) {
      recommendedTruck = 'Trailer';
      alternativeTruck = 'Multi Axle';
      fuelPer100Km = 35;
      costPerKm = 70;
    }

    // Estimate generic distance (approx 400km if not calculable, or check Delhi-Mumbai)
    let estDistance = 400;
    const routeKey = `${dto.pickup.toLowerCase()} ${dto.destination.toLowerCase()}`;
    if (routeKey.includes('delhi') && routeKey.includes('mumbai')) {
      estDistance = 1400;
    } else if (routeKey.includes('mumbai') && routeKey.includes('pune')) {
      estDistance = 150;
    } else if (routeKey.includes('bangalore') && routeKey.includes('chennai')) {
      estDistance = 350;
    }

    const estimatedFuel = Math.round((estDistance / 100) * fuelPer100Km);
    const estimatedCost = Math.round(estDistance * costPerKm * (1 + w * 0.02)); // weight penalty

    return {
      recommendedTruck,
      reason: `Fallback Recommendation: suitable for carrying ${w} Tons of ${dto.loadType} cargo on ${dto.roadType} routes. Estimated route distance is ~${estDistance}km.`,
      alternativeTruck,
      estimatedFuel,
      estimatedCost,
    };
  }

  /**
   * Predicts ETA based on distance, traffic, weather, and average driver speed.
   */
  async predictEta(dto: CreateEtaDto): Promise<EtaResult> {
    const depTime = dto.departureTime || new Date().toISOString();
    const cacheKey = `${dto.distanceKm}_${dto.traffic.toLowerCase().trim()}_${dto.weather.toLowerCase().trim()}_${dto.averageSpeedKmh}_${depTime}`;
    const cached = this.etaCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      this.logger.log(`Cache hit for ETA prediction.`);
      return cached.data;
    }

    let result: EtaResult;

    if (this.groq) {
      try {
        result = await this.queryGroqEta(dto);
        this.logger.log(
          `Successfully retrieved ETA from Groq: ${result.estimatedArrival}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Groq API ETA query failed: ${err.message}. Invoking backup model.`,
        );
        result = this.calculateLocalEtaFallback(dto);
      }
    } else {
      result = this.calculateLocalEtaFallback(dto);
    }

    this.etaCache.set(cacheKey, {
      data: result,
      expiry: Date.now() + this.cacheTtlMs,
    });

    return result;
  }

  /**
   * Queries Groq model for ETA prediction.
   */
  private async queryGroqEta(dto: CreateEtaDto): Promise<EtaResult> {
    if (!this.groq) throw new Error('Groq SDK is not initialized.');

    const depTime = dto.departureTime || new Date().toISOString();
    const prompt = `You are a logistics dynamic ETA prediction agent for RouteX, India's AI-Powered Digital Freight Marketplace.
Given the following shipment parameters, calculate the estimated arrival time, confidence, and delay probability:
- Route Distance: ${dto.distanceKm} km
- Traffic Conditions: ${dto.traffic}
- Weather Conditions: ${dto.weather}
- Average Driver Speed: ${dto.averageSpeedKmh} km/h
- Departure Time: ${depTime}

Calculate total travel time in decimal hours including speed limits, traffic congestion slowdown multipliers, and weather visibility safety delays. Adding those delays to the departure time, predict the estimated arrival date/time.

You MUST return a JSON object ONLY. No markdown formatting, no wrapping in code blocks. Just return valid raw JSON matching this structure:
{
  "estimatedArrival": "string (ISO-8601 format)",
  "confidence": number,
  "delayProbability": number
}`;

    const response = await this.groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Received empty response from Groq completions API.');
    }

    const parsed: EtaResult = JSON.parse(content.trim());
    if (
      typeof parsed.estimatedArrival !== 'string' ||
      typeof parsed.confidence !== 'number' ||
      typeof parsed.delayProbability !== 'number'
    ) {
      throw new Error(
        'Groq response does not match the required ETA structure.',
      );
    }

    return parsed;
  }

  /**
   * Deterministic local backup rules for ETA calculations.
   */
  private calculateLocalEtaFallback(dto: CreateEtaDto): EtaResult {
    const baseHours = dto.distanceKm / dto.averageSpeedKmh;
    let delayFactor = 0.0;
    let delayProbability = 0.1;

    // Traffic adjustment
    const trafficUpper = dto.traffic.toLowerCase();
    if (trafficUpper === 'high' || trafficUpper === 'heavy') {
      delayFactor += 0.25; // +25% delay
      delayProbability += 0.5;
    } else if (trafficUpper === 'medium' || trafficUpper === 'moderate') {
      delayFactor += 0.1; // +10% delay
      delayProbability += 0.25;
    }

    // Weather adjustment
    const weatherUpper = dto.weather.toLowerCase();
    if (weatherUpper === 'rainy') {
      delayFactor += 0.12; // +12% delay
      delayProbability += 0.3;
    } else if (weatherUpper === 'foggy' || weatherUpper === 'stormy') {
      delayFactor += 0.3; // +30% delay
      delayProbability += 0.6;
    }

    const totalHours = baseHours * (1 + delayFactor);
    const depTime = dto.departureTime
      ? new Date(dto.departureTime)
      : new Date();

    // Add decimal hours to departure time
    const arrivalTime = new Date(
      depTime.getTime() + totalHours * 60 * 60 * 1000,
    );

    return {
      estimatedArrival: arrivalTime.toISOString(),
      confidence: 0.7,
      delayProbability: Math.min(0.99, delayProbability),
    };
  }
}
