import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { DriverWalletService } from './driver-wallet.service';
import { DriverWalletController } from './driver-wallet.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [WalletService, DriverWalletService],
  controllers: [WalletController, DriverWalletController],
  exports: [WalletService, DriverWalletService],
})
export class WalletModule {}
