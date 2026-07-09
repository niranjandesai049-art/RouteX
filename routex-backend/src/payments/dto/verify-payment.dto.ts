import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'order_EKmeus2Cebm1u4' })
  @IsString()
  @IsNotEmpty()
  razorpayOrderId: string;

  @ApiProperty({ example: 'pay_EKmfaZ5V5aL48D' })
  @IsString()
  @IsNotEmpty()
  razorpayPaymentId: string;

  @ApiProperty({
    example: 'e7134375a02e604f4c9c22883d6a36d26732f91dbf08ef8c8a14b301cd20e0e0',
  })
  @IsString()
  @IsNotEmpty()
  razorpaySignature: string;

  @ApiProperty({ example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  @IsNotEmpty()
  paymentId: string;
}
