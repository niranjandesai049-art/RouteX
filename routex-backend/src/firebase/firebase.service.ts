import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { initializeApp, cert, App, getApp, getApps } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getAuth, Auth } from 'firebase-admin/auth';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);
  private adminApp: App | null = null;
  private isMockMode = false;

  onModuleInit() {
    try {
      const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
      let serviceAccount: any = null;

      if (saEnv) {
        try {
          serviceAccount = JSON.parse(saEnv);
          this.logger.log(
            'Loaded Firebase Service Account from environment variable.',
          );
        } catch (e: any) {
          this.logger.error(
            'Failed to parse FIREBASE_SERVICE_ACCOUNT JSON from environment:',
            e.message,
          );
        }
      } else {
        // Try reading from a local JSON file outside source control
        const saPath = path.resolve(
          process.cwd(),
          'firebase-service-account.json',
        );
        if (fs.existsSync(saPath)) {
          try {
            serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            this.logger.log(
              'Loaded Firebase Service Account from firebase-service-account.json file.',
            );
          } catch (e: any) {
            this.logger.error(
              'Failed to parse firebase-service-account.json file:',
              e.message,
            );
          }
        }
      }

      if (serviceAccount) {
        // Avoid re-initialization during hot-reload
        if (getApps().length === 0) {
          this.adminApp = initializeApp({
            credential: cert(serviceAccount),
          });
        } else {
          this.adminApp = getApp();
        }
        this.logger.log('Firebase Admin SDK initialized successfully.');
      } else {
        this.isMockMode = true;
        this.logger.warn(
          'No Firebase Service Account credentials found. ' +
            'Set FIREBASE_SERVICE_ACCOUNT env var or place firebase-service-account.json in the project root. ' +
            'Running in mock/sandbox notification mode — push notifications will be logged but not delivered.',
        );
      }
    } catch (error: any) {
      this.isMockMode = true;
      this.logger.error(
        'Failed to initialize Firebase Admin SDK. Falling back to mock notification mode:',
        error.message,
      );
    }
  }

  getMessaging(): Messaging | null {
    if (this.isMockMode || !this.adminApp) return null;
    return getMessaging(this.adminApp);
  }

  /**
   * Returns the Firebase Admin Auth instance for ID token verification.
   * Returns null when running in mock mode (no service account configured).
   */
  getAuth(): Auth | null {
    if (this.isMockMode || !this.adminApp) return null;
    return getAuth(this.adminApp);
  }

  isMock(): boolean {
    return this.isMockMode;
  }
}
