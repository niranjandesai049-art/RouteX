import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallets.findUnique({
      where: { profile_id: userId },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    return { walletBalance: parseFloat(wallet.balance.toString()) };
  }

  async addFunds(userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const wallet = await this.prisma.wallets.findUnique({
      where: { profile_id: userId },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (wallet.is_frozen) {
      throw new BadRequestException('Wallet is frozen');
    }

    const updated = await this.prisma.wallets.update({
      where: { id: wallet.id },
      data: {
        balance: {
          increment: new Prisma.Decimal(amount),
        },
      },
    });

    return { walletBalance: parseFloat(updated.balance.toString()) };
  }

  async withdrawFunds(userId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const wallet = await this.prisma.wallets.findUnique({
      where: { profile_id: userId },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');

    if (wallet.is_frozen) {
      throw new BadRequestException('Wallet is frozen');
    }

    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const updated = await this.prisma.wallets.update({
      where: { id: wallet.id },
      data: {
        balance: {
          decrement: new Prisma.Decimal(amount),
        },
      },
    });

    return { walletBalance: parseFloat(updated.balance.toString()) };
  }
}
