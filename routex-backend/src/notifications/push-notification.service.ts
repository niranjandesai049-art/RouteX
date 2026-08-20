import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface IPushNotificationProvider {
  sendPush(tokens: string[], title: string, body: string, data?: Record<string, any>): Promise<boolean>;
}

@Injectable()
export class ConsolePushNotificationProvider implements IPushNotificationProvider {
  private readonly logger = new Logger(ConsolePushNotificationProvider.name);

  async sendPush(tokens: string[], title: string, body: string, data?: Record<string, any>): Promise<boolean> {
    this.logger.log(`[PUSH PROVIDER - CONSOLE] Sending to ${tokens.length} devices | Title: "${title}" | Body: "${body}"`);
    return true;
  }
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private pushProvider: IPushNotificationProvider;

  constructor(private readonly prisma: PrismaService) {
    // Default provider abstraction to Console provider for dev
    this.pushProvider = new ConsolePushNotificationProvider();
  }

  setProvider(provider: IPushNotificationProvider) {
    this.pushProvider = provider;
  }

  /**
   * Registers or updates a device push token for a user.
   */
  async registerDevice(
    userId: string,
    deviceId: string,
    token: string,
    platform: 'android' | 'ios' | 'web',
  ) {
    const record = await this.prisma.push_tokens.upsert({
      where: {
        user_id_device_id: {
          user_id: userId,
          device_id: deviceId,
        },
      },
      update: {
        token,
        platform,
        active: true,
        last_seen_at: new Date(),
      },
      create: {
        user_id: userId,
        device_id: deviceId,
        token,
        platform,
        active: true,
      },
    });

    this.logger.log(`[PUSH TOKEN] Registered device ${deviceId} (${platform}) for user ${userId}`);
    return record;
  }

  /**
   * Deactivates a device push token on logout.
   */
  async removeDevice(userId: string, deviceId: string) {
    await this.prisma.push_tokens.updateMany({
      where: {
        user_id: userId,
        device_id: deviceId,
      },
      data: { active: false },
    });
    this.logger.log(`[PUSH TOKEN] Deactivated device ${deviceId} for user ${userId}`);
    return { success: true };
  }

  /**
   * Dispatches a notification to a target user across active devices and saves history.
   */
  async notifyUser(
    userId: string,
    notification: {
      type: string;
      title: string;
      body: string;
      data?: Record<string, any>;
    },
  ) {
    // 1. Save in app_notifications table
    const appNotif = await this.prisma.app_notifications.create({
      data: {
        user_id: userId,
        type: notification.type,
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
      },
    });

    // 2. Fetch active push tokens for user
    const activeTokens = await this.prisma.push_tokens.findMany({
      where: {
        user_id: userId,
        active: true,
      },
      select: { token: true },
    });

    if (activeTokens.length > 0) {
      const tokensList = activeTokens.map((t) => t.token);
      await this.pushProvider.sendPush(
        tokensList,
        notification.title,
        notification.body,
        notification.data,
      );
    }

    return appNotif;
  }

  /**
   * Retrieves notification history for a user.
   */
  async getUserNotifications(userId: string) {
    return this.prisma.app_notifications.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 50,
    });
  }

  /**
   * Marks notification as read.
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.prisma.app_notifications.updateMany({
      where: { id: notificationId, user_id: userId },
      data: { read_at: new Date() },
    });
  }
}
