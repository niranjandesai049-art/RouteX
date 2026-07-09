/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DriverWalletService } from './driver-wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DriverWalletService', () => {
  let service: DriverWalletService;
  let prisma: PrismaService;

  const mockDriverId = 'driver-uuid-12345';
  const mockWalletRecord = {
    id: 'wallet-uuid-12345',
    driver_id: mockDriverId,
    balance: new Decimal(1000.0),
    currency: 'INR',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockDriverRecord = {
    id: mockDriverId,
    license_number: 'DL-12345',
    license_expiry: new Date(),
    years_of_experience: 5,
    status: 'available',
    verification_state: 'verified',
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  };

  const mockPrismaService = {
    drivers: {
      findUnique: jest.fn().mockImplementation((args) => {
        if (args.where.id === mockDriverId) {
          return Promise.resolve(mockDriverRecord);
        }
        return Promise.resolve(null);
      }),
    },
    driverWallet: {
      findUnique: jest
        .fn()
        .mockImplementation(() => Promise.resolve(mockWalletRecord)),
      create: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          id: 'new-wallet-uuid',
          ...args.data,
        }),
      ),
      update: jest.fn().mockImplementation((args) =>
        Promise.resolve({
          ...mockWalletRecord,
          ...args.data,
        }),
      ),
    },
    driverWalletTransaction: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation((args) =>
          Promise.resolve({ id: 'tx-uuid', ...args.data }),
        ),
    },
    driverSettlement: {
      create: jest
        .fn()
        .mockImplementation((args) =>
          Promise.resolve({ id: 'settle-uuid', ...args.data }),
        ),
    },
    driverWithdrawal: {
      create: jest
        .fn()
        .mockImplementation((args) =>
          Promise.resolve({ id: 'with-uuid', ...args.data }),
        ),
    },
    $transaction: jest
      .fn()
      .mockImplementation((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriverWalletService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DriverWalletService>(DriverWalletService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getOrCreateWallet', () => {
    it('should throw NotFoundException if driver profile does not exist', async () => {
      mockPrismaService.drivers.findUnique.mockResolvedValueOnce(null);
      await expect(service.getOrCreateWallet('invalid-driver')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return existing wallet if found', async () => {
      mockPrismaService.drivers.findUnique.mockResolvedValueOnce(
        mockDriverRecord,
      );
      mockPrismaService.driverWallet.findUnique.mockResolvedValueOnce(
        mockWalletRecord,
      );

      const result = await service.getOrCreateWallet(mockDriverId);
      expect(result.id).toEqual(mockWalletRecord.id);
      expect(result.driver_id).toEqual(mockDriverId);
    });

    it('should create new wallet if not found', async () => {
      mockPrismaService.drivers.findUnique.mockResolvedValueOnce(
        mockDriverRecord,
      );
      mockPrismaService.driverWallet.findUnique.mockResolvedValueOnce(null);

      const result = await service.getOrCreateWallet(mockDriverId);
      expect(result.id).toEqual('new-wallet-uuid');
      expect(prisma.driverWallet.create).toHaveBeenCalled();
    });
  });

  describe('getBalance', () => {
    it('should return balance details', async () => {
      mockPrismaService.drivers.findUnique.mockResolvedValueOnce(
        mockDriverRecord,
      );
      mockPrismaService.driverWallet.findUnique.mockResolvedValueOnce(
        mockWalletRecord,
      );

      const result = await service.getBalance(mockDriverId);
      expect(result.balance).toEqual(1000.0);
      expect(result.currency).toEqual('INR');
      expect(result.isActive).toBe(true);
    });
  });

  describe('requestSettlement', () => {
    const settlementDto = {
      amount: 400,
      bankDetails: {
        accountNumber: '1234567890',
        ifsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        beneficiaryName: 'Rahul Kumar',
      },
    };

    it('should process settlement successfully when balance is sufficient', async () => {
      mockPrismaService.drivers.findUnique.mockResolvedValueOnce(
        mockDriverRecord,
      );
      mockPrismaService.driverWallet.findUnique.mockResolvedValueOnce(
        mockWalletRecord,
      );

      const result = await service.requestSettlement(
        mockDriverId,
        settlementDto,
      );
      expect(result.status).toEqual('success');
      expect(result.debitedAmount).toEqual(400);
      expect(mockPrismaService.driverWallet.update).toHaveBeenCalled();
      expect(
        mockPrismaService.driverWalletTransaction.create,
      ).toHaveBeenCalled();
      expect(mockPrismaService.driverSettlement.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if balance is insufficient', async () => {
      mockPrismaService.drivers.findUnique.mockResolvedValueOnce(
        mockDriverRecord,
      );
      mockPrismaService.driverWallet.findUnique.mockResolvedValueOnce({
        ...mockWalletRecord,
        balance: new Decimal(200),
      });

      await expect(
        service.requestSettlement(mockDriverId, settlementDto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
