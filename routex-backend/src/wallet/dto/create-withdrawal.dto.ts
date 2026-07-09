import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWithdrawalDto {
  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'upi' })
  @IsString()
  @IsNotEmpty()
  payoutMethod: string;

  @ApiProperty({ example: { upiId: 'rahul@okaxis' }, required: false })
  @IsOptional()
  payoutDetails?: any;
}
