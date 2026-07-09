import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { PaymentsService, RazorpayOrderResult } from './payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @ApiOperation({
    summary: 'Create a Razorpay payment order and log transaction',
  })
  @ApiResponse({
    status: 201,
    description: 'Razorpay order created successfully.',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', example: 'order_EKmeus2Cebm1u4' },
        amount: { type: 'number', example: 500000 },
        currency: { type: 'string', example: 'INR' },
        receipt: { type: 'string', example: 'receipt_1582626314' },
        status: { type: 'string', example: 'created' },
        paymentRecordId: {
          type: 'string',
          example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        },
      },
    },
  })
  async createPaymentOrder(
    @Body() dto: CreateOrderDto,
  ): Promise<RazorpayOrderResult> {
    return this.paymentsService.createOrder(dto);
  }

  @Post('verify')
  @ApiOperation({
    summary: 'Verify Razorpay payment signature and capture state',
  })
  @ApiResponse({
    status: 200,
    description: 'Signature verification results returned.',
    schema: {
      type: 'object',
      properties: {
        verified: { type: 'boolean', example: true },
        status: { type: 'string', example: 'completed' },
      },
    },
  })
  async verifyPaymentSignature(
    @Body() dto: VerifyPaymentDto,
  ): Promise<{ verified: boolean; status: string }> {
    return this.paymentsService.verifyPayment(dto);
  }

  @Post('refund')
  @ApiOperation({
    summary:
      'Process a Razorpay payment refund, cancel booking, and debit wallet top-up',
  })
  @ApiResponse({
    status: 200,
    description: 'Refund processed successfully.',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'refunded' },
        refundId: { type: 'string', example: 'rfnd_mock_12345' },
      },
    },
  })
  async refundPaymentTransaction(
    @Body() dto: RefundPaymentDto,
  ): Promise<{ status: string; refundId: string }> {
    return this.paymentsService.refundPayment(dto);
  }
}
