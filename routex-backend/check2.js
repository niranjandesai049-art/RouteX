const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.booking.findMany({ where: { status: 'searching' } }).then(bookings => {
  console.log(bookings);
  process.exit(0);
});
