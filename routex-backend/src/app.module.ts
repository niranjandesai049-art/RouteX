import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CompaniesModule } from './companies/companies.module';
import { DriversModule } from './drivers/drivers.module';
import { FleetModule } from './fleet/fleet.module';
import { TrucksModule } from './trucks/trucks.module';
import { BookingModule } from './booking/booking.module';
import { PaymentsModule } from './payments/payments.module';
import { WalletModule } from './wallet/wallet.module';
import { TrackingModule } from './tracking/tracking.module';
import { AiModule } from './ai/ai.module';
import { AiPricingModule } from './ai-pricing/ai-pricing.module';
import { FirebaseModule } from './firebase/firebase.module';
import { NotificationsModule } from './notifications/notifications.module';
import { MapModule } from './map/map.module';

@Module({
  imports: [
    MapModule,
    PrismaModule,
    AuthModule,
    NotificationsModule,
    UsersModule,
    CompaniesModule,
    DriversModule,
    FleetModule,
    TrucksModule,
    BookingModule,
    PaymentsModule,
    WalletModule,
    TrackingModule,
    AiModule,
    AiPricingModule,
    FirebaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
