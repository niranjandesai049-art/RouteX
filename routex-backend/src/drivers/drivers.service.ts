import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  verification_status,
  driver_status,
  document_type,
  booking_status,
} from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class DriversService {
  // In-memory registry to store the latest coordinates of all drivers
  static driverLocations = new Map<
    string,
    {
      latitude: number;
      longitude: number;
      heading?: number;
      speed?: number;
      last_updated_at: Date;
    }
  >();

  static getDriverLocation(driverId: string) {
    return this.driverLocations.get(driverId) || null;
  }

  static getAllDriverLocations() {
    return Array.from(this.driverLocations.entries()).map(
      ([driverId, loc]) => ({
        driverId,
        ...loc,
      }),
    );
  }

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const driver = await this.prisma.drivers.findUnique({
      where: { id: userId },
      include: { profiles: true, trucks: true },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');
    return driver;
  }

  async toggleOnline(userId: string, isOnline: boolean) {
    const driver = await this.prisma.drivers.findUnique({
      where: { id: userId },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');

    const status = isOnline ? driver_status.available : driver_status.off_duty;

    return this.prisma.drivers.update({
      where: { id: userId },
      data: { status },
    });
  }

  async updateLocation(userId: string, lat: number, lng: number) {
    // Update central static in-memory registry
    DriversService.driverLocations.set(userId, {
      latitude: lat,
      longitude: lng,
      last_updated_at: new Date(),
    });

    const driver = await this.prisma.drivers.findUnique({
      where: { id: userId },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');

    // Find any active booking for this driver to log GPS track
    const activeBooking = await this.prisma.booking.findFirst({
      where: {
        driver_id: userId,
        status: {
          in: [
            booking_status.assigned,
            booking_status.dispatched,
            booking_status.at_pickup,
            booking_status.in_transit,
            booking_status.at_delivery,
          ],
        },
      },
    });

    if (activeBooking) {
      // Upsert live GPS state
      await this.prisma.live_gps_states.upsert({
        where: { booking_id: activeBooking.id },
        update: {
          latitude: new Prisma.Decimal(lat),
          longitude: new Prisma.Decimal(lng),
          last_updated_at: new Date(),
        },
        create: {
          booking_id: activeBooking.id,
          driver_id: userId,
          latitude: new Prisma.Decimal(lat),
          longitude: new Prisma.Decimal(lng),
        },
      });

      // Insert tracking log
      await this.prisma.trackingLog.create({
        data: {
          booking_id: activeBooking.id,
          driver_id: userId,
          latitude: new Prisma.Decimal(lat),
          longitude: new Prisma.Decimal(lng),
        },
      });
    }

    return { success: true, activeBookingId: activeBooking?.id || null };
  }

  async updateDocuments(userId: string, licenseNo: string, aadhaarNo: string) {
    const driver = await this.prisma.drivers.findUnique({
      where: { id: userId },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');

    // Update license number on driver record
    await this.prisma.drivers.update({
      where: { id: userId },
      data: {
        license_number: licenseNo,
        verification_state: verification_status.under_review,
      },
    });

    // Upsert driving license document
    const dlDoc = await this.prisma.documents.findFirst({
      where: { profile_id: userId, type: document_type.driving_license },
    });
    if (dlDoc) {
      await this.prisma.documents.update({
        where: { id: dlDoc.id },
        data: {
          document_number: licenseNo,
          status: verification_status.pending,
        },
      });
    } else {
      await this.prisma.documents.create({
        data: {
          profile_id: userId,
          type: document_type.driving_license,
          document_number: licenseNo,
          file_url: 'https://routex-bucket.s3.amazonaws.com/documents/dl.png',
          status: verification_status.pending,
        },
      });
    }

    // Upsert aadhaar document
    const aadhaarDoc = await this.prisma.documents.findFirst({
      where: { profile_id: userId, type: document_type.aadhaar },
    });
    if (aadhaarDoc) {
      await this.prisma.documents.update({
        where: { id: aadhaarDoc.id },
        data: {
          document_number: aadhaarNo,
          status: verification_status.pending,
        },
      });
    } else {
      await this.prisma.documents.create({
        data: {
          profile_id: userId,
          type: document_type.aadhaar,
          document_number: aadhaarNo,
          file_url:
            'https://routex-bucket.s3.amazonaws.com/documents/aadhaar.png',
          status: verification_status.pending,
        },
      });
    }

    return { success: true };
  }
}
