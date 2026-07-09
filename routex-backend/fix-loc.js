const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function fixLoc() {
  await prisma.booking.update({
    where: { id: 'a2065aa0-457a-4845-8b26-ba708deef1b5' },
    data: {
      pickup_address: {
        otp: '1058',
        address: 'Googleplex',
        latitude: 37.4219983,
        longitude: -122.084
      },
      delivery_address: {
        otp: '8728',
        address: 'San Jose',
        latitude: 37.3382,
        longitude: -121.8863,
        signature: null
      }
    }
  });
  console.log("Fixed booking loc");
  process.exit(0);
}
fixLoc();
