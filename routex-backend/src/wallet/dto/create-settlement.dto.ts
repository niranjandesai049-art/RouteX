import { IsNotEmpty, IsNumber, IsObject, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BankDetailsDto {
  @ApiProperty({ example: '1234567890' })
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ example: 'SBIN0001234' })
  @IsNotEmpty()
  ifsc: string;

  @ApiProperty({ example: 'State Bank of India' })
  @IsNotEmpty()
  bankName: string;

  @ApiProperty({ example: 'Rahul Kumar' })
  @IsNotEmpty()
  beneficiaryName: string;
}

export class CreateSettlementDto {
  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ type: BankDetailsDto })
  @IsObject()
  @IsNotEmpty()
  bankDetails: BankDetailsDto;
}
