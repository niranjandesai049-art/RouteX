import { IsNotEmpty, IsString, IsNumber, Min } from 'class-validator';

export class PredictPricingDto {
  @IsNotEmpty()
  @IsString()
  pickup: string;

  @IsNotEmpty()
  @IsString()
  destination: string;

  waypoints?: string[];

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.1)
  weightTons: number;

  @IsNotEmpty()
  @IsString()
  truckCategory: string;

  @IsNotEmpty()
  @IsString()
  weather: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  fuelPrice: number;

  @IsNotEmpty()
  @IsString()
  demandLevel: string;
}
