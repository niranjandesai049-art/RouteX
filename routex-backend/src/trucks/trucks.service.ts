import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  vehicle_type,
  vehicle_status,
  document_type,
  verification_status,
} from '@prisma/client';

@Injectable()
export class TrucksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ownerId: string,
    data: {
      rcNo: string;
      insuranceNo: string;
      category: string;
      capacityTons: number;
      fastagId?: string;
    },
  ) {
    // Look up the company owned by this user
    const company = await this.prisma.companies.findFirst({
      where: { owner_id: ownerId },
    });

    // Parse category string to vehicle_type enum
    let truckType: vehicle_type = vehicle_type.container;
    const cat = data.category.toLowerCase();
    if (cat.includes('mini') || cat.includes('ace')) {
      truckType = vehicle_type.mini_truck;
    } else if (cat.includes('open')) {
      truckType = vehicle_type.open_body;
    } else if (cat.includes('trailer')) {
      truckType = vehicle_type.trailer;
    } else if (cat.includes('tanker')) {
      truckType = vehicle_type.tanker;
    } else if (cat.includes('reefer')) {
      truckType = vehicle_type.reefer;
    }

    const payloadKg = Math.round(data.capacityTons * 1000);

    const truck = await this.prisma.trucks.create({
      data: {
        company_id: company?.id || null,
        plate_number: data.rcNo,
        model_name: 'Premium Hauler',
        brand: 'Tata Motors',
        type: truckType,
        payload_capacity_kg: payloadKg,
        fuel_type: 'Diesel',
        status: vehicle_status.available,
        is_verified: true,
      },
    });

    // Create a truck RC document
    await this.prisma.documents.create({
      data: {
        truck_id: truck.id,
        type: document_type.truck_rc,
        document_number: data.rcNo,
        file_url: 'https://routex-bucket.s3.amazonaws.com/documents/rc.png',
        status: verification_status.verified,
      },
    });

    // Create a truck insurance document
    await this.prisma.documents.create({
      data: {
        truck_id: truck.id,
        type: document_type.truck_insurance,
        document_number: data.insuranceNo,
        file_url:
          'https://routex-bucket.s3.amazonaws.com/documents/insurance.png',
        status: verification_status.verified,
      },
    });

    return truck;
  }

  async findAll() {
    return this.prisma.trucks.findMany({
      include: { companies: true, drivers: true },
    });
  }

  async findOne(id: string) {
    const truck = await this.prisma.trucks.findUnique({
      where: { id },
      include: { companies: true, drivers: true },
    });
    if (!truck) throw new NotFoundException('Truck not found');
    return truck;
  }
}
