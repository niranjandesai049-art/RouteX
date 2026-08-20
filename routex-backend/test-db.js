const { PrismaClient } = require('@prisma/client');

async function test() {
  const url = 'postgresql://postgres.dwdkdwqjpcthmxfkhqkr:Niranjan2243@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true';
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const res = await prisma.phone_verifications.create({
      data: {
        phone_number: '+919876543210',
        otp_hash: 'test-hash-123',
        expires_at: new Date(Date.now() + 300000),
        resend_available_at: new Date(Date.now() + 60000),
        attempts: 0
      }
    });
    console.log('POOLER SUCCESS:', res.id);
  } catch (err) {
    console.error('POOLER ERR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
