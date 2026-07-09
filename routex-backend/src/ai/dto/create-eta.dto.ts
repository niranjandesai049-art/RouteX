import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEtaDto {
  @ApiProperty({ example: 450 })
  @IsNumber()
  @Min(0.1)
  distanceKm: number;

  @ApiProperty({ example: 'High' })
  @IsString()
  @IsNotEmpty()
  traffic: string;

  @ApiProperty({ example: 'Rainy' })
  @IsString()
  @IsNotEmpty()
  weather: string;

  @ApiProperty({ example: 55 })
  @IsNumber()
  @Min(5)
  averageSpeedKmh: number;

  @ApiProperty({ example: '2026-07-05T18:00:00.000Z', required: false })
  @IsString()
  @IsOptional()
  departureTime?: string;
}
