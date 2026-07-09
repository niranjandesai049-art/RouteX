import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { verification_status } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findOne(id: string) {
    const user = await this.prisma.profiles.findUnique({
      where: { id },
      include: { drivers: true, companies: true, wallets: true },
    });
    if (!user) throw new NotFoundException('User profile not found');
    return user;
  }

  async getProfile(id: string) {
    const profile = await this.prisma.profiles.findUnique({
      where: { id },
      include: {
        drivers: {
          include: {
            trucks: true,
          },
        },
      },
    });
    if (!profile) throw new NotFoundException('User profile not found');
    const driver = profile.drivers;
    return {
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      email: profile.email,
      phone: profile.phone_number,
      license_number: driver?.license_number || 'DL-PENDING',
      experience_years: driver?.years_of_experience || 0,
      status: driver?.status || 'available',
      vehicle: driver?.trucks || null,
    };
  }

  async findAll() {
    return this.prisma.profiles.findMany({
      include: { drivers: true, companies: true },
    });
  }

  async updateKycStatus(id: string, isVerified: boolean) {
    const user = await this.prisma.profiles.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User profile not found');

    const status = isVerified
      ? verification_status.verified
      : verification_status.rejected;

    return this.prisma.profiles.update({
      where: { id },
      data: { verification_state: status },
    });
  }

  async updateFcmToken(id: string, fcmToken: string) {
    const user = await this.prisma.profiles.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User profile not found');

    return this.prisma.profiles.update({
      where: { id },
      data: { fcm_token: fcmToken },
    });
  }
}
