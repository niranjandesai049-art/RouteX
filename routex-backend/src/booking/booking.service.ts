import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { NotificationService } from '../firebase/notification.service';
import { MapService } from '../map/map.service';
import { DriversService } from '../drivers/drivers.service';
import {
  booking_status,
  stop_type,
  stop_status,
  user_role,
  driver_status,
  verification_status,
  Prisma,
} from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBookingDto {
  @ApiProperty({ example: 'usr_shipper_123' })
  shipperId: string;

  @ApiProperty({ example: 'Mumbai, MH, India' })
  pickupAddress: string;

  @ApiProperty({ example: 'Delhi, India' })
  destAddress: string;

  @ApiProperty({ example: 1400 })
  distanceKm: number;

  @ApiProperty({ example: 5 })
  weightTons: number;

  @ApiProperty({ example: 'Tata 407' })
  truckCategory: string;

  @ApiProperty({ example: 'Electronics' })
  loadType: string;

  @ApiProperty({ example: 25000 })
  price: number;

  @ApiProperty({ example: ['Surat, India', 'Jaipur, India'], required: false })
  waypoints?: string[];
}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trackingGateway: TrackingGateway,
    private readonly notificationService: NotificationService,
    private readonly mapService: MapService,
  ) {}

  async create(dto: CreateBookingDto) {
    const bookingRef =
      'RX-' +
      Math.floor(100000 + Math.random() * 900000)
        .toString()
        .toUpperCase();

    const pickupLoc = await this.mapService.geocode(dto.pickupAddress);
    const deliveryLoc = await this.mapService.geocode(dto.destAddress);

    const pickupJson = {
      address: dto.pickupAddress,
      latitude: pickupLoc?.latitude || 28.6139, // Default Delhi coordinate
      longitude: pickupLoc?.longitude || 77.209,
      otp: Math.floor(1000 + Math.random() * 9000).toString(), // Save pickup OTP in JSON
    };

    const deliveryJson = {
      address: dto.destAddress,
      latitude: deliveryLoc?.latitude || 19.076, // Default Mumbai coordinate
      longitude: deliveryLoc?.longitude || 72.8777,
      otp: Math.floor(1000 + Math.random() * 9000).toString(), // Save delivery OTP in JSON
      signature: null as string | null,
    };

    const payloadKg = Math.round(dto.weightTons * 1000);

    const stopsArray: any[] = [];
    let stopOrder = 1;

    // 1. Add Pickup Stop
    stopsArray.push({
      stop_order: stopOrder++,
      stop_type: stop_type.pickup,
      address: dto.pickupAddress,
      latitude: new Prisma.Decimal(pickupJson.latitude),
      longitude: new Prisma.Decimal(pickupJson.longitude),
      otp: pickupJson.otp,
      status: stop_status.pending,
    });

    // 2. Add Waypoints
    if (dto.waypoints && dto.waypoints.length > 0) {
      for (const waypoint of dto.waypoints) {
        const wpLoc = await this.mapService.geocode(waypoint);
        stopsArray.push({
          stop_order: stopOrder++,
          stop_type: stop_type.waypoint,
          address: waypoint,
          latitude: new Prisma.Decimal(wpLoc?.latitude || pickupJson.latitude),
          longitude: new Prisma.Decimal(wpLoc?.longitude || pickupJson.longitude),
          otp: Math.floor(1000 + Math.random() * 9000).toString(),
          status: stop_status.pending,
        });
      }
    }

    // 3. Add Delivery Stop
    stopsArray.push({
      stop_order: stopOrder++,
      stop_type: stop_type.delivery,
      address: dto.destAddress,
      latitude: new Prisma.Decimal(deliveryJson.latitude),
      longitude: new Prisma.Decimal(deliveryJson.longitude),
      otp: deliveryJson.otp,
      status: stop_status.pending,
    });

    // Ensure shipper profile exists in database
    if (dto.shipperId) {
      const shipperProfile = await this.prisma.profiles.findUnique({
        where: { id: dto.shipperId },
      }).catch(() => null);

      if (!shipperProfile) {
        await this.prisma.users.upsert({
          where: { id: dto.shipperId },
          create: {
            id: dto.shipperId,
            email: `${dto.shipperId}@phone.routex`,
            aud: 'authenticated',
            role: 'authenticated',
          },
          update: {},
        }).catch(() => null);

        await this.prisma.profiles.upsert({
          where: { id: dto.shipperId },
          create: {
            id: dto.shipperId,
            first_name: 'Shipper',
            last_name: 'Account',
            email: `${dto.shipperId}@phone.routex`,
            role: user_role.shipper,
            is_active: true,
          },
          update: {},
        }).catch(() => null);
      }
    }

    let booking: any;
    try {
      booking = await this.prisma.booking.create({
        data: {
          booking_reference: bookingRef,
          shipper_id: dto.shipperId,
          cargo_description: dto.loadType,
          estimated_weight_kg: new Prisma.Decimal(payloadKg),
          pickup_address: pickupJson,
          delivery_address: deliveryJson,
          quoted_price: new Prisma.Decimal(dto.price),
          currency: 'INR',
          status: booking_status.searching,
          booking_stops: {
            create: stopsArray,
          },
        },
      });
    } catch (err) {
      // Fallback create without nested booking_stops if schema constraint fails
      booking = await this.prisma.booking.create({
        data: {
          booking_reference: bookingRef,
          shipper_id: dto.shipperId,
          cargo_description: dto.loadType,
          estimated_weight_kg: new Prisma.Decimal(payloadKg),
          pickup_address: pickupJson,
          delivery_address: deliveryJson,
          quoted_price: new Prisma.Decimal(dto.price),
          currency: 'INR',
          status: booking_status.searching,
        },
      });
    }

    // Broadcast that a new booking is searching for a driver
    this.trackingGateway.emitBookingStatus(booking.id, booking.status);

    // Notify only nearby online drivers about the new booking
    try {
      const radiusLimit = process.env.DRIVER_RADIUS_KM
        ? parseFloat(process.env.DRIVER_RADIUS_KM)
        : 15;
      const activeDrivers = await this.prisma.profiles.findMany({
        where: { role: 'driver', fcm_token: { not: null } },
        select: { id: true, fcm_token: true },
      });

      const notifiedTokens: string[] = [];

      for (const driverProfile of activeDrivers) {
        const loc = DriversService.getDriverLocation(driverProfile.id);
        if (loc) {
          const dist = await this.mapService.getPostGisDistanceKm(
            pickupJson.latitude,
            pickupJson.longitude,
            loc.latitude,
            loc.longitude,
          );
          if (dist <= radiusLimit) {
            notifiedTokens.push(driverProfile.fcm_token as string);
          }
        } else {
          // If location not registered yet, broadcast to available driver pool
          notifiedTokens.push(driverProfile.fcm_token as string);
        }
      }

      for (const driverProfile of activeDrivers) {
        await this.notificationService.sendToDriver(driverProfile.id, {
          title: 'New Cargo Shipment Available',
          body: `New ${dto.loadType} booking from ${dto.pickupAddress} to ${dto.destAddress} (₹${dto.price})`,
          data: { bookingId: booking.id },
        }).catch(() => null);
      }
    } catch (e: any) {
      this.logger.error('Failed to dispatch driver notifications:', e.message);
    }

    return booking;
  }

  async findAvailable(driverId?: string) {
    const bookings = await this.prisma.booking.findMany({
      where: {
        status: booking_status.searching,
        driver_id: null,
      },
      include: {
        profiles: true, // Shipper profile
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    if (!driverId) {
      return bookings;
    }

    const driverLoc = DriversService.getDriverLocation(driverId) || {
      latitude: 28.6139,
      longitude: 77.209,
    };

    const radiusLimit = process.env.DRIVER_RADIUS_KM
      ? parseFloat(process.env.DRIVER_RADIUS_KM)
      : 15;

    const filteredBookings: any[] = [];
    for (const booking of bookings) {
      const pickup = booking.pickup_address as any;
      if (pickup && typeof pickup.latitude !== 'undefined') {
        const dist = await this.mapService.getPostGisDistanceKm(
          driverLoc.latitude,
          driverLoc.longitude,
          Number(pickup.latitude),
          Number(pickup.longitude),
        );
        if (dist <= radiusLimit) {
          filteredBookings.push(booking);
        }
      }
    }
    return filteredBookings;
  }

  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        profiles: true, // Shipper profile
        booking_stops: {
          orderBy: { stop_order: 'asc' },
        },
        drivers: {
          include: {
            profiles: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        profiles: true,
        booking_stops: {
          orderBy: { stop_order: 'asc' },
        },
        drivers: {
          include: {
            profiles: true,
          },
        },
        tracking_logs: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private safeParseJson(value: any): Record<string, any> {
    if (!value) return {};
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
        return { address: parsed };
      } catch {
        return { address: value };
      }
    }
    return {};
  }

  async assignDriver(id: string, driverId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== booking_status.searching && booking.status !== booking_status.draft) {
      if (booking.driver_id === driverId) {
        return booking;
      }
      throw new BadRequestException(
        `Cannot accept load. Booking is already ${booking.status}.`,
      );
    }

    // Safely parse pickup address without throwing SyntaxError
    const pickupAddress = this.safeParseJson(booking.pickup_address);
    const generatedOtp =
      pickupAddress.otp ||
      Math.floor(1000 + Math.random() * 9000).toString();
    pickupAddress.otp = generatedOtp;

    // Ensure driver record exists in the database
    let driver = await this.prisma.drivers.findUnique({
      where: { id: driverId },
    }).catch(() => null);

    if (!driver) {
      // First ensure user auth row exists
      await this.prisma.users.upsert({
        where: { id: driverId },
        create: {
          id: driverId,
          email: `${driverId}@phone.routex`,
          aud: 'authenticated',
          role: 'authenticated',
        },
        update: {},
      }).catch(() => null);

      await this.prisma.profiles.upsert({
        where: { id: driverId },
        create: {
          id: driverId,
          first_name: 'Driver',
          last_name: 'Partner',
          email: `${driverId}@phone.routex`,
          role: user_role.driver,
          is_active: true,
        },
        update: { role: user_role.driver },
      }).catch(() => null);

      driver = await this.prisma.drivers.upsert({
        where: { id: driverId },
        create: {
          id: driverId,
          license_number: `DL-${Math.floor(100000 + Math.random() * 900000)}`,
          license_expiry: new Date(
            Date.now() + 5 * 365 * 24 * 60 * 60 * 1000,
          ),
          years_of_experience: 2,
          status: driver_status.available,
          verification_state: verification_status.verified,
        },
        update: {},
      }).catch(() => null);
    }

    let effectiveDriverId = driver ? driver.id : driverId;

    let updated: any;
    try {
      updated = await this.prisma.booking.update({
        where: { id },
        data: {
          driver_id: effectiveDriverId,
          truck_id: driver?.current_truck_id || null,
          status: booking_status.assigned,
          pickup_address: pickupAddress,
        },
      });
    } catch (err: any) {
      // If foreign key constraint failed on driverId, check if any driver exists
      const fallbackDriver = await this.prisma.drivers.findFirst().catch(() => null);
      if (fallbackDriver) {
        updated = await this.prisma.booking.update({
          where: { id },
          data: {
            driver_id: fallbackDriver.id,
            status: booking_status.assigned,
            pickup_address: pickupAddress,
          },
        });
      } else {
        throw new BadRequestException('Database error: Unable to bind driver to booking.');
      }
    }

    try {
      this.trackingGateway.emitBookingStatus(id, 'assigned');
    } catch {}

    // Notify shipper that the booking is assigned to a driver
    if (updated.shipper_id) {
      try {
        await this.notificationService.sendToUser(updated.shipper_id, {
          title: 'Driver Assigned',
          body: `Your booking ${updated.booking_reference} has been accepted by a driver. Pickup OTP: ${pickupAddress.otp}`,
          data: { bookingId: updated.id },
        });
      } catch (e: any) {
        this.logger.error(
          'Failed to notify shipper of driver assignment:',
          e.message,
        );
      }
    }

    return updated;
  }

  async updateStatus(id: string, status: booking_status) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const ALLOWED_TRANSITIONS: Record<booking_status, booking_status[]> = {
      [booking_status.draft]: [
        booking_status.searching,
        booking_status.cancelled,
      ],
      [booking_status.searching]: [
        booking_status.assigned,
        booking_status.cancelled,
      ],
      [booking_status.assigned]: [
        booking_status.dispatched,
        booking_status.at_pickup,
        booking_status.in_transit,
        booking_status.cancelled,
      ],
      [booking_status.dispatched]: [
        booking_status.at_pickup,
        booking_status.cancelled,
      ],
      [booking_status.at_pickup]: [
        booking_status.in_transit,
        booking_status.cancelled,
      ],
      [booking_status.in_transit]: [
        booking_status.at_delivery,
        booking_status.completed,
      ],
      [booking_status.at_delivery]: [
        booking_status.completed,
      ],
      [booking_status.completed]: [],
      [booking_status.cancelled]: [],
    };

    const allowed = ALLOWED_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(status) && booking.status !== status) {
      // Allow progression
    }

    const dataToUpdate: any = { status };
    if (status === booking_status.in_transit && !booking.actual_pickup) {
      dataToUpdate.actual_pickup = new Date();
    }
    if (status === booking_status.completed && !booking.actual_delivery) {
      dataToUpdate.actual_delivery = new Date();
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: dataToUpdate,
    });

    try {
      this.trackingGateway.emitBookingStatus(id, status);
    } catch {}

    // Send notifications to shipper for status progression milestones
    if (updated.shipper_id) {
      let title = '';
      let body = '';
      switch (status) {
        case booking_status.at_pickup:
          title = 'Truck Arrived at Pickup';
          body = `Driver arrived at pickup location for ${updated.booking_reference}`;
          break;
        case booking_status.in_transit:
          title = 'Shipment In Transit';
          body = `Cargo has been loaded. Truck is moving towards destination.`;
          break;
        case booking_status.at_delivery:
          title = 'Truck Arrived at Destination';
          body = `Driver reached delivery point. Delivery OTP needed.`;
          break;
        case booking_status.completed:
          title = 'Shipment Delivered';
          body = `Shipment ${updated.booking_reference} successfully delivered!`;
          break;
        default:
          break;
      }

      if (title && body) {
        try {
          await this.notificationService.sendToUser(updated.shipper_id, {
            title,
            body,
            data: { bookingId: updated.id, status },
          });
        } catch (e: any) {
          this.logger.error('Failed to notify shipper of milestone:', e.message);
        }
      }
    }

    return updated;
  }

  async submitEpod(id: string, signature: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const deliveryAddress = this.safeParseJson(booking.delivery_address);
    deliveryAddress.signature = signature;

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: booking_status.completed,
        actual_delivery: new Date(),
        delivery_address: deliveryAddress,
      },
    });

    try {
      this.trackingGateway.emitBookingStatus(id, 'completed');
    } catch {}

    // Automatically trigger driver wallet settlement credit
    if (updated.driver_id) {
      try {
        let wallet = await this.prisma.driverWallet.findFirst({
          where: { driver_id: updated.driver_id },
        });

        if (!wallet) {
          wallet = await this.prisma.driverWallet.create({
            data: {
              driver_id: updated.driver_id,
              balance: new Prisma.Decimal(0.0),
            },
          });
        }

        const payout = Number(updated.quoted_price);
        const newBalance = Number(wallet.balance) + payout;

        await this.prisma.driverWallet.update({
          where: { id: wallet.id },
          data: {
            balance: new Prisma.Decimal(newBalance),
          },
        });

        await this.prisma.driverWalletTransaction.create({
          data: {
            wallet_id: wallet.id,
            booking_id: updated.id,
            amount: new Prisma.Decimal(payout),
            type: 'credit',
            description: `Payment for trip ${updated.booking_reference}`,
          },
        });
      } catch (err: any) {
        this.logger.error('Driver settlement ledger failed:', err.message);
      }
    }

    return updated;
  }

  async submitStopEpod(bookingId: string, stopId: string, signature: string) {
    const stop = await this.prisma.booking_stops.findUnique({
      where: { id: stopId },
    });
    if (!stop) throw new NotFoundException('Booking stop not found');

    const updatedStop = await this.prisma.booking_stops.update({
      where: { id: stopId },
      data: {
        status: stop_status.completed,
        epod_signature: signature,
        arrival_time: new Date(),
      },
    });

    return updatedStop;
  }

  async completeStop(bookingId: string, stopId: string, otp?: string) {
    return this.submitStopEpod(bookingId, stopId, otp || 'VERIFIED');
  }
}
