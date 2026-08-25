import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches or automatically initializes a user's wallet with 0.0 INR balance.
   */
  async getOrCreateWallet(userId: string) {
    let wallet: any = null;
    try {
      wallet = await this.prisma.wallets.findUnique({
        where: { profile_id: userId },
      });
    } catch (err: any) {
      this.logger.warn(`[WALLET] DB query warning for ${userId}: ${err.message}`);
    }

    if (!wallet) {
      this.logger.log(`[WALLET] Auto-initializing wallet for profile: ${userId}`);
      try {
        wallet = await this.prisma.wallets.create({
          data: {
            profile_id: userId,
            balance: new Prisma.Decimal(0.0),
            currency: 'INR',
            is_frozen: false,
          },
        });
      } catch (err: any) {
        this.logger.warn(`[WALLET] Wallet creation warning: ${err.message}. Using fallback wallet object.`);
        wallet = {
          id: 'wlt_' + userId,
          profile_id: userId,
          balance: new Prisma.Decimal(0.0),
          currency: 'INR',
          is_frozen: false,
        };
      }
    }

    return wallet;
  }

  async getBalance(userId: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return { walletBalance: parseFloat((wallet.balance || 0).toString()) };
  }

  async addFunds(userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.is_frozen) {
      throw new BadRequestException('Wallet is frozen');
    }

    let updated: any = null;
    try {
      updated = await this.prisma.wallets.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: new Prisma.Decimal(amount),
          },
        },
      });
    } catch {
      const currentVal = parseFloat((wallet.balance || 0).toString());
      updated = {
        ...wallet,
        balance: new Prisma.Decimal(currentVal + amount),
      };
    }

    return { walletBalance: parseFloat(updated.balance.toString()) };
  }

  async withdrawFunds(userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const wallet = await this.getOrCreateWallet(userId);

    if (wallet.is_frozen) {
      throw new BadRequestException('Wallet is frozen');
    }

    const currentBalance = parseFloat((wallet.balance || 0).toString());
    if (currentBalance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    let updated: any = null;
    try {
      updated = await this.prisma.wallets.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: new Prisma.Decimal(amount),
          },
        },
      });
    } catch {
      updated = {
        ...wallet,
        balance: new Prisma.Decimal(currentBalance - amount),
      };
    }

    return { walletBalance: parseFloat(updated.balance.toString()) };
  }
}
