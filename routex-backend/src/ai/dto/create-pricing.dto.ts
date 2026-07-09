import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePricingDto {
  @ApiProperty({ example: 'Delhi International Airport' })
  @IsString()
  @IsNotEmpty()
  pickup: string;

  @ApiProperty({ example: 'Mumbai Freight Hub' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ example: 1400 })
  @IsNumber()
  @Min(0.1)
  distanceKm: number;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @Min(0.01)
  weightTons: number;

  @ApiProperty({ example: 'Container' })
  @IsString()
  @IsNotEmpty()
  truckType: string;

  @ApiProperty({ example: 94.2 })
  @IsNumber()
  @Min(1)
  currentFuelPrice: number;

  @ApiProperty({ example: 'Rainy', required: false })
  @IsString()
  @IsOptional()
  weather?: string;

  @ApiProperty({ example: 'High', required: false })
  @IsString()
  @IsOptional()
  traffic?: string;
}
