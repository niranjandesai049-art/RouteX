import { IsNotEmpty, IsString, IsNumber, Min, IsOptional, IsArray } from 'class-validator';

export class PredictPricingDto {
  @IsNotEmpty()
  @IsString()
  pickup: string;

  @IsNotEmpty()
  @IsString()
  destination: string;

  @IsOptional()
  @IsArray()
  waypoints?: string[];

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  weightTons: number;

  @IsOptional()
  @IsString()
  truckCategory?: string;

  @IsOptional()
  @IsString()
  truckType?: string;

  @IsOptional()
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  loadType?: string;

  @IsOptional()
  @IsString()
  weather?: string;

  @IsOptional()
  @IsNumber()
  fuelPrice?: number;

  @IsOptional()
  @IsNumber()
  currentFuelPrice?: number;

  @IsOptional()
  @IsString()
  demandLevel?: string;

  @IsOptional()
  @IsString()
  traffic?: string;
}
