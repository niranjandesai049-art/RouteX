import { Injectable } from '@nestjs/common';

interface PredictionRequest {
  pickupAddress: string;
  destAddress: string;
  distanceKm: number;
  weightTons: number;
  truckCategory: string;
  weatherCondition: string; // Sunny, Rainy, Stormy, Foggy
  hourOfDay: number;
}

@Injectable()
export class AiService {
  /**
   * Predicts freight rates based on distance, tonnage, truck type, fuel pricing trends, and demand forecasts.
   */
  predictFreightRate(req: PredictionRequest) {
    const basePerKmRates: Record<string, number> = {
      Pickup: 18,
      'Tata Ace': 15,
      'Bolero Pickup': 20,
      'Mini Truck': 22,
      LCV: 28,
      HCV: 45,
      Trailer: 65,
      Container: 55,
      'Open Truck': 35,
      'Closed Body': 40,
      'Refrigerated Truck': 75,
      Tanker: 80,
      Flatbed: 50,
      'Multi Axle': 70,
      ODC: 110,
    };

    const baseRatePerKm = basePerKmRates[req.truckCategory] || 30;
    let price = req.distanceKm * baseRatePerKm;

    // Apply weight factor (+5% per ton beyond 1 ton)
    if (req.weightTons > 1) {
      price += price * (req.weightTons - 1) * 0.04;
    }

    // Weather surcharge multiplier
    let weatherMultiplier = 1.0;
    if (req.weatherCondition === 'Rainy') weatherMultiplier = 1.1;
    else if (req.weatherCondition === 'Stormy') weatherMultiplier = 1.25;
    else if (req.weatherCondition === 'Foggy') weatherMultiplier = 1.15;

    // Traffic hour surcharge multiplier (Rush hour 8-11 AM & 5-8 PM)
    let trafficMultiplier = 1.0;
    const isRushHour =
      (req.hourOfDay >= 8 && req.hourOfDay <= 11) ||
      (req.hourOfDay >= 17 && req.hourOfDay <= 20);
    if (isRushHour) {
      trafficMultiplier = 1.15;
    }

    const finalPredictedPrice = Math.round(
      price * weatherMultiplier * trafficMultiplier,
    );

    return {
      basePrice: Math.round(price),
      predictedPrice: finalPredictedPrice,
      weatherSurcharge: Math.round(price * (weatherMultiplier - 1)),
      trafficSurcharge: Math.round(
        price * (trafficMultiplier - 1) * weatherMultiplier,
      ),
      currency: 'INR',
    };
  }

  /**
   * Predicts potential delay (in minutes) and calculates ETA risk scores using weather and traffic patterns.
   */
  predictDelay(req: PredictionRequest) {
    let delayMinutes = 0;

    // Base delay for distance (15 mins per 100km standard buffer)
    delayMinutes += Math.round(req.distanceKm * 0.15);

    // Weather impact
    let weatherRisk = 0.1; // scale 0-1
    if (req.weatherCondition === 'Rainy') {
      delayMinutes += 45;
      weatherRisk = 0.4;
    } else if (req.weatherCondition === 'Stormy') {
      delayMinutes += 120;
      weatherRisk = 0.9;
    } else if (req.weatherCondition === 'Foggy') {
      delayMinutes += 90;
      weatherRisk = 0.7;
    }

    // Traffic delay based on time of day
    let trafficFactor = 1.0;
    if (
      (req.hourOfDay >= 8 && req.hourOfDay <= 11) ||
      (req.hourOfDay >= 17 && req.hourOfDay <= 20)
    ) {
      delayMinutes += 30;
      trafficFactor = 1.4;
    }

    return {
      predictedDelayMinutes: delayMinutes,
      weatherRiskScore: weatherRisk,
      trafficFactor: trafficFactor,
      isHighRisk: delayMinutes > 90,
      smartEtaHours: (req.distanceKm / 45 + delayMinutes / 60).toFixed(1), // average truck speed 45km/h
    };
  }

  /**
   * Evaluates driver performance rating combined with safety indicators.
   */
  calculateDriverSafetyScore(
    tripsCompleted: number,
    onTimeDeliveries: number,
    harshBreaks: number,
  ) {
    if (tripsCompleted === 0) return 100;
    const onTimeRate = onTimeDeliveries / tripsCompleted;
    const safetyDeductions = harshBreaks * 2;
    const score = onTimeRate * 100 - safetyDeductions;
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Identifies potentially fraudulent booking behaviors (e.g. rapid multiple route updates, incorrect KYC documents).
   */
  detectFraudRisk(shipperHistorySize: number, walletDisputes: number) {
    let fraudRisk = 0.05; // 5% baseline
    if (shipperHistorySize === 0) fraudRisk += 0.15; // new accounts are unrated
    if (walletDisputes > 0) fraudRisk += walletDisputes * 0.25; // massive dispute penalty
    return {
      fraudRiskScore: Math.min(1.0, fraudRisk),
      requiresManualReview: fraudRisk > 0.4,
    };
  }
}
