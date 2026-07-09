/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prisma: PrismaService;

  const mockPaymentRecord = {
    id: 'payment-uuid-12345',
    booking_id: 'booking-uuid-12345',
    wallet_id: 'wallet-uuid-12345',
    amount: new Decimal(5000),
    currency: 'INR',
    method: 'card',
    status: 'pending',
    gateway_transaction_id: 'pay_mock_test123',
    gateway_response: {},
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockWalletRecord = {
    id: 'wallet-uuid-12345',
    profile_id: 'profile-uuid-12345',
    balance: new Decimal(100),
    currency: 'INR',
    is_frozen: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPrismaService = {
    payment: {
      create: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          id: 'payment-uuid-12345',
          ...args.data,
        }),
      ),
      findUnique: jest
        .fn()
        .mockImplementation(() => Promise.resolve(mockPaymentRecord)),
      update: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          ...mockPaymentRecord,
          ...args.data,
        }),
      ),
    },
    wallets: {
      findUnique: jest
        .fn()
        .mockImplementation(() => Promise.resolve(mockWalletRecord)),
      update: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          ...mockWalletRecord,
          ...args.data,
        }),
      ),
    },
    booking: {
      update: jest.fn().mockResolvedValue({}),
    },
    $transaction: jest
      .fn()
      .mockImplementation((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should create a pending payment transaction', async () => {
      const dto: CreateOrderDto = {
        amount: 5000,
        walletId: 'wallet-uuid-12345',
      };

      const result = await service.createOrder(dto);
      expect(result).toBeDefined();
      expect(result.id).toContain('order_');
      expect(result.amount).toEqual(500000); // 5000 INR * 100 paise
      expect(result.paymentRecordId).toEqual('payment-uuid-12345');
      expect(prisma.payment.create).toHaveBeenCalled();
    });
  });

  describe('verifyPayment', () => {
    const verifyDto: VerifyPaymentDto = {
      razorpayOrderId: 'order_mock_test123',
      razorpayPaymentId: 'pay_mock_test123',
      razorpaySignature: 'mock_sig_approved',
      paymentId: 'payment-uuid-12345',
    };

    it('should verify mock signatures and credit wallet balance', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        ...mockPaymentRecord,
        status: 'pending',
      });
      mockPrismaService.wallets.findUnique.mockResolvedValueOnce({
        ...mockWalletRecord,
        is_frozen: false,
      });

      const result = await service.verifyPayment(verifyDto);
      expect(result.verified).toBe(true);
      expect(result.status).toEqual('completed');
      expect(mockPrismaService.payment.update).toHaveBeenCalled();
      expect(mockPrismaService.wallets.update).toHaveBeenCalled();
    });

    it('should fail verification if signature does not match mock approval', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        ...mockPaymentRecord,
        status: 'pending',
      });

      const badDto = { ...verifyDto, razorpaySignature: 'bad_sig' };
      const result = await service.verifyPayment(badDto);
      expect(result.verified).toBe(false);
      expect(result.status).toEqual('failed');
    });
  });

  describe('refundPayment', () => {
    const refundDto: RefundPaymentDto = {
      paymentId: 'payment-uuid-12345',
      reason: 'User Cancellation',
    };

    it('should process refund for completed payment, cancelling booking and debiting wallet', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        ...mockPaymentRecord,
        status: 'completed',
        gateway_transaction_id: 'pay_mock_123',
      });
      mockPrismaService.wallets.findUnique.mockResolvedValueOnce(
        mockWalletRecord,
      );

      const result = await service.refundPayment(refundDto);
      expect(result.status).toEqual('refunded');
      expect(result.refundId).toContain('rfnd_');
      expect(mockPrismaService.payment.update).toHaveBeenCalled();
      expect(mockPrismaService.booking.update).toHaveBeenCalled();
      expect(mockPrismaService.wallets.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if payment is not completed', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce({
        ...mockPaymentRecord,
        status: 'pending',
      });

      await expect(service.refundPayment(refundDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if payment is not found', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValueOnce(null);

      await expect(service.refundPayment(refundDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
