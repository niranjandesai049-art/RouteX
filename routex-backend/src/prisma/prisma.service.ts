import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

export function resolveDatabaseUrl(): string {
  const url = process.env.DATABASE_URL || '';

  // Working Supabase transaction pooler URL (IPv4 compatible for Render / AWS / Docker)
  const poolerUrl =
    'postgresql://postgres.dwdkdwqjpcthmxfkhqkr:Niranjan2243@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true';

  // If missing or localhost or pointing to direct Supabase IPv6 domain (which Render cannot resolve)
  if (!url || url.includes('localhost') || url.includes('db.dwdkdwqjpcthmxfkhqkr.supabase.co')) {
    return poolerUrl;
  }

  // If URL references old or non-working pooler domain / port
  if (
    url.includes('aws-0-ap-south-1.pooler.supabase.com') ||
    (url.includes('pooler.supabase.com') && url.includes(':5432'))
  ) {
    return poolerUrl;
  }

  return url;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  public isConnected = false;

  constructor() {
    const resolvedUrl = resolveDatabaseUrl();
    super({
      datasources: {
        db: {
          url: resolvedUrl,
        },
      },
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      this.logger.log('[PRISMA] Initializing database connection...');
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Connection Timeout after 10000ms')), 10000),
        ),
      ]);
      this.isConnected = true;
      this.logger.log('Successfully connected to PostgreSQL Database.');
    } catch (err: any) {
      this.isConnected = false;
      this.logger.error(
        `[PRISMA] Database connection failed: ${err.message}`,
        err.stack,
      );
    }
  }

  async safeQuery<T>(queryFn: () => Promise<T>, fallback: T): Promise<T> {
    if (!this.isConnected) return fallback;
    try {
      return await Promise.race([
        queryFn(),
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Query Timeout')), 5000),
        ),
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

