import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettlementDto } from './dto/create-settlement.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@Injectable()
export class DriverWalletService {
  private readonly logger = new Logger(DriverWalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches or automatically initializes a driver's wallet.
   */
  async getOrCreateWallet(driverId: string) {
    // Verify driver profile exists first
    const driver = await this.prisma.drivers.findUnique({
      where: { id: driverId },
    });

    if (!driver) {
      throw new NotFoundException(
        `Driver profile not found for ID: ${driverId}`,
      );
    }

    let wallet = await this.prisma.driverWallet.findUnique({
      where: { driver_id: driverId },
    });

    if (!wallet) {
      this.logger.log(`Initializing new wallet for driver: ${driverId}`);
      wallet = await this.prisma.driverWallet.create({
        data: {
          driver_id: driverId,
          balance: 0.0,
          currency: 'INR',
          is_active: true,
        },
      });
    }

    return wallet;
  }

  /**
   * Gets current balance of the driver's wallet.
   */
  async getBalance(driverId: string) {
    const wallet = await this.getOrCreateWallet(driverId);
    return {
      balance: parseFloat(wallet.balance.toString()),
      currency: wallet.currency,
      isActive: wallet.is_active,
      updatedAt: wallet.updated_at,
    };
  }

  /**
   * Retrieves transaction ledger history for a driver's wallet.
   */
  async getHistory(driverId: string) {
    const wallet = await this.getOrCreateWallet(driverId);
    const transactions = await this.prisma.driverWalletTransaction.findMany({
      where: { wallet_id: wallet.id },
      orderBy: { created_at: 'desc' },
      include: {
        bookings: {
          select: {
            booking_reference: true,
            cargo_description: true,
          },
        },
      },
    });

    return transactions.map((t) => ({
      id: t.id,
      amount: parseFloat(t.amount.toString()),
      type: t.type,
      description: t.description,
      bookingReference: t.bookings?.booking_reference || null,
      cargoDescription: t.bookings?.cargo_description || null,
      createdAt: t.created_at,
    }));
  }

  /**
   * Submits a bank settlement request, debiting balance immediately.
   */
  async requestSettlement(driverId: string, dto: CreateSettlementDto) {
    const { amount, bankDetails } = dto;
    const wallet = await this.getOrCreateWallet(driverId);

    if (!wallet.is_active) {
      throw new BadRequestException('Driver wallet is inactive.');
    }

    const currentBalance = parseFloat(wallet.balance.toString());
    if (currentBalance < amount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ${currentBalance} INR.`,
      );
    }

    // Execute atomic transaction: debit balance, log transaction, record settlement
    await this.prisma.$transaction(async (tx) => {
      // 1. Debit wallet
      await tx.driverWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
        },
      });

      // 2. Register transaction log
      await tx.driverWalletTransaction.create({
        data: {
          wallet_id: wallet.id,
          amount: amount,
          type: 'debit',
          description: `Bank Settlement to ${bankDetails.bankName} (A/C: ${bankDetails.accountNumber})`,
        },
      });

      // 3. Register settlement
      await tx.driverSettlement.create({
        data: {
          wallet_id: wallet.id,
          amount: amount,
          status: 'pending',
          bank_details: bankDetails as any,
        },
      });
    });

    this.logger.log(
      `Created settlement request for driver ${driverId} of amount ${amount} INR.`,
    );
    return {
      status: 'success',
      message: 'Settlement request submitted successfully.',
      debitedAmount: amount,
    };
  }

  /**
   * Triggers a payout withdrawal (UPI/Bank), checking balance limit.
   */
  async requestWithdrawal(driverId: string, dto: CreateWithdrawalDto) {
    const { amount, payoutMethod, payoutDetails } = dto;
    const wallet = await this.getOrCreateWallet(driverId);

    if (!wallet.is_active) {
      throw new BadRequestException('Driver wallet is inactive.');
    }

    const currentBalance = parseFloat(wallet.balance.toString());
    if (currentBalance < amount) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ${currentBalance} INR.`,
      );
    }

    // Execute atomic transaction: debit balance, log transaction, record withdrawal
    await this.prisma.$transaction(async (tx) => {
      // 1. Debit wallet
      await tx.driverWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: amount },
        },
      });

      // 2. Register transaction log
      await tx.driverWalletTransaction.create({
        data: {
          wallet_id: wallet.id,
          amount: amount,
          type: 'debit',
          description: `Payout Withdrawal via ${payoutMethod.toUpperCase()}`,
        },
      });

      // 3. Register withdrawal
      await tx.driverWithdrawal.create({
        data: {
          wallet_id: wallet.id,
          amount: amount,
          status: 'pending',
          payout_method: payoutMethod,
          payout_details: payoutDetails || {},
        },
      });
    });

    this.logger.log(
      `Created withdrawal request for driver ${driverId} of amount ${amount} INR.`,
    );
    return {
      status: 'success',
      message: 'Withdrawal request submitted successfully.',
      debitedAmount: amount,
    };
  }
}
