import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecommendationDto {
  @ApiProperty({ example: 'Delhi International Airport' })
  @IsString()
  @IsNotEmpty()
  pickup: string;

  @ApiProperty({ example: 'Mumbai Freight Hub' })
  @IsString()
  @IsNotEmpty()
  destination: string;

  @ApiProperty({ example: 4.5 })
  @IsNumber()
  @Min(0.01)
  weight: number;

  @ApiProperty({ example: 'Steel Coils' })
  @IsString()
  @IsNotEmpty()
  loadType: string;

  @ApiProperty({ example: 'Highway' })
  @IsString()
  @IsNotEmpty()
  roadType: string;
}
