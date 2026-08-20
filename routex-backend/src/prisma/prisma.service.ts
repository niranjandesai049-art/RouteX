import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    let retries = 3;
    while (retries > 0) {
      try {
        await this.$connect();
        console.log('Successfully connected to Supabase PostgreSQL Database.');
        break;
      } catch (err: any) {
        retries--;
        console.warn(`Prisma connection attempt failed (${retries} retries left):`, err.message);
        if (retries === 0) {
          console.error('Prisma initial connection deferred. Client will connect automatically on first query.');
        } else {
          await new Promise((res) => setTimeout(res, 1000));
        }
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
