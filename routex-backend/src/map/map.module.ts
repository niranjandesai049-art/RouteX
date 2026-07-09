import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MapService } from './map.service';

@Module({
  imports: [PrismaModule],
  providers: [MapService],
  exports: [MapService],
})
export class MapModule {}
