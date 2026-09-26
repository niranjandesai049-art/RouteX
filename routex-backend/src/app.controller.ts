import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Query,
  UseGuards,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { BookingService, CreateBookingDto } from './booking/booking.service';
import { AiService } from './ai/ai.service';
import { PrismaService } from './prisma/prisma.service';
import {
  booking_status,
  user_role,
  vehicle_type,
  vehicle_status,
  driver_status,
  verification_status,
  payment_status,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { Roles } from './auth/roles.decorator';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly bookingService: BookingService,
    private readonly aiService: AiService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('health')
  getHealth() {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async getReadiness() {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latencyMs = Date.now() - start;
      return {
        status: 'ready',
        database: 'connected',
        latencyMs,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      this.logger.error(
        `[READY] Database connection failed: ${err.message}`,
        err.stack,
      );
      throw new ServiceUnavailableException(
        `Database connection failed: ${err.message}`,
      );
    }
  }

  @Get('live')
  getLiveness() {
    return { status: 'alive', timestamp: new Date().toISOString() };
  }

  // --- Seed Data Endpoint (Optional Helper) ---
  @Post('seed')
  async seedInitialDb() {
    const profileCount = await this.prisma.profiles.count();
    if (profileCount > 0) return { message: 'Database already has profiles.' };

    const shipperId = randomUUID();
    const driverId = randomUUID();

    // Seed mock shipper in auth and public
    await this.prisma.users.create({
      data: {
        id: shipperId,
        email: 'corporate@mahindra.com',
        phone: '9876543210',
        aud: 'authenticated',
        role: 'authenticated',
      },
    });

    await this.prisma.profiles.create({
      data: {
        id: shipperId,
        first_name: 'Mahindra',
        last_name: 'Logistics Ltd.',
        email: 'corporate@mahindra.com',
        phone_number: '9876543210',
        role: user_role.shipper,
        verification_state: verification_status.verified,
        is_active: true,
      },
    });

    await this.prisma.wallets.create({
      data: {
        profile_id: shipperId,
        balance: 150000.0,
        currency: 'INR',
        is_frozen: false,
      },
    });

    // Seed mock driver
    await this.prisma.users.create({
      data: {
        id: driverId,
        email: 'sunil.yadav@gmail.com',
        phone: '9988776655',
        aud: 'authenticated',
        role: 'authenticated',
      },
    });

    await this.prisma.profiles.create({
      data: {
        id: driverId,
        first_name: 'Sunil',
        last_name: 'Yadav',
        email: 'sunil.yadav@gmail.com',
        phone_number: '9988776655',
        role: user_role.driver,
        verification_state: verification_status.verified,
        is_active: true,
      },
    });

    await this.prisma.wallets.create({
      data: {
        profile_id: driverId,
        balance: 0.0,
        currency: 'INR',
        is_frozen: false,
      },
    });

    await this.prisma.drivers.create({
      data: {
        id: driverId,
        license_number: 'DL-1420230098765',
        license_expiry: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
        years_of_experience: 5,
        status: driver_status.available,
        verification_state: verification_status.verified,
      },
    });

    // Seed mock vehicles
    const truck = await this.prisma.trucks.create({
      data: {
        plate_number: 'MH-12-Q-9041',
        model_name: 'Premium Hauler',
        brand: 'Tata Motors',
        type: vehicle_type.trailer,
        payload_capacity_kg: 30000,
        fuel_type: 'Diesel',
        status: vehicle_status.available,
        is_verified: true,
      },
    });

    return {
      message: 'Database seeded successfully',
      shipperId,
      driverId,
      truckId: truck.id,
    };
  }

  // --- Users & KYC Management ---
  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.super_admin)
  async createUser(
    @Body()
    body: {
      name: string;
      email?: string;
      phone: string;
      role: user_role;
      gstNo?: string;
      panNo?: string;
    },
  ) {
    const userId = randomUUID();
    const names = body.name.split(' ');
    const firstName = names[0] || 'User';
    const lastName = names.slice(1).join(' ') || 'RouteX';
    const emailAddress = body.email || `${body.phone}@routex.in`;

    await this.prisma.users.create({
      data: {
        id: userId,
        email: emailAddress,
        phone: body.phone,
        aud: 'authenticated',
        role: 'authenticated',
      },
    });

    const profile = await this.prisma.profiles.create({
      data: {
        id: userId,
        first_name: firstName,
        last_name: lastName,
        email: emailAddress,
        phone_number: body.phone,
        role: body.role,
        verification_state: verification_status.pending,
        is_active: true,
      },
    });

    await this.prisma.wallets.create({
      data: {
        profile_id: userId,
        balance: body.role === user_role.shipper ? 150000.0 : 0.0,
        currency: 'INR',
        is_frozen: false,
      },
    });

    return profile;
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.super_admin)
  async getAllUsers() {
    return this.prisma.profiles.findMany({
      include: {
        drivers: true,
        companies: true,
      },
    });
  }

  @Put('users/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.super_admin)
  async verifyUser(
    @Param('id') id: string,
    @Body() body: { isVerified: boolean },
  ) {
    const status = body.isVerified
      ? verification_status.verified
      : verification_status.rejected;
    return this.prisma.profiles.update({
      where: { id },
      data: { verification_state: status },
    });
  }

  // --- Vehicles ---
  @Post('vehicles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.fleet_owner, user_role.super_admin)
  async createVehicle(
    @Body()
    body: {
      rcNo: string;
      insuranceNo: string;
      category: string;
      capacityTons: number;
      ownerId: string;
    },
  ) {
    const company = await this.prisma.companies.findFirst({
      where: { owner_id: body.ownerId },
    });

    let truckType: vehicle_type = vehicle_type.container;
    const cat = body.category.toLowerCase();
    if (cat.includes('mini') || cat.includes('ace')) {
      truckType = vehicle_type.mini_truck;
    } else if (cat.includes('open')) {
      truckType = vehicle_type.open_body;
    } else if (cat.includes('trailer')) {
      truckType = vehicle_type.trailer;
    }

    const payloadKg = Math.round(body.capacityTons * 1000);

    return this.prisma.trucks.create({
      data: {
        company_id: company?.id || null,
        plate_number: body.rcNo,
        model_name: 'Premium Hauler',
        brand: 'Tata Motors',
        type: truckType,
        payload_capacity_kg: payloadKg,
        fuel_type: 'Diesel',
        status: vehicle_status.available,
        is_verified: true,
      },
    });
  }

  @Get('vehicles')
  @UseGuards(JwtAuthGuard)
  async getAllVehicles() {
    return this.prisma.trucks.findMany({
      include: {
        companies: true,
        drivers: {
          include: {
            profiles: true,
          },
        },
      },
    });
  }

  // --- Dashboard Real DB KPIs & Metrics ---
  @Get('dashboard/shipper')
  @UseGuards(JwtAuthGuard)
  async getShipperDashboard(@Query('shipperId') shipperId: string) {
    const shipper = await this.prisma.profiles.findUnique({
      where: { id: shipperId },
    });

    const shipperWallet = await this.prisma.wallets.findFirst({
      where: { profile_id: shipperId },
    });

    const activeShipmentsCount = await this.prisma.booking.count({
      where: {
        shipper_id: shipperId,
        NOT: {
          status: booking_status.completed,
        },
      },
    });

    const totalShipmentsCount = await this.prisma.booking.count({
      where: { shipper_id: shipperId },
    });

    return {
      walletBalance: shipperWallet
        ? parseFloat(shipperWallet.balance.toString())
        : 0.0,
      activeShipmentsCount,
      totalShipmentsCount,
      isVerified: shipper
        ? shipper.verification_state === verification_status.verified
        : false,
    };
  }

  @Get('dashboard/fleet')
  @UseGuards(JwtAuthGuard)
  async getFleetDashboard() {
    const totalTrucks = await this.prisma.trucks.count();

    const activeTrucks = await this.prisma.drivers.count({
      where: { status: driver_status.available },
    });

    const earningsQuery = await this.prisma.payment.aggregate({
      where: { status: payment_status.completed },
      _sum: { amount: true },
    });

    return {
      totalTrucks,
      activeTrucks,
      idleTrucks: Math.max(0, totalTrucks - activeTrucks),
      weeklyProfit: earningsQuery._sum?.amount
        ? parseFloat(earningsQuery._sum.amount.toString())
        : 0.0,
    };
  }

  @Get('dashboard/admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(user_role.super_admin)
  async getAdminDashboard() {
    const revenueQuery = await this.prisma.payment.aggregate({
      where: { status: payment_status.completed },
      _sum: { amount: true },
    });

    const bookingsCount = await this.prisma.booking.count();
    const totalRevenue = revenueQuery._sum?.amount
      ? parseFloat(revenueQuery._sum.amount.toString())
      : 0.0;

    // Sum of commissions for completed jobs (5% model commission)
    const commissionCollected = totalRevenue * 0.05;

    const pendingKYC = await this.prisma.profiles.count({
      where: { verification_state: verification_status.pending },
    });

    return {
      totalRevenue,
      commissionCollected,
      pendingKYC,
      activeTrips: bookingsCount,
    };
  }

  // --- AI Predictions ---
  @Get('ai/predict-rate')
  @UseGuards(JwtAuthGuard)
  predictRate(
    @Query('pickup') pickup: string,
    @Query('destination') destination: string,
    @Query('distance') distance: string,
    @Query('weight') weight: string,
    @Query('category') category: string,
    @Query('weather') weather: string,
  ) {
    return this.aiService.predictFreightRate({
      pickupAddress: pickup,
      destAddress: destination,
      distanceKm: parseFloat(distance || '0'),
      weightTons: parseFloat(weight || '0'),
      truckCategory: category || 'Tata Ace',
      weatherCondition: weather || 'Sunny',
      hourOfDay: new Date().getHours(),
    });
  }

  @Get('ai/predict-delay')
  @UseGuards(JwtAuthGuard)
  predictDelay(
    @Query('pickup') pickup: string,
    @Query('destination') destination: string,
    @Query('distance') distance: string,
    @Query('weight') weight: string,
    @Query('category') category: string,
    @Query('weather') weather: string,
  ) {
    return this.aiService.predictDelay({
      pickupAddress: pickup,
      destAddress: destination,
      distanceKm: parseFloat(distance || '0'),
      weightTons: parseFloat(weight || '0'),
      truckCategory: category || 'Tata Ace',
      weatherCondition: weather || 'Sunny',
      hourOfDay: new Date().getHours(),
    });
  }

  @Get('ai/safety-score')
  @UseGuards(JwtAuthGuard)
  getSafetyScore(
    @Query('trips') trips: string,
    @Query('ontime') ontime: string,
    @Query('harshbreaks') harshbreaks: string,
  ) {
    return {
      safetyScore: this.aiService.calculateDriverSafetyScore(
        parseInt(trips || '0'),
        parseInt(ontime || '0'),
        parseInt(harshbreaks || '0'),
      ),
    };
  }
}
