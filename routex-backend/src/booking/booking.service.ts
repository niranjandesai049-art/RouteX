import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  booking_status,
  payment_method,
  payment_status,
  stop_type,
  stop_status,
  Prisma,
} from '@prisma/client';
import { TrackingGateway } from '../tracking/tracking.gateway';
import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { NotificationService } from '../firebase/notification.service';
import { MapService } from '../map/map.service';
import { DriversService } from '../drivers/drivers.service';

export class CreateBookingDto {
  @IsNotEmpty()
  @IsString()
  shipperId: string;

  @IsNotEmpty()
  @IsString()
  pickupAddress: string;

  @IsNotEmpty()
  @IsString()
  destAddress: string;

  waypoints?: string[];

  @IsNotEmpty()
  @IsNumber()
  distanceKm: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.1)
  weightTons: number;

  @IsNotEmpty()
  @IsString()
  truckCategory: string;

  @IsNotEmpty()
  @IsString()
  loadType: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;
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
    const bookingRef = `TX-${Math.floor(100000 + Math.random() * 900000)}`;

    const pickupLoc = await this.mapService.geocode(dto.pickupAddress);
    const pickupJson = {
      address: dto.pickupAddress,
      latitude: pickupLoc?.latitude || 28.6139, // Default Delhi coordinate
      longitude: pickupLoc?.longitude || 77.209,
      otp: Math.floor(1000 + Math.random() * 9000).toString(), // Save pickup OTP in JSON
    };

    const deliveryLoc = await this.mapService.geocode(dto.destAddress);
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
      latitude: pickupJson.latitude,
      longitude: pickupJson.longitude,
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
          latitude: wpLoc?.latitude || pickupJson.latitude,
          longitude: wpLoc?.longitude || pickupJson.longitude,
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
      latitude: deliveryJson.latitude,
      longitude: deliveryJson.longitude,
      otp: deliveryJson.otp,
      status: stop_status.pending,
    });

    const booking = await this.prisma.booking.create({
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
            if (driverProfile.fcm_token) {
              notifiedTokens.push(driverProfile.fcm_token);
            }
          }
        }
      }

      if (notifiedTokens.length > 0) {
        await this.notificationService.sendMulticast(notifiedTokens, {
          title: 'New Booking Available',
          body: `Load ${booking.booking_reference} is looking for a driver from ${dto.pickupAddress} to ${dto.destAddress}.`,
          data: { bookingId: booking.id },
        });
      }
    } catch (e: any) {
      this.logger.error('Failed to notify drivers of new booking:', e.message);
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

  async assignDriver(id: string, driverId: string) {
    // Find driver to get their current vehicle
    const driver = await this.prisma.drivers.findUnique({
      where: { id: driverId },
    });

    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status !== booking_status.searching) {
      throw new BadRequestException(
        `Cannot assign driver. Booking status is ${booking.status}, expected searching.`,
      );
    }

    const pickupAddress =
      typeof booking.pickup_address === 'string'
        ? JSON.parse(booking.pickup_address)
        : (booking.pickup_address as any) || {};

    // Generate random 4-digit OTP
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    pickupAddress.otp = generatedOtp;

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        driver_id: driverId,
        truck_id: driver?.current_truck_id || null,
        status: booking_status.assigned,
        pickup_address: pickupAddress,
      },
    });

    this.trackingGateway.emitBookingStatus(id, 'assigned');

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
        booking_status.cancelled,
      ],
      [booking_status.at_delivery]: [
        booking_status.completed,
        booking_status.cancelled,
      ],
      [booking_status.completed]: [],
      [booking_status.cancelled]: [],
    };

    const allowed = ALLOWED_TRANSITIONS[booking.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition from ${booking.status} to ${status}`,
      );
    }

    const updateData: Prisma.BookingUpdateInput = { status };
    if (status === booking_status.in_transit) {
      updateData.actual_pickup = new Date();
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: updateData,
    });

    this.trackingGateway.emitBookingStatus(id, status);

    // Notify shipper on key status transitions
    if (updated.shipper_id) {
      try {
        if (status === booking_status.at_pickup) {
          await this.notificationService.sendToUser(updated.shipper_id, {
            title: 'Driver Arrived',
            body: `Driver has arrived at the pickup location for booking ${updated.booking_reference}.`,
            data: { bookingId: updated.id },
          });
        } else if (status === booking_status.in_transit) {
          await this.notificationService.sendToUser(updated.shipper_id, {
            title: 'Shipment In Transit',
            body: `Pickup OTP verified. Your shipment ${updated.booking_reference} is now in transit.`,
            data: { bookingId: updated.id },
          });
        } else if (status === booking_status.at_delivery) {
          await this.notificationService.sendToUser(updated.shipper_id, {
            title: 'Driver Arrived at Destination',
            body: `Driver has arrived at the delivery location for booking ${updated.booking_reference}.`,
            data: { bookingId: updated.id },
          });
        } else if (status === booking_status.cancelled) {
          await this.notificationService.sendToUser(updated.shipper_id, {
            title: 'Shipment Cancelled',
            body: `Your shipment ${updated.booking_reference} has been cancelled.`,
            data: { bookingId: updated.id },
          });
        }
      } catch (e: any) {
        this.logger.error(
          `Failed to notify shipper on status update to ${status}:`,
          e.message,
        );
      }
    }

    return updated;
  }

  async submitEpod(id: string, signature: string) {
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id },
      });

      if (!booking) throw new NotFoundException('Booking not found');

      // Append signature to delivery address JSON
      const deliveryAddressObj: any = booking.delivery_address || {};
      deliveryAddressObj.signature = signature;

      // Update booking status to completed
      const updatedBooking = await tx.booking.update({
        where: { id },
        data: {
          delivery_address: deliveryAddressObj,
          status: booking_status.completed,
          actual_delivery: new Date(),
        },
      });

      if (!booking.shipper_id) {
        throw new BadRequestException(
          'Booking does not have an associated shipper',
        );
      }

      // Find shipper's wallet to debit or create one if missing
      let shipperWallet = await tx.wallets.findFirst({
        where: { profile_id: booking.shipper_id },
      });

      if (!shipperWallet) {
        shipperWallet = await tx.wallets.create({
          data: {
            profile_id: booking.shipper_id,
            balance: new Prisma.Decimal(100000.0),
            currency: 'INR',
            is_frozen: false,
          },
        });
      }

      if (shipperWallet.is_frozen) {
        throw new BadRequestException('Shipper wallet is frozen');
      }

      if (Number(shipperWallet.balance) < Number(booking.quoted_price)) {
        shipperWallet = await tx.wallets.update({
          where: { id: shipperWallet.id },
          data: {
            balance: new Prisma.Decimal(
              Number(shipperWallet.balance) + 100000.0,
            ),
          },
        });
      }

      await tx.wallets.update({
        where: { id: shipperWallet.id },
        data: {
          balance: {
            decrement: booking.quoted_price,
          },
        },
      });

      // Credit to driver's dedicated DriverWallet (minus a 5% commission)
      if (booking.driver_id) {
        const commissionRate = 0.05;
        const commissionAmount = booking.quoted_price.mul(commissionRate);
        const payoutAmount = booking.quoted_price.sub(commissionAmount);

        let driverWallet = await tx.driverWallet.findUnique({
          where: { driver_id: booking.driver_id },
        });

        if (!driverWallet) {
          driverWallet = await tx.driverWallet.create({
            data: {
              driver_id: booking.driver_id,
              balance: 0.0,
              currency: 'INR',
              is_active: true,
            },
          });
        }

        await tx.driverWallet.update({
          where: { id: driverWallet.id },
          data: {
            balance: {
              increment: payoutAmount,
            },
          },
        });

        await tx.driverWalletTransaction.create({
          data: {
            wallet_id: driverWallet.id,
            amount: payoutAmount,
            type: 'credit',
            description: `Earnings from booking completion: ${booking.booking_reference}`,
            booking_id: booking.id,
          },
        });
      }

      // Record transaction ledger entry
      await tx.payment.create({
        data: {
          booking_id: id,
          wallet_id: shipperWallet?.id || null,
          amount: booking.quoted_price,
          currency: 'INR',
          method: payment_method.wallet,
          status: payment_status.completed,
        },
      });

      return updatedBooking;
    });

    this.trackingGateway.emitBookingStatus(id, 'completed');

    // Notify shipper: Shipment Delivered
    if (result.shipper_id) {
      try {
        await this.notificationService.sendToUser(result.shipper_id, {
          title: 'Shipment Delivered',
          body: `Your shipment ${result.booking_reference} has been delivered successfully.`,
          data: { bookingId: result.id },
        });

        // Notify shipper: Payment Successful
        await this.notificationService.sendToUser(result.shipper_id, {
          title: 'Payment Successful',
          body: `₹${result.quoted_price} has been deducted from your wallet for booking ${result.booking_reference}.`,
          data: { bookingId: result.id },
        });
      } catch (e: any) {
        this.logger.error(
          'Failed to notify shipper on delivery/payment:',
          e.message,
        );
      }
    }

    // Notify driver: Wallet Credited
    if (result.driver_id) {
      try {
        const commissionRate = 0.05;
        const payout = Number(result.quoted_price) * (1 - commissionRate);
        await this.notificationService.sendToDriver(result.driver_id, {
          title: 'Wallet Credited',
          body: `₹${payout.toFixed(2)} has been credited to your wallet for completing booking ${result.booking_reference}.`,
          data: { bookingId: result.id },
        });
      } catch (e: any) {
        this.logger.error(
          'Failed to notify driver on wallet credit:',
          e.message,
        );
      }
    }
    return result;
  }

  async completeStop(bookingId: string, stopId: string, otp: string) {
    const stop = await this.prisma.booking_stops.findUnique({
      where: { id: stopId },
    });

    if (!stop) throw new NotFoundException('Stop not found');
    if (stop.booking_id !== bookingId) {
      throw new BadRequestException('Stop does not belong to this booking');
    }

    if (stop.otp && stop.otp !== otp) {
      throw new BadRequestException('Invalid OTP for this stop');
    }

    const updated = await this.prisma.booking_stops.update({
      where: { id: stopId },
      data: {
        status: stop_status.completed,
        arrival_time: stop.arrival_time || new Date(),
        departure_time: new Date(),
      },
    });

    this.trackingGateway.emitBookingStatus(
      bookingId,
      `waypoint_completed:${stop.stop_order}`,
    );
    return updated;
  }
}
