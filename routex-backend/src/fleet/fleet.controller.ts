import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { FleetService } from './fleet.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  user_role,
  vehicle_type,
  vehicle_status,
  driver_status,
  document_type,
} from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
  ApiQuery,
} from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  Min,
  IsEmail,
} from 'class-validator';

// --- DTO Definitions ---

class AssignDriverDto {
  @ApiProperty({ example: 'v-101-uuid' })
  @IsNotEmpty()
  @IsString()
  vehicleId: string;

  @ApiProperty({ example: 'd-202-uuid' })
  @IsNotEmpty()
  @IsString()
  driverProfileId: string;
}

class CreateTruckDto {
  @ApiProperty({ example: 'MH-12-QW-3456' })
  @IsNotEmpty()
  @IsString()
  plate_number: string;

  @ApiProperty({ example: 'Tata LPT 1109' })
  @IsNotEmpty()
  @IsString()
  model_name: string;

  @ApiProperty({ example: 'Tata' })
  @IsNotEmpty()
  @IsString()
  brand: string;

  @ApiProperty({ enum: vehicle_type, example: vehicle_type.container })
  @IsNotEmpty()
  @IsEnum(vehicle_type)
  type: vehicle_type;

  @ApiProperty({ example: 7500 })
  @IsNotEmpty()
  @IsNumber()
  @Min(1)
  payload_capacity_kg: number;

  @ApiProperty({ example: 450.5, required: false })
  @IsOptional()
  @IsNumber()
  volumetric_capacity_cft?: number;

  @ApiProperty({ example: 'Diesel', required: false })
  @IsOptional()
  @IsString()
  fuel_type?: string;
}

class UpdateTruckDto {
  @ApiProperty({ example: 'Tata LPT 1109', required: false })
  @IsOptional()
  @IsString()
  model_name?: string;

  @ApiProperty({ example: 'Tata', required: false })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiProperty({ enum: vehicle_type, required: false })
  @IsOptional()
  @IsEnum(vehicle_type)
  type?: vehicle_type;

  @ApiProperty({ example: 7500, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  payload_capacity_kg?: number;

  @ApiProperty({ example: 450.5, required: false })
  @IsOptional()
  @IsNumber()
  volumetric_capacity_cft?: number;

  @ApiProperty({ example: 'Diesel', required: false })
  @IsOptional()
  @IsString()
  fuel_type?: string;

  @ApiProperty({ enum: vehicle_status, required: false })
  @IsOptional()
  @IsEnum(vehicle_status)
  status?: vehicle_status;
}

class CreateDriverDto {
  @ApiProperty({ example: 'Ramesh' })
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @ApiProperty({ example: 'Kumar' })
  @IsNotEmpty()
  @IsString()
  last_name: string;

  @ApiProperty({ example: 'ramesh@carrier.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: '9999955555' })
  @IsNotEmpty()
  @IsString()
  phone_number: string;

  @ApiProperty({ example: 'DL-IND992837' })
  @IsNotEmpty()
  @IsString()
  license_number: string;

  @ApiProperty({ example: '2030-12-31' })
  @IsNotEmpty()
  @IsString()
  license_expiry: string;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  years_of_experience?: number;
}

class UpdateDriverDto {
  @ApiProperty({ example: 'Ramesh', required: false })
  @IsOptional()
  @IsString()
  first_name?: string;

  @ApiProperty({ example: 'Kumar', required: false })
  @IsOptional()
  @IsString()
  last_name?: string;

  @ApiProperty({ example: 'DL-IND992837', required: false })
  @IsOptional()
  @IsString()
  license_number?: string;

  @ApiProperty({ example: '2030-12-31', required: false })
  @IsOptional()
  @IsString()
  license_expiry?: string;

  @ApiProperty({ example: 5, required: false })
  @IsOptional()
  @IsNumber()
  years_of_experience?: number;

  @ApiProperty({ enum: driver_status, required: false })
  @IsOptional()
  @IsEnum(driver_status)
  status?: driver_status;

  @ApiProperty({ example: 'v-101-uuid', required: false })
  @IsOptional()
  @IsString()
  current_truck_id?: string;
}

class CreateDocumentDto {
  @ApiProperty({ enum: document_type, example: document_type.truck_rc })
  @IsNotEmpty()
  @IsEnum(document_type)
  type: document_type;

  @ApiProperty({ example: 'RC-992837482' })
  @IsNotEmpty()
  @IsString()
  document_number: string;

  @ApiProperty({ example: 'https://supabase.co/storage/rc.pdf' })
  @IsNotEmpty()
  @IsString()
  file_url: string;

  @ApiProperty({ example: '2028-06-30', required: false })
  @IsOptional()
  @IsString()
  expiry_date?: string;

  @ApiProperty({ example: 'v-101-uuid', required: false })
  @IsOptional()
  @IsString()
  truck_id?: string;

  @ApiProperty({ example: 'd-202-uuid', required: false })
  @IsOptional()
  @IsString()
  profile_id?: string;
}

class CreateMaintenanceDto {
  @ApiProperty({ example: 'v-101-uuid' })
  @IsNotEmpty()
  @IsString()
  truck_id: string;

  @ApiProperty({ example: 'Engine oil and filter change' })
  @IsNotEmpty()
  @IsString()
  description: string;

  @ApiProperty({ example: 4500 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiProperty({ example: '2026-07-09' })
  @IsNotEmpty()
  @IsString()
  maintenance_date: string;

  @ApiProperty({ example: 'completed' })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty({ example: 120500 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  odometer: number;
}

class CreateFuelDto {
  @ApiProperty({ example: 'v-101-uuid' })
  @IsNotEmpty()
  @IsString()
  truck_id: string;

  @ApiProperty({ example: 85.5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.1)
  fuel_quantity_liters: number;

  @ApiProperty({ example: 7600 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiProperty({ example: 120650 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  odometer: number;

  @ApiProperty({ example: '2026-07-09' })
  @IsNotEmpty()
  @IsString()
  fuel_date: string;

  @ApiProperty({ example: 'HP Fuel Pump, Mumbai', required: false })
  @IsOptional()
  @IsString()
  location?: string;
}

class CreateTyreDto {
  @ApiProperty({ example: 'v-101-uuid' })
  @IsNotEmpty()
  @IsString()
  truck_id: string;

  @ApiProperty({ example: 'TYR-992837' })
  @IsNotEmpty()
  @IsString()
  serial_number: string;

  @ApiProperty({ example: 'Front Left' })
  @IsNotEmpty()
  @IsString()
  position: string;

  @ApiProperty({ example: 'new' })
  @IsNotEmpty()
  @IsString()
  status: string;

  @ApiProperty({ example: '2026-07-09' })
  @IsNotEmpty()
  @IsString()
  install_date: string;

  @ApiProperty({ example: 120100 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  install_odometer: number;
}

class PayoutRequestDto {
  @ApiProperty({ example: 25000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  amount: number;
}

// --- Controller Implementation ---

@ApiTags('Fleet Operations (Carrier)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  // --- Vehicles (Trucks) ---
  @Get('trucks')
  @Roles(user_role.fleet_owner, user_role.super_admin)
  @ApiOperation({ summary: 'Get list of carrier trucks' })
  async getTrucks(@Request() req: any) {
    return this.fleetService.getFleetList(req.user.id);
  }

  @Post('trucks')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Register a new truck' })
  async createTruck(@Request() req: any, @Body() body: CreateTruckDto) {
    return this.fleetService.createTruck(req.user.id, body);
  }

  @Put('trucks/:id')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Update truck details' })
  async updateTruck(@Request() req: any, @Param('id') id: string, @Body() body: UpdateTruckDto) {
    return this.fleetService.updateTruck(req.user.id, id, body);
  }

  @Delete('trucks/:id')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Delete/retire a truck' })
  async deleteTruck(@Request() req: any, @Param('id') id: string) {
    return this.fleetService.deleteTruck(req.user.id, id);
  }

  // --- Drivers ---
  @Get('drivers')
  @Roles(user_role.fleet_owner, user_role.super_admin)
  @ApiOperation({ summary: 'Get list of carrier drivers' })
  async getDrivers(@Request() req: any) {
    return this.fleetService.getDriversList(req.user.id);
  }

  @Post('drivers')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Add/register a driver profile' })
  async createDriver(@Request() req: any, @Body() body: CreateDriverDto) {
    return this.fleetService.createDriver(req.user.id, body);
  }

  @Put('drivers/:id')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Update driver specifications' })
  async updateDriver(@Request() req: any, @Param('id') id: string, @Body() body: UpdateDriverDto) {
    return this.fleetService.updateDriver(req.user.id, id, body);
  }

  @Delete('drivers/:id')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Remove a driver profile' })
  async deleteDriver(@Request() req: any, @Param('id') id: string) {
    return this.fleetService.deleteDriver(req.user.id, id);
  }

  @Post('assign-driver')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Assign driver to a vehicle' })
  async assignDriver(@Body() body: AssignDriverDto) {
    return this.fleetService.assignDriver(body.vehicleId, body.driverProfileId);
  }

  // --- Document Vault ---
  @Get('documents')
  @Roles(user_role.fleet_owner, user_role.super_admin)
  @ApiOperation({ summary: 'Get company uploaded documents' })
  @ApiQuery({ name: 'truckId', required: false })
  @ApiQuery({ name: 'profileId', required: false })
  async getDocuments(
    @Request() req: any,
    @Query('truckId') truckId?: string,
    @Query('profileId') profileId?: string,
  ) {
    return this.fleetService.getDocuments(req.user.id, truckId, profileId);
  }

  @Post('documents')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Upload/register a document (RC, Permit, Insurance)' })
  async createDocument(@Request() req: any, @Body() body: CreateDocumentDto) {
    return this.fleetService.createDocument(req.user.id, body);
  }

  @Delete('documents/:id')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Delete document' })
  async deleteDocument(@Request() req: any, @Param('id') id: string) {
    return this.fleetService.deleteDocument(req.user.id, id);
  }

  // --- Maintenance Logs ---
  @Get('maintenance')
  @Roles(user_role.fleet_owner, user_role.super_admin)
  @ApiOperation({ summary: 'Get maintenance logs' })
  @ApiQuery({ name: 'truckId', required: false })
  async getMaintenanceLogs(@Request() req: any, @Query('truckId') truckId?: string) {
    return this.fleetService.getMaintenanceLogs(req.user.id, truckId);
  }

  @Post('maintenance')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Add maintenance entry' })
  async createMaintenance(@Request() req: any, @Body() body: CreateMaintenanceDto) {
    return this.fleetService.createMaintenanceLog(req.user.id, body);
  }

  // --- Fuel Entries ---
  @Get('fuel')
  @Roles(user_role.fleet_owner, user_role.super_admin)
  @ApiOperation({ summary: 'Get fuel logs' })
  @ApiQuery({ name: 'truckId', required: false })
  async getFuelLogs(@Request() req: any, @Query('truckId') truckId?: string) {
    return this.fleetService.getFuelLogs(req.user.id, truckId);
  }

  @Post('fuel')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Add fuel refill entry' })
  async createFuel(@Request() req: any, @Body() body: CreateFuelDto) {
    return this.fleetService.createFuelLog(req.user.id, body);
  }

  // --- Tyre Log ---
  @Get('tyres')
  @Roles(user_role.fleet_owner, user_role.super_admin)
  @ApiOperation({ summary: 'Get tyre entries' })
  @ApiQuery({ name: 'truckId', required: false })
  async getTyres(@Request() req: any, @Query('truckId') truckId?: string) {
    return this.fleetService.getTyreLogs(req.user.id, truckId);
  }

  @Post('tyres')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Add tyre replacement/check' })
  async createTyre(@Request() req: any, @Body() body: CreateTyreDto) {
    return this.fleetService.createTyreLog(req.user.id, body);
  }

  // --- Bookings ---
  @Get('bookings')
  @Roles(user_role.fleet_owner, user_role.super_admin)
  @ApiOperation({ summary: 'Get trips and shipments assigned to company' })
  async getBookings(@Request() req: any) {
    return this.fleetService.getCarrierBookings(req.user.id);
  }

  // --- Wallet & Payments ---
  @Get('wallet/balance')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Get company wallet balance' })
  async getWalletBalance(@Request() req: any) {
    return this.fleetService.getWalletBalance(req.user.id);
  }

  @Get('wallet/transactions')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Get wallet payment transactions ledger' })
  async getTransactions(@Request() req: any) {
    return this.fleetService.getTransactions(req.user.id);
  }

  @Post('wallet/payout')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Request carrier payout withdraw' })
  async requestPayout(@Request() req: any, @Body() body: PayoutRequestDto) {
    return this.fleetService.requestPayout(req.user.id, body.amount);
  }

  // --- Audit Activity Feed ---
  @Get('logs')
  @Roles(user_role.fleet_owner)
  @ApiOperation({ summary: 'Get operator audit activity logs' })
  async getActivityLogs(@Request() req: any) {
    return this.fleetService.getActivityLogs(req.user.id);
  }
}
