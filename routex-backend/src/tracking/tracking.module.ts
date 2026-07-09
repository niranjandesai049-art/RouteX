import { Module } from '@nestjs/common';
import { TrackingGateway } from './tracking.gateway';
import { PrismaModule } from '../prisma/prisma.module';
import { MapModule } from '../map/map.module';

@Module({
  imports: [PrismaModule, MapModule],
  providers: [TrackingGateway],
  exports: [TrackingGateway],
})
export class TrackingModule {}
