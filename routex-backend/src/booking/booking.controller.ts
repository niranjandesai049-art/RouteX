import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BookingService, CreateBookingDto } from './booking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_role, booking_status } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

class AssignDriverDto {
  @ApiProperty({ example: 'd-202-uuid', description: 'Driver Profile UUID' })
  @IsNotEmpty()
  @IsString()
  driverId: string;
}

class UpdateStatusDto {
  @ApiProperty({
    enum: booking_status,
    example: booking_status.in_transit,
    description: 'New booking status',
  })
  @IsNotEmpty()
  @IsEnum(booking_status)
  status: booking_status;
}

class EpodDto {
  @ApiProperty({
    example: 'data:image/png;base64,...',
    description: 'Base64 electronic signature string',
  })
  @IsNotEmpty()
  @IsString()
  signature: string;
}

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller(['bookings', 'booking'])
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @Roles(user_role.shipper, user_role.super_admin)
  @ApiOperation({
    summary: 'Create a new cargo shipment booking (Shippers / Admin only)',
  })
  @ApiResponse({ status: 201, description: 'Booking created successfully.' })
  async create(@Body() dto: CreateBookingDto) {
    return this.bookingService.create(dto);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available shipments for drivers' })
  @ApiResponse({
    status: 200,
    description: 'List of available shipments returned.',
  })
  async getAvailable(@Request() req: any) {
    return this.bookingService.findAvailable(req.user?.id);
  }

  @Post(':id/accept')
  @Roles(user_role.driver, user_role.super_admin)
  @ApiOperation({ summary: 'Accept a cargo shipment booking' })
  @ApiResponse({ status: 200, description: 'Booking successfully accepted.' })
  async acceptBooking(@Param('id') id: string, @Request() req: any) {
    return this.bookingService.assignDriver(id, req.user.id);
  }

  @Post(':id/reject')
  @Roles(user_role.driver, user_role.super_admin)
  @ApiOperation({ summary: 'Reject a booking' })
  @ApiResponse({ status: 200, description: 'Booking rejected successfully.' })
  rejectBooking(@Param('id') id: string) {
    return { success: true, bookingId: id };
  }

  @Get()
  @ApiOperation({ summary: 'Get all shipments queue' })
  @ApiResponse({ status: 200, description: 'List of shipments returned.' })
  async findAll() {
    return this.bookingService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single booking' })
  @ApiResponse({ status: 200, description: 'Booking returned.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async findOne(@Param('id') id: string) {
    return this.bookingService.findOne(id);
  }

  @Put(':id/assign')
  @Roles(user_role.driver, user_role.fleet_owner, user_role.super_admin)
  @ApiOperation({ summary: 'Assign a carrier driver to a booking' })
  @ApiResponse({ status: 200, description: 'Driver successfully assigned.' })
  async assignDriver(@Param('id') id: string, @Body() body: AssignDriverDto) {
    return this.bookingService.assignDriver(id, body.driverId);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Advance shipment delivery status milestone' })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  async updateStatus(@Param('id') id: string, @Body() body: UpdateStatusDto) {
    return this.bookingService.updateStatus(id, body.status);
  }

  @Post(':id/epod')
  @Roles(user_role.driver, user_role.super_admin)
  @ApiOperation({
    summary: 'Submit electronic Proof of Delivery signature (Driver only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Proof of Delivery accepted and payment settled.',
  })
  async submitEpod(@Param('id') id: string, @Body() body: EpodDto) {
    return this.bookingService.submitEpod(id, body.signature);
  }

  @Post(':id/stops/:stopId/epod')
  @Roles(user_role.driver, user_role.super_admin)
  @ApiOperation({
    summary: 'Complete an intermediate waypoint stop (Driver only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Stop marked as completed.',
  })
  async completeStop(
    @Param('id') bookingId: string,
    @Param('stopId') stopId: string,
    @Body('otp') otp: string,
  ) {
    return this.bookingService.completeStop(bookingId, stopId, otp);
  }
}
