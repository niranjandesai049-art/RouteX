import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { TrackingModule } from '../tracking/tracking.module';
import { MapModule } from '../map/map.module';

@Module({
  imports: [TrackingModule, MapModule],
  providers: [BookingService],
  controllers: [BookingController],
  exports: [BookingService],
})
export class BookingModule {}
