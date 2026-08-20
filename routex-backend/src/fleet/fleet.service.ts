import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  vehicle_type,
  vehicle_status,
  driver_status,
  verification_status,
  document_type,
  user_role,
  Prisma,
} from '@prisma/client';
import { randomUUID } from 'crypto';

@Injectable()
export class FleetService {
  constructor(private readonly prisma: PrismaService) {}

  // --- Company Helper ---
  async getOrCreateCompany(ownerId: string) {
    let company = await this.prisma.companies.findFirst({
      where: { owner_id: ownerId },
    });

    if (!company) {
      const profile = await this.prisma.profiles.findUnique({
        where: { id: ownerId },
      });
      const legalName = profile ? `${profile.first_name}'s Transport Logistics` : 'RouteX Logistics Carrier';
      company = await this.prisma.companies.create({
        data: {
          owner_id: ownerId,
          legal_name: legalName,
          company_type: 'carrier',
          verification_state: verification_status.verified,
          is_verified: true,
        },
      });
      
      // Seed initial wallet for company owner if not exists
      const existsWallet = await this.prisma.wallets.findFirst({
        where: { profile_id: ownerId },
      });
      if (!existsWallet) {
        await this.prisma.wallets.create({
          data: {
            profile_id: ownerId,
            balance: 100000.0, // Give them 1,00,000 INR starting capital
            currency: 'INR',
          },
        });
      }
    }
    return company;
  }

  // --- Audit Log Helper ---
  async logActivity(profileId: string, action: string, entityType: string, entityId: string | null, details: any = {}) {
    return this.prisma.activity_logs.create({
      data: {
        profile_id: profileId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details: details as Prisma.InputJsonValue,
      },
    }).catch(err => console.error('Failed to write activity log:', err.message));
  }

  // --- Activity Log Query ---
  async getActivityLogs(ownerId: string, limit = 50) {
    return this.prisma.activity_logs.findMany({
      where: { profile_id: ownerId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  // --- Vehicles (Trucks) CRUD ---
  async getFleetList(ownerId: string) {
    const company = await this.getOrCreateCompany(ownerId);
    return this.prisma.trucks.findMany({
      where: { company_id: company.id, deleted_at: null },
      include: {
        drivers: {
          include: {
            profiles: true,
          },
        },
        vehicle_maintenance: {
          orderBy: { maintenance_date: 'desc' },
          take: 5,
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createTruck(ownerId: string, data: {
    plate_number: string;
    model_name: string;
    brand: string;
    type: vehicle_type;
    payload_capacity_kg: number;
    volumetric_capacity_cft?: number;
    fuel_type?: string;
  }) {
    const company = await this.getOrCreateCompany(ownerId);
    
    // Check duplicate plate number
    const exists = await this.prisma.trucks.findFirst({
      where: { plate_number: data.plate_number, deleted_at: null },
    });
    if (exists) {
      throw new BadRequestException('Plate number already registered');
    }

    const truck = await this.prisma.trucks.create({
      data: {
        company_id: company.id,
        plate_number: data.plate_number,
        model_name: data.model_name,
        brand: data.brand,
        type: data.type,
        payload_capacity_kg: data.payload_capacity_kg,
        volumetric_capacity_cft: data.volumetric_capacity_cft || null,
        fuel_type: data.fuel_type || 'Diesel',
        status: vehicle_status.available,
        is_verified: true,
      },
    });

    await this.logActivity(ownerId, 'CREATE_VEHICLE', 'TRUCK', truck.id, { plate_number: truck.plate_number });
    return truck;
  }

  async updateTruck(ownerId: string, id: string, data: Partial<{
    model_name: string;
    brand: string;
    type: vehicle_type;
    payload_capacity_kg: number;
    volumetric_capacity_cft: number;
    fuel_type: string;
    status: vehicle_status;
  }>) {
    const company = await this.getOrCreateCompany(ownerId);
    const truck = await this.prisma.trucks.findFirst({
      where: { id, company_id: company.id, deleted_at: null },
    });
    if (!truck) throw new NotFoundException('Vehicle not found');

    const updated = await this.prisma.trucks.update({
      where: { id },
      data,
    });

    await this.logActivity(ownerId, 'UPDATE_VEHICLE', 'TRUCK', id, data);
    return updated;
  }

  async deleteTruck(ownerId: string, id: string) {
    const company = await this.getOrCreateCompany(ownerId);
    const truck = await this.prisma.trucks.findFirst({
      where: { id, company_id: company.id, deleted_at: null },
    });
    if (!truck) throw new NotFoundException('Vehicle not found');

    await this.prisma.trucks.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await this.logActivity(ownerId, 'DELETE_VEHICLE', 'TRUCK', id, { plate_number: truck.plate_number });
    return { success: true };
  }

  // --- Drivers CRUD ---
  async getDriversList(ownerId: string) {
    const company = await this.getOrCreateCompany(ownerId);
    return this.prisma.drivers.findMany({
      where: { company_id: company.id, deleted_at: null },
      include: {
        profiles: true,
        trucks: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createDriver(ownerId: string, data: {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    license_number: string;
    license_expiry: string;
    years_of_experience?: number;
  }) {
    const company = await this.getOrCreateCompany(ownerId);

    // Create user profile in profiles schema
    const driverUserId = randomUUID();

    // Check duplicate email or phone
    const exists = await this.prisma.profiles.findFirst({
      where: {
        OR: [
          { email: data.email },
          { phone_number: data.phone_number }
        ]
      }
    });
    if (exists) {
      throw new BadRequestException('Driver email or phone number already registered');
    }

    // Register user in supabase stub users table
    await this.prisma.users.create({
      data: {
        id: driverUserId,
        email: data.email,
        phone: data.phone_number,
        aud: 'authenticated',
        role: 'authenticated',
      },
    });

    // Check if a trigger already auto-provisioned the profile
    let profile = await this.prisma.profiles.findUnique({
      where: { id: driverUserId },
    });

    if (profile) {
      profile = await this.prisma.profiles.update({
        where: { id: driverUserId },
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone_number: data.phone_number,
          role: user_role.driver,
          verification_state: verification_status.verified,
          is_active: true,
        },
      });
    } else {
      profile = await this.prisma.profiles.create({
        data: {
          id: driverUserId,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone_number: data.phone_number,
          role: user_role.driver,
          verification_state: verification_status.verified,
          is_active: true,
        },
      });
    }

    // Create driver record
    const driver = await this.prisma.drivers.create({
      data: {
        id: driverUserId,
        company_id: company.id,
        license_number: data.license_number,
        license_expiry: new Date(data.license_expiry),
        years_of_experience: data.years_of_experience || 0,
        status: driver_status.available,
        verification_state: verification_status.verified,
      },
    });

    // Create driver wallet
    await this.prisma.driverWallet.create({
      data: {
        driver_id: driverUserId,
        balance: 0.0,
      },
    }).catch(err => console.error('Driver wallet provision skipped:', err.message));

    await this.logActivity(ownerId, 'CREATE_DRIVER', 'DRIVER', driverUserId, { name: `${data.first_name} ${data.last_name}` });
    return { ...driver, profiles: profile };
  }

  async updateDriver(ownerId: string, id: string, data: Partial<{
    first_name: string;
    last_name: string;
    license_number: string;
    license_expiry: string;
    years_of_experience: number;
    status: driver_status;
    current_truck_id: string;
  }>) {
    const company = await this.getOrCreateCompany(ownerId);
    const driver = await this.prisma.drivers.findFirst({
      where: { id, company_id: company.id, deleted_at: null },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    // Update profiles part
    if (data.first_name || data.last_name) {
      await this.prisma.profiles.update({
        where: { id },
        data: {
          first_name: data.first_name,
          last_name: data.last_name,
        },
      });
    }

    // Update driver record
    const driverData: any = {};
    if (data.license_number) driverData.license_number = data.license_number;
    if (data.license_expiry) driverData.license_expiry = new Date(data.license_expiry);
    if (data.years_of_experience !== undefined) driverData.years_of_experience = data.years_of_experience;
    if (data.status) driverData.status = data.status;
    if (data.current_truck_id !== undefined) driverData.current_truck_id = data.current_truck_id || null;

    const updated = await this.prisma.drivers.update({
      where: { id },
      data: driverData,
      include: { profiles: true },
    });

    await this.logActivity(ownerId, 'UPDATE_DRIVER', 'DRIVER', id, data);
    return updated;
  }

  async deleteDriver(ownerId: string, id: string) {
    const company = await this.getOrCreateCompany(ownerId);
    const driver = await this.prisma.drivers.findFirst({
      where: { id, company_id: company.id, deleted_at: null },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    await this.prisma.drivers.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await this.logActivity(ownerId, 'DELETE_DRIVER', 'DRIVER', id, { license_number: driver.license_number });
    return { success: true };
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

    return this.prisma.drivers.update({
      where: { id: driverProfileId },
      data: {
        current_truck_id: vehicleId,
      },
    });
  }

  // --- Document Vault CRUD ---
  async getDocuments(ownerId: string, truckId?: string, profileId?: string) {
    const company = await this.getOrCreateCompany(ownerId);
    const filter: Prisma.documentsWhereInput = {
      company_id: company.id,
      deleted_at: null,
    };
    if (truckId) filter.truck_id = truckId;
    if (profileId) filter.profile_id = profileId;

    return this.prisma.documents.findMany({
      where: filter,
      include: {
        trucks: true,
        profiles: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async createDocument(ownerId: string, data: {
    type: document_type;
    document_number: string;
    file_url: string;
    expiry_date?: string;
    truck_id?: string;
    profile_id?: string;
  }) {
    const company = await this.getOrCreateCompany(ownerId);

    const doc = await this.prisma.documents.create({
      data: {
        company_id: company.id,
        type: data.type,
        document_number: data.document_number,
        file_url: data.file_url,
        expiry_date: data.expiry_date ? new Date(data.expiry_date) : null,
        truck_id: data.truck_id || null,
        profile_id: data.profile_id || null,
        status: verification_status.verified, // Auto-approve during testing
      },
    });

    await this.logActivity(ownerId, 'CREATE_DOCUMENT', 'DOCUMENT', doc.id, { type: data.type, number: data.document_number });
    return doc;
  }

  async deleteDocument(ownerId: string, id: string) {
    const company = await this.getOrCreateCompany(ownerId);
    const doc = await this.prisma.documents.findFirst({
      where: { id, company_id: company.id, deleted_at: null },
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.documents.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    await this.logActivity(ownerId, 'DELETE_DOCUMENT', 'DOCUMENT', id, { number: doc.document_number });
    return { success: true };
  }

  // --- Maintenance, Fuel, & Tyre logs ---
  async getMaintenanceLogs(ownerId: string, truckId?: string) {
    const company = await this.getOrCreateCompany(ownerId);
    const filter: Prisma.vehicle_maintenanceWhereInput = {
      truck: { company_id: company.id },
    };
    if (truckId) filter.truck_id = truckId;

    return this.prisma.vehicle_maintenance.findMany({
      where: filter,
      include: { truck: true },
      orderBy: { maintenance_date: 'desc' },
    });
  }

  async createMaintenanceLog(ownerId: string, data: {
    truck_id: string;
    description: string;
    cost: number;
    maintenance_date: string;
    status: string;
    odometer: number;
  }) {
    const company = await this.getOrCreateCompany(ownerId);
    const truck = await this.prisma.trucks.findFirst({
      where: { id: data.truck_id, company_id: company.id },
    });
    if (!truck) throw new NotFoundException('Vehicle not found under your company');

    const log = await this.prisma.vehicle_maintenance.create({
      data: {
        truck_id: data.truck_id,
        description: data.description,
        cost: new Prisma.Decimal(data.cost),
        maintenance_date: new Date(data.maintenance_date),
        status: data.status,
        odometer: data.odometer,
      },
    });

    await this.logActivity(ownerId, 'CREATE_MAINTENANCE', 'VEHICLE_MAINTENANCE', log.id, { cost: data.cost });
    return log;
  }

  async getFuelLogs(ownerId: string, truckId?: string) {
    const company = await this.getOrCreateCompany(ownerId);
    const filter: Prisma.fuel_entriesWhereInput = {
      truck: { company_id: company.id },
    };
    if (truckId) filter.truck_id = truckId;

    return this.prisma.fuel_entries.findMany({
      where: filter,
      include: {
        truck: true,
      },
      orderBy: { fuel_date: 'desc' },
    });
  }

  async createFuelLog(ownerId: string, data: {
    truck_id: string;
    fuel_quantity_liters: number;
    cost: number;
    odometer: number;
    fuel_date: string;
    location?: string;
  }) {
    const company = await this.getOrCreateCompany(ownerId);
    const truck = await this.prisma.trucks.findFirst({
      where: { id: data.truck_id, company_id: company.id },
    });
    if (!truck) throw new NotFoundException('Vehicle not found under your company');

    const log = await this.prisma.fuel_entries.create({
      data: {
        truck_id: data.truck_id,
        fuel_quantity_liters: new Prisma.Decimal(data.fuel_quantity_liters),
        cost: new Prisma.Decimal(data.cost),
        odometer: data.odometer,
        fuel_date: new Date(data.fuel_date),
        location: data.location || null,
      },
    });

    await this.logActivity(ownerId, 'CREATE_FUEL_ENTRY', 'FUEL_ENTRIES', log.id, { cost: data.cost, liters: data.fuel_quantity_liters });
    return log;
  }

  async getTyreLogs(ownerId: string, truckId?: string) {
    const company = await this.getOrCreateCompany(ownerId);
    const filter: Prisma.tyre_entriesWhereInput = {
      truck: { company_id: company.id },
    };
    if (truckId) filter.truck_id = truckId;

    return this.prisma.tyre_entries.findMany({
      where: filter,
      include: { truck: true },
      orderBy: { install_date: 'desc' },
    });
  }

  async createTyreLog(ownerId: string, data: {
    truck_id: string;
    serial_number: string;
    position: string;
    status: string;
    install_date: string;
    install_odometer: number;
  }) {
    const company = await this.getOrCreateCompany(ownerId);
    const truck = await this.prisma.trucks.findFirst({
      where: { id: data.truck_id, company_id: company.id },
    });
    if (!truck) throw new NotFoundException('Vehicle not found under your company');

    const log = await this.prisma.tyre_entries.create({
      data: {
        truck_id: data.truck_id,
        serial_number: data.serial_number,
        position: data.position,
        status: data.status,
        install_date: new Date(data.install_date),
        install_odometer: data.install_odometer,
      },
    });

    await this.logActivity(ownerId, 'CREATE_TYRE_ENTRY', 'TYRE_ENTRIES', log.id, { position: data.position, serial: data.serial_number });
    return log;
  }

  // --- Bookings / Shipments for Carrier ---
  async getCarrierBookings(ownerId: string) {
    const company = await this.getOrCreateCompany(ownerId);
    return this.prisma.booking.findMany({
      where: { company_id: company.id },
      include: {
        drivers: { include: { profiles: true } },
        trucks: true,
        booking_stops: { orderBy: { stop_order: 'asc' } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // --- Wallet, Invoices & Payouts ---
  async getWalletBalance(ownerId: string) {
    await this.getOrCreateCompany(ownerId);
    const wallet = await this.prisma.wallets.findUnique({
      where: { profile_id: ownerId },
    });
    return { balance: wallet ? Number(wallet.balance) : 0 };
  }

  async getTransactions(ownerId: string) {
    const wallet = await this.prisma.wallets.findUnique({
      where: { profile_id: ownerId },
    });
    if (!wallet) return [];

    return this.prisma.payment.findMany({
      where: { wallet_id: wallet.id },
      include: { bookings: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async requestPayout(ownerId: string, amount: number) {
    await this.getOrCreateCompany(ownerId);
    const wallet = await this.prisma.wallets.findUnique({
      where: { profile_id: ownerId },
    });
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const newBalance = Number(wallet.balance) - amount;
    await this.prisma.wallets.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    const payment = await this.prisma.payment.create({
      data: {
        wallet_id: wallet.id,
        amount: new Prisma.Decimal(amount),
        currency: 'INR',
        method: 'net_banking',
        status: 'completed',
        gateway_transaction_id: 'POUT_' + Math.random().toString(36).substring(2, 12).toUpperCase(),
      },
    });

    await this.logActivity(ownerId, 'WALLET_PAYOUT', 'PAYMENT', payment.id, { amount });
    return { success: true, balance: newBalance };
  }
}
