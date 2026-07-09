import { Injectable, Logger } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Helper to persist notification inside PostgreSQL database for history
   */
  private async persistNotification(
    profileId: string,
    payload: NotificationPayload,
  ) {
    try {
      await this.prisma.notifications.create({
        data: {
          profile_id: profileId,
          title: payload.title,
          body: payload.body,
          metadata: payload.data || {},
        },
      });
      this.logger.log(
        `Persisted notification in database for profile: ${profileId}`,
      );
    } catch (e: any) {
      this.logger.error(
        `Failed to persist notification in database for profile: ${profileId}`,
        e.message,
      );
    }
  }

  /**
   * Send notification to a specific user by profileId
   */
  async sendToUser(userId: string, payload: NotificationPayload) {
    // 1. Fetch user FCM token from database
    const profile = await this.prisma.profiles.findUnique({
      where: { id: userId },
      select: { fcm_token: true },
    });

    // 2. Persist in database notifications history table
    await this.persistNotification(userId, payload);

    if (!profile || !profile.fcm_token) {
      this.logger.warn(
        `No FCM token registered for user: ${userId}. Push notification skipped.`,
      );
      return;
    }

    await this.sendToToken(profile.fcm_token, payload, userId);
  }

  /**
   * Send notification to a specific driver.
   * In this schema, drivers.id === profiles.id (shared primary key).
   */
  async sendToDriver(driverId: string, payload: NotificationPayload) {
    await this.sendToUser(driverId, payload);
  }

  /**
   * Send notification to a specific FCM registration token
   */
  private async sendToToken(
    token: string,
    payload: NotificationPayload,
    userId?: string,
  ) {
    const messaging = this.firebaseService.getMessaging();
    if (this.firebaseService.isMock() || !messaging) {
      this.logger.log(
        `[MOCK PUSH] Sent to User ${userId || 'Token'}: ${payload.title} - ${payload.body}`,
      );
      return;
    }

    try {
      const response = await messaging.send({
        token,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      });
      this.logger.log(`Push notification sent successfully: ${response}`);
    } catch (error: any) {
      this.logger.error(
        `Error sending push notification to token: ${error.message}`,
      );

      // If token is invalid or expired, clear it from database
      if (
        userId &&
        (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token')
      ) {
        this.logger.warn(`Removing invalid FCM token for user: ${userId}`);
        await this.prisma.profiles.update({
          where: { id: userId },
          data: { fcm_token: null },
        });
      }
    }
  }

  /**
   * Send notification to a specific topic
   */
  async sendToTopic(topic: string, payload: NotificationPayload) {
    const messaging = this.firebaseService.getMessaging();
    if (this.firebaseService.isMock() || !messaging) {
      this.logger.log(
        `[MOCK TOPIC PUSH] Sent to Topic ${topic}: ${payload.title} - ${payload.body}`,
      );
      return;
    }

    try {
      const response = await messaging.send({
        topic,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      });
      this.logger.log(`Topic push notification sent successfully: ${response}`);
    } catch (error: any) {
      this.logger.error(
        `Error sending push notification to topic ${topic}: ${error.message}`,
      );
    }
  }

  /**
   * Send multicast notification to list of tokens
   */
  async sendMulticast(tokens: string[], payload: NotificationPayload) {
    const messaging = this.firebaseService.getMessaging();
    if (this.firebaseService.isMock() || !messaging) {
      this.logger.log(
        `[MOCK MULTICAST PUSH] Sent to ${tokens.length} tokens: ${payload.title} - ${payload.body}`,
      );
      return;
    }

    if (tokens.length === 0) return;

    try {
      const response = await messaging.sendEachForMulticast({
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: payload.data,
      });
      this.logger.log(
        `Multicast push notifications sent: ${response.successCount} success, ${response.failureCount} failures`,
      );

      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error;
          const token = tokens[idx];
          if (
            error &&
            (error.code === 'messaging/registration-token-not-registered' ||
              error.code === 'messaging/invalid-registration-token')
          ) {
            this.logger.warn(
              `Removing invalid FCM token found during multicast: ${token}`,
            );
            this.prisma.profiles
              .updateMany({
                where: { fcm_token: token },
                data: { fcm_token: null },
              })
              .catch((err) => {
                this.logger.error(
                  `Failed to clear invalid token in updateMany: ${err.message}`,
                );
              });
          }
        }
      });
    } catch (error: any) {
      this.logger.error(
        `Error sending multicast push notifications: ${error.message}`,
      );
    }
  }
}
