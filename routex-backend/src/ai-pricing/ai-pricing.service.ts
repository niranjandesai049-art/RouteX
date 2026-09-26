import { Injectable, Logger } from '@nestjs/common';
import Groq from 'groq-sdk';
import { PredictPricingDto } from './dto/predict-pricing.dto';

export interface PricingResponse {
  estimatedPrice: number;
  confidence: number;
  recommendedTruck: string;
  etaMinutes: number;
  reason: string;
  pricingBreakdown: {
    distanceCost: number;
    fuelCost: number;
    weatherImpact: number;
    demandMultiplier: number;
  };
}

const CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'openai/gpt-oss-20b',
  'allam-2-7b',
  'llama-3.3-70b-versatile',
];

@Injectable()
export class AiPricingService {
  private readonly logger = new Logger(AiPricingService.name);
  private readonly groq: Groq | null = null;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey && !apiKey.includes('placeholder')) {
      try {
        this.groq = new Groq({ apiKey });
        this.logger.log('Groq AI SDK initialized for pricing engine.');
      } catch (err: any) {
        this.logger.error(`Failed to initialize Groq SDK: ${err.message}`);
      }
    } else {
      this.logger.warn('GROQ_API_KEY is not defined or is placeholder.');
    }
  }

  async predictPricing(dto: PredictPricingDto): Promise<PricingResponse> {
    const pickup = dto.pickup?.trim() || 'Origin';
    const destination = dto.destination?.trim() || 'Destination';
    const waypoints = Array.isArray(dto.waypoints) ? dto.waypoints.filter(Boolean) : [];
    const distanceKm = Math.max(1, Math.round(Number(dto.distanceKm) || 15));
    const weightTons = Math.max(0.1, Number(dto.weightTons) || 1);
    const truckCategory = dto.truckCategory || dto.truckType || 'Bolero Pickup (2.5T)';
    const material = dto.material || dto.loadType || 'General Cargo';
    const weather = dto.weather || 'Sunny';
    const fuelPrice = Number(dto.fuelPrice || dto.currentFuelPrice) || 94.5;
    const demandLevel = dto.demandLevel || dto.traffic || 'High';

    const prompt = `You are an expert AI logistics pricing assistant for RouteX, India's AI-Powered Digital Freight Marketplace.
Predict a highly accurate freight shipping price, ETA, and recommendations based on the following shipment parameters:

- Pickup: ${pickup}
- Destination: ${destination}
- Waypoints: ${waypoints.length > 0 ? waypoints.join(' -> ') : 'None'}
- Route Distance: ${distanceKm} km
- Cargo Weight: ${weightTons} tons
- Cargo / Material Type: ${material}
- Requested Truck Category: ${truckCategory}
- Weather Condition: ${weather}
- Fuel Price (Diesel): INR ${fuelPrice}/Liter
- Market Demand Level: ${demandLevel}

Pricing Guidelines in India:
1. Base per-km rate in India: Mini Truck/Tata Ace ~INR 15-18/km, Bolero Pickup (2.5T) ~INR 20-24/km, LCV (5T) ~INR 28-34/km, HCV (16T) ~INR 45-55/km, Container ~INR 55-65/km, Trailer (30T) ~INR 65-80/km. Minimum local freight booking charge is INR 500-800.
2. Fuel consumption: Bolero Pickup ~8-9 km/L, LCV ~5-6 km/L, HCV ~3.5-4 km/L.
3. Cargo type impact: Steel and heavy industrial loads require capacity check, handling, and potential vehicle upscaling if cargo weight (${weightTons} tons) exceeds requested vehicle capacity.
4. Calculate a realistic price and detailed breakdown in Indian Rupees (INR). NEVER return 0 or negative numbers.
Format the output EXACTLY as a JSON object, containing nothing else. Do not include markdown code block syntax.

Output JSON Schema:
{
  "estimatedPrice": number,
  "confidence": number,
  "recommendedTruck": string,
  "etaMinutes": number,
  "reason": string,
  "pricingBreakdown": {
    "distanceCost": number,
    "fuelCost": number,
    "weatherImpact": number,
    "demandMultiplier": number
  }
}`;

    if (this.groq) {
      for (const model of CANDIDATE_MODELS) {
        try {
          this.logger.log(`Attempting AI pricing estimation with Groq model: ${model}`);
          const response = await Promise.race([
            this.groq.chat.completions.create({
              model,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2,
              response_format: { type: 'json_object' },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout with model ${model}`)), 12000),
            ),
          ]);

          const content = response.choices?.[0]?.message?.content;
          if (!content) {
            throw new Error(`Empty response from Groq model ${model}`);
          }

          const parsed = JSON.parse(content.trim());

          let estimatedPrice = Math.round(Number(parsed.estimatedPrice));
          let confidence = Number(parsed.confidence);
          if (isNaN(confidence) || confidence <= 0) confidence = 92;
          else if (confidence <= 1) confidence = Math.round(confidence * 100);

          if (isNaN(estimatedPrice) || estimatedPrice <= 0) {
            throw new Error('Groq returned non-positive price');
          }

          const recommendedTruck = String(parsed.recommendedTruck || truckCategory);
          const etaMinutes = Math.max(10, Math.round(Number(parsed.etaMinutes) || Math.round((distanceKm / 40) * 60)));
          const reason = String(parsed.reason || 'AI pricing calculated using RouteX neural rate matrix.');

          const breakdown = parsed.pricingBreakdown || {};
          const pricingBreakdown = {
            distanceCost: Math.round(Number(breakdown.distanceCost) || Math.round(estimatedPrice * 0.55)),
            fuelCost: Math.round(Number(breakdown.fuelCost) || Math.round(estimatedPrice * 0.35)),
            weatherImpact: Math.round(Number(breakdown.weatherImpact) || 0),
            demandMultiplier: Number(breakdown.demandMultiplier) || 1.15,
          };

          this.logger.log(`AI Pricing successful with ${model}: INR ${estimatedPrice} (${confidence}% confidence)`);

          return {
            estimatedPrice,
            confidence,
            recommendedTruck,
            etaMinutes,
            reason,
            pricingBreakdown,
          };
        } catch (err: any) {
          this.logger.warn(`Model ${model} failed for AI pricing: ${err.message}`);
        }
      }
    }

    // Deterministic High-Fidelity Fallback if Groq API is unavailable
    this.logger.warn('All Groq models unavailable or timed out. Using deterministic pricing engine.');
    return this.calculateDeterministicPricing({
      pickup,
      destination,
      distanceKm,
      weightTons,
      truckCategory,
      material,
      weather,
      fuelPrice,
      demandLevel,
    });
  }

  private calculateDeterministicPricing(params: {
    pickup: string;
    destination: string;
    distanceKm: number;
    weightTons: number;
    truckCategory: string;
    material: string;
    weather: string;
    fuelPrice: number;
    demandLevel: string;
  }): PricingResponse {
    const baseRates: Record<string, { rate: number; kmPerLiter: number; maxTons: number; properName: string }> = {
      'Tata Ace': { rate: 16, kmPerLiter: 12, maxTons: 1.5, properName: 'Tata Ace (1.5T)' },
      'Bolero Pickup': { rate: 21, kmPerLiter: 8.5, maxTons: 2.5, properName: 'Bolero Pickup (2.5T)' },
      'LCV': { rate: 30, kmPerLiter: 6.0, maxTons: 5.0, properName: 'LCV (5T)' },
      'HCV': { rate: 48, kmPerLiter: 3.8, maxTons: 16.0, properName: 'HCV (16T)' },
      'Trailer': { rate: 68, kmPerLiter: 2.8, maxTons: 30.0, properName: 'Trailer (30T)' },
      'Container': { rate: 58, kmPerLiter: 3.2, maxTons: 20.0, properName: 'Container (20T)' },
    };

    let matchedKey = Object.keys(baseRates).find((k) =>
      params.truckCategory.toLowerCase().includes(k.toLowerCase()),
    ) || 'Bolero Pickup';

    const vehicleInfo = baseRates[matchedKey];
    let recommendedTruck = vehicleInfo.properName;

    // Check if cargo weight exceeds truck capacity
    if (params.weightTons > vehicleInfo.maxTons) {
      if (params.weightTons <= 2.5) {
        recommendedTruck = baseRates['Bolero Pickup'].properName;
      } else if (params.weightTons <= 5.0) {
        recommendedTruck = baseRates['LCV'].properName;
      } else if (params.weightTons <= 16.0) {
        recommendedTruck = baseRates['HCV'].properName;
      } else {
        recommendedTruck = baseRates['Trailer'].properName;
      }
    }

    const distanceCost = Math.round(params.distanceKm * vehicleInfo.rate);
    const litersNeeded = params.distanceKm / vehicleInfo.kmPerLiter;
    const fuelCost = Math.round(litersNeeded * params.fuelPrice);

    let weatherImpact = 0;
    const weatherLower = params.weather.toLowerCase();
    if (weatherLower.includes('rain') || weatherLower.includes('storm')) {
      weatherImpact = Math.round((distanceCost + fuelCost) * 0.08);
    }

    let demandMultiplier = 1.0;
    const demandLower = params.demandLevel.toLowerCase();
    if (demandLower.includes('high') || demandLower.includes('peak')) {
      demandMultiplier = 1.15;
    } else if (demandLower.includes('low')) {
      demandMultiplier = 0.95;
    }

    // Material weight surcharge
    let materialSurcharge = 0;
    const matLower = params.material.toLowerCase();
    if (matLower.includes('steel') || matLower.includes('metal') || matLower.includes('pipe') || matLower.includes('iron')) {
      materialSurcharge = Math.round((distanceCost + fuelCost) * 0.10);
    }

    const subtotal = distanceCost + fuelCost + weatherImpact + materialSurcharge;
    const rawPrice = Math.round(subtotal * demandMultiplier);
    // Minimum freight floor for commercial transit
    const estimatedPrice = Math.max(650, rawPrice);

    const travelHours = params.distanceKm / 40;
    const etaMinutes = Math.max(20, Math.round(travelHours * 60 + 15));

    let reason = `AI estimated for ${params.distanceKm} km from ${params.pickup} to ${params.destination}. Calculated with base transit cost of INR ${distanceCost} and fuel estimation of INR ${fuelCost} (${vehicleInfo.kmPerLiter} km/L at INR ${params.fuelPrice}/L).`;
    if (params.weightTons > vehicleInfo.maxTons) {
      reason += ` Note: ${params.weightTons}T ${params.material} exceeds standard capacity of ${params.truckCategory}; recommended upgrading to ${recommendedTruck}.`;
    } else if (materialSurcharge > 0) {
      reason += ` Includes heavy-duty handling surcharge for ${params.material}.`;
    }

    return {
      estimatedPrice,
      confidence: 90,
      recommendedTruck,
      etaMinutes,
      reason,
      pricingBreakdown: {
        distanceCost,
        fuelCost,
        weatherImpact,
        demandMultiplier,
      },
    };
  }
}
