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

@Injectable()
export class AiPricingService {
  private readonly logger = new Logger(AiPricingService.name);
  private readonly groq: Groq;

  constructor() {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      this.logger.error(
        'GROQ_API_KEY is not defined in the environment variables',
      );
    }
    this.groq = new Groq({ apiKey });
  }

  async predictPricing(
    dto: PredictPricingDto,
    retries = 3,
  ): Promise<PricingResponse> {
    const prompt = `
You are an expert AI logistics pricing assistant for RouteX, a freight delivery platform.
Predict a highly accurate freight shipping price, ETA, and recommendations based on the following route parameters:

- Pickup: ${dto.pickup}
- Waypoints: ${dto.waypoints && dto.waypoints.length > 0 ? dto.waypoints.join(' -> ') : 'None'}
- Destination: ${dto.destination}
- Distance: ${dto.distanceKm} km
- Cargo Weight: ${dto.weightTons} tons
- Truck Category: ${dto.truckCategory}
- Weather: ${dto.weather}
- Fuel Price: INR ${dto.fuelPrice}/L
- Market Demand Level: ${dto.demandLevel}

Calculate a realistic price and detailed breakdown. Do not use hardcoded or random values. Compute distanceCost (based on distance & truck category), fuelCost (based on fuel price & consumption), weatherImpact, and demandMultiplier surcharge.
Format the output EXACTLY as a JSON object, containing nothing else. Do not include markdown code block syntax (like \`\`\`json).

Output JSON Schema:
{
  "estimatedPrice": number (in INR),
  "confidence": number (between 0 and 100 representing percentage),
  "recommendedTruck": string,
  "etaMinutes": number (estimated duration in minutes),
  "reason": string (a descriptive summary of why this price was estimated),
  "pricingBreakdown": {
    "distanceCost": number,
    "fuelCost": number,
    "weatherImpact": number,
    "demandMultiplier": number
  }
}
`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await Promise.race([
          this.groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
            response_format: { type: 'json_object' },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 10000),
          ),
        ]);

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error('Groq returned empty response');
        }

        const result = JSON.parse(content);

        // Ensure all required fields exist and are of correct type
        if (
          typeof result.estimatedPrice !== 'number' ||
          isNaN(result.estimatedPrice) ||
          typeof result.confidence !== 'number' ||
          typeof result.reason !== 'string' ||
          typeof result.recommendedTruck !== 'string' ||
          typeof result.etaMinutes !== 'number' ||
          !result.pricingBreakdown ||
          typeof result.pricingBreakdown.distanceCost !== 'number' ||
          typeof result.pricingBreakdown.fuelCost !== 'number' ||
          typeof result.pricingBreakdown.weatherImpact !== 'number' ||
          typeof result.pricingBreakdown.demandMultiplier !== 'number'
        ) {
          throw new Error('Groq response does not match output JSON schema');
        }

        return result as PricingResponse;
      } catch (error: any) {
        this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt === retries) {
          this.logger.error(
            `All ${retries} attempts to predict pricing failed`,
          );
          throw error;
        }
        // Wait 1 second before retrying
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error('Pricing prediction failed');
  }
}
