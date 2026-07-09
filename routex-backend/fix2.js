const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fix() {
  const profile = await prisma.profiles.findUnique({ where: { phone_number: '9999999999' } });
  if (profile) {
    const existingDriver = await prisma.drivers.findUnique({ where: { id: profile.id } });
    if (!existingDriver) {
      await prisma.drivers.create({
        data: {
          id: profile.id,
          license_number: 'DL-9999',
          license_expiry: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
          years_of_experience: 1,
          status: 'available',
          verification_state: 'verified',
        }
      });
      console.log("Driver created");
    } else {
      console.log("Driver exists");
    }
  }
  process.exit(0);
}

fix();
