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

const CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'allam-2-7b',
  'llama-3.3-70b-versatile',
];

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
        this.logger.log('Groq SDK initialized successfully in PricingService.');
      } catch (err: any) {
        this.logger.error('Failed to initialize Groq SDK:', err.message);
      }
    } else {
      this.logger.warn(
        'GROQ_API_KEY is not defined or is placeholder. Operating in fallback mode.',
      );
    }
  }

  private async callGroqModels(prompt: string, jsonMode = true): Promise<string> {
    if (!this.groq) throw new Error('Groq SDK not initialized.');

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await this.groq.chat.completions.create({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        });

        const content = response.choices?.[0]?.message?.content;
        if (content) return content;
      } catch (err: any) {
        this.logger.warn(`Model ${model} failed in PricingService: ${err.message}`);
      }
    }
    throw new Error('All Groq candidate models failed in PricingService.');
  }

  /**
   * Estimates dynamic freight rate.
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

    this.cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + this.cacheTtlMs,
    });

    return result;
  }

  private async queryGroqModel(dto: CreatePricingDto): Promise<PricingResult> {
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
Format the output EXACTLY as a JSON object, containing nothing else:
{
  "estimatedPrice": number,
  "confidence": number,
  "reason": "string explaining calculations"
}`;

    const content = await this.callGroqModels(prompt, true);
    const parsed: PricingResult = JSON.parse(content.trim());

    let conf = Number(parsed.confidence);
    if (isNaN(conf) || conf <= 0) conf = 92;
    else if (conf <= 1) conf = Math.round(conf * 100);

    return {
      estimatedPrice: Math.round(Number(parsed.estimatedPrice)),
      confidence: conf,
      reason: String(parsed.reason),
    };
  }

  private calculateLocalFallback(dto: CreatePricingDto): PricingResult {
    const baseRates: Record<string, number> = {
      Pickup: 18,
      'Tata Ace': 16,
      'Bolero Pickup': 21,
      'Mini Truck': 22,
      LCV: 30,
      HCV: 48,
      Trailer: 68,
      Container: 58,
      'Open Truck': 35,
    };

    const ratePerKm = baseRates[dto.truckType] || 25;
    let price = dto.distanceKm * ratePerKm;

    if (dto.weightTons > 1) {
      price += price * (dto.weightTons - 1) * 0.04;
    }

    const fuelDiff = dto.currentFuelPrice - 90;
    if (fuelDiff > 0) {
      price += price * (fuelDiff * 0.005);
    }

    let weatherImpact = 1.0;
    if (dto.weather === 'Rainy') weatherImpact = 1.08;
    else if (dto.weather === 'Stormy' || dto.weather === 'Heavy Rain')
      weatherImpact = 1.2;

    let trafficImpact = 1.0;
    if (dto.traffic === 'High' || dto.traffic === 'Heavy') trafficImpact = 1.12;

    const finalPrice = Math.max(650, Math.round(price * weatherImpact * trafficImpact));

    return {
      estimatedPrice: finalPrice,
      confidence: 90,
      reason: `Calculated using standard RouteX dynamic rate cards (Base: INR ${ratePerKm}/km, adjusted for fuel: INR ${dto.currentFuelPrice}/L, weather: ${dto.weather || 'Normal'}, traffic: ${dto.traffic || 'Medium'}).`,
    };
  }

  private generateCacheKey(dto: CreatePricingDto): string {
    return `${dto.pickup.toLowerCase().trim()}_${dto.destination.toLowerCase().trim()}_${dto.distanceKm}_${dto.weightTons}_${dto.truckType.toLowerCase().trim()}_${dto.currentFuelPrice}_${(dto.weather || 'normal').toLowerCase()}_${(dto.traffic || 'medium').toLowerCase()}`;
  }

  async recommendTruck(
    dto: CreateRecommendationDto,
  ): Promise<RecommendationResult> {
    const cacheKey = `${dto.pickup.toLowerCase().trim()}_${dto.destination.toLowerCase().trim()}_${dto.weight}_${dto.loadType.toLowerCase().trim()}_${dto.roadType.toLowerCase().trim()}`;
    const cached = this.recCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    let result: RecommendationResult;

    if (this.groq) {
      try {
        result = await this.queryGroqRecommendation(dto);
      } catch (err: any) {
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

  private async queryGroqRecommendation(
    dto: CreateRecommendationDto,
  ): Promise<RecommendationResult> {
    const prompt = `You are a logistics dynamic truck recommendation agent for RouteX, India's AI-Powered Digital Freight Marketplace.
Given the following cargo requirements, recommend the most suitable truck type:
- Pickup: ${dto.pickup}
- Destination: ${dto.destination}
- Cargo Weight: ${dto.weight} Tons
- Load Type: ${dto.loadType}
- Road Type: ${dto.roadType}

Calculate the best vehicle recommendations, fuel requirements in liters, and estimated price in INR.
Format the output EXACTLY as a JSON object:
{
  "recommendedTruck": "string",
  "reason": "string explaining why this truck was recommended",
  "alternativeTruck": "string",
  "estimatedFuel": number,
  "estimatedCost": number
}`;

    const content = await this.callGroqModels(prompt, true);
    return JSON.parse(content.trim()) as RecommendationResult;
  }

  private calculateLocalRecommendationFallback(
    dto: CreateRecommendationDto,
  ): RecommendationResult {
    let recommendedTruck = 'Tata Ace';
    let alternativeTruck = 'Bolero Pickup';
    let fuelPer100Km = 12;
    let costPerKm = 18;

    const w = dto.weight;
    if (w > 1 && w <= 3) {
      recommendedTruck = 'Bolero Pickup';
      alternativeTruck = 'Mini Truck';
      fuelPer100Km = 14;
      costPerKm = 22;
    } else if (w > 3 && w <= 8) {
      recommendedTruck = 'LCV';
      alternativeTruck = 'Open Truck';
      fuelPer100Km = 18;
      costPerKm = 32;
    } else if (w > 8 && w <= 16) {
      recommendedTruck = 'Container';
      alternativeTruck = 'HCV';
      fuelPer100Km = 26;
      costPerKm = 52;
    } else if (w > 16) {
      recommendedTruck = 'Trailer';
      alternativeTruck = 'Multi Axle';
      fuelPer100Km = 34;
      costPerKm = 70;
    }

    let estDistance = 400;
    const routeKey = `${dto.pickup.toLowerCase()} ${dto.destination.toLowerCase()}`;
    if (routeKey.includes('sangli') && routeKey.includes('miraj')) {
      estDistance = 15;
    } else if (routeKey.includes('mumbai') && routeKey.includes('pune')) {
      estDistance = 150;
    }

    const estimatedFuel = Math.round((estDistance / 100) * fuelPer100Km);
    const estimatedCost = Math.max(750, Math.round(estDistance * costPerKm * (1 + w * 0.02)));

    return {
      recommendedTruck,
      reason: `RouteX Recommendation: suitable for carrying ${w} Tons of ${dto.loadType} cargo on ${dto.roadType} routes.`,
      alternativeTruck,
      estimatedFuel,
      estimatedCost,
    };
  }

  async predictEta(dto: CreateEtaDto): Promise<EtaResult> {
    const depTime = dto.departureTime || new Date().toISOString();
    const cacheKey = `${dto.distanceKm}_${dto.traffic.toLowerCase().trim()}_${dto.weather.toLowerCase().trim()}_${dto.averageSpeedKmh}_${depTime}`;
    const cached = this.etaCache.get(cacheKey);

    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    let result: EtaResult;

    if (this.groq) {
      try {
        result = await this.queryGroqEta(dto);
      } catch (err: any) {
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

  private async queryGroqEta(dto: CreateEtaDto): Promise<EtaResult> {
    const depTime = dto.departureTime || new Date().toISOString();
    const prompt = `You are a logistics dynamic ETA prediction agent for RouteX, India's AI-Powered Digital Freight Marketplace.
Given the following shipment parameters, calculate the estimated arrival time, confidence, and delay probability:
- Route Distance: ${dto.distanceKm} km
- Traffic Conditions: ${dto.traffic}
- Weather Conditions: ${dto.weather}
- Average Driver Speed: ${dto.averageSpeedKmh} km/h
- Departure Time: ${depTime}

Format output EXACTLY as a JSON object:
{
  "estimatedArrival": "string (ISO-8601 format)",
  "confidence": number,
  "delayProbability": number
}`;

    const content = await this.callGroqModels(prompt, true);
    return JSON.parse(content.trim()) as EtaResult;
  }

  private calculateLocalEtaFallback(dto: CreateEtaDto): EtaResult {
    const baseHours = dto.distanceKm / (dto.averageSpeedKmh || 40);
    let delayFactor = 0.0;
    let delayProbability = 0.1;

    const trafficUpper = (dto.traffic || '').toLowerCase();
    if (trafficUpper === 'high' || trafficUpper === 'heavy') {
      delayFactor += 0.25;
      delayProbability += 0.5;
    } else if (trafficUpper === 'medium' || trafficUpper === 'moderate') {
      delayFactor += 0.1;
      delayProbability += 0.25;
    }

    const weatherUpper = (dto.weather || '').toLowerCase();
    if (weatherUpper === 'rainy') {
      delayFactor += 0.12;
      delayProbability += 0.3;
    } else if (weatherUpper === 'foggy' || weatherUpper === 'stormy') {
      delayFactor += 0.3;
      delayProbability += 0.6;
    }

    const totalHours = baseHours * (1 + delayFactor);
    const depTime = dto.departureTime ? new Date(dto.departureTime) : new Date();
    const arrivalTime = new Date(depTime.getTime() + totalHours * 60 * 60 * 1000);

    return {
      estimatedArrival: arrivalTime.toISOString(),
      confidence: 0.9,
      delayProbability: Math.min(0.99, delayProbability),
    };
  }

  async getFleetInsights(data: {
    totalTrucks: number;
    activeTrucks: number;
    idleTrucks: number;
    fuelSpentLiters: number;
    totalRevenue: number;
  }) {
    if (!this.groq) {
      return {
        insights: '• Optimize route distribution to decrease overall idle time.\n• Regularly inspect truck tires and tire pressure to save up to 4% on fuel.\n• Focus dispatch operations on high-value cargo routes during dry weather seasons.',
      };
    }

    try {
      const prompt = `You are a logistics fleet operations consultant for RouteX, India's AI-Powered Digital Freight Marketplace.
Given the current fleet metrics:
- Total Trucks: ${data.totalTrucks}
- Active Trucks: ${data.activeTrucks}
- Idle Trucks: ${data.idleTrucks}
- Fuel Spent: ${data.fuelSpentLiters} Liters
- Total Revenue: ₹${data.totalRevenue}

Generate a concise, high-value bulleted list of 3-4 professional recommendations to improve fleet utilization, reduce fuel expenses, and optimize driver dispatch. Be direct and concise. Avoid introductory fluff.`;

      const content = await this.callGroqModels(prompt, false);
      return {
        insights: content || 'Check vehicle alignment and tires regularly to save fuel.',
      };
    } catch (err) {
      return {
        insights: '• Optimize route distribution to decrease overall idle time.\n• Regularly inspect truck tires and tire pressure to save up to 4% on fuel.\n• Focus dispatch operations on high-value cargo routes during dry weather seasons.',
      };
    }
  }
}
