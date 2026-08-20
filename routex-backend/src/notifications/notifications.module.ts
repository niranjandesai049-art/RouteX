import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { PushNotificationService } from './push-notification.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [EmailService, PushNotificationService],
  exports: [EmailService, PushNotificationService],
})
export class NotificationsModule {}
