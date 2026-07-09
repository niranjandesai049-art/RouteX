import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  async getFleetList(ownerId: string) {
    // Look up the company owned by this fleet owner
    const company = await this.prisma.companies.findFirst({
      where: { owner_id: ownerId },
    });

    if (!company) {
      // Return empty if no company exists yet for this owner
      return [];
    }

    // Find all trucks registered under this company
    return this.prisma.trucks.findMany({
      where: { company_id: company.id },
      include: {
        drivers: {
          include: {
            profiles: true,
          },
        },
      },
    });
  }

  async assignDriver(vehicleId: string, driverProfileId: string) {
    const truck = await this.prisma.trucks.findUnique({
      where: { id: vehicleId },
    });
    if (!truck) throw new NotFoundException('Truck not found');

    const driver = await this.prisma.drivers.findUnique({
      where: { id: driverProfileId },
    });
    if (!driver) throw new NotFoundException('Driver profile not found');

    // Link vehicle to driver in the drivers table
    return this.prisma.drivers.update({
      where: { id: driverProfileId },
      data: {
        current_truck_id: vehicleId,
      },
    });
  }
}
