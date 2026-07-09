const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  await prisma.profiles.update({
    where: { phone_number: '9999999999' },
    data: { role: 'driver' }
  });
  console.log("Updated role to driver");
  process.exit(0);
}

fix();
