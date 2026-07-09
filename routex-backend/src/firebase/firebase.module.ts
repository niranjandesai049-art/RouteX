import { Module, Global } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { NotificationService } from './notification.service';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [FirebaseService, NotificationService],
  exports: [FirebaseService, NotificationService],
})
export class FirebaseModule {}
