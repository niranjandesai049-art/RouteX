import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;

  async onModuleInit() {
    try {
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection Timeout')), 1500)),
      ]);
      this.isConnected = true;
      this.logger.log('Successfully connected to PostgreSQL Database.');
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`[PRISMA] Database connection deferred (${err.message}). In-memory mode active.`);
    }
  }

  async safeQuery<T>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
    if (!this.isConnected) return fallback;
    try {
      return await Promise.race([
        queryFn(),
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Query Timeout')), 1500)),
      ]);
    } catch {
      return fallback;
    }
  }

  async onModuleDestroy() {
    if (this.isConnected) {
      await this.$disconnect().catch(() => {});
    }
  }
}
