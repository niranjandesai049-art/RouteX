const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { BookingService } = require('./dist/booking/booking.service');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const bookingService = app.get(BookingService);
  
  // get a shipper id
  const shipper = await prisma.profiles.findFirst({ where: { role: 'shipper' } });
  if (!shipper) {
    console.error("No shipper found");
    process.exit(1);
  }

  // San Francisco coordinate
  const pickup = "{\"latitude\":37.4219983,\"longitude\":-122.084,\"address\":\"Googleplex\"}";
  // San Jose coordinate
  const dest = "{\"latitude\":37.3382,\"longitude\":-121.8863,\"address\":\"San Jose\"}";

  const res = await bookingService.create({
    shipperId: shipper.id,
    pickupAddress: pickup,
    destAddress: dest,
    distanceKm: 25,
    weightTons: 2,
    loadType: 'Electronics',
    price: 1500
  });

  console.log("Booking created:", res.id);
  await new Promise(resolve => setTimeout(resolve, 3000));
  await app.close();
}

bootstrap();
