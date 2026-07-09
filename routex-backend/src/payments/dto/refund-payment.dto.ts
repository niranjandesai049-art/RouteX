import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefundPaymentDto {
  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  @IsNotEmpty()
  paymentId: string;

  @ApiProperty({
    example: 'Customer request for booking cancellation.',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
