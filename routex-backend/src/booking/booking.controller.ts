import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
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
@UseGuards(JwtAuthGuard)
@Controller(['bookings', 'booking'])
export class BookingController {
  private readonly logger = new Logger(BookingController.name);

  constructor(private readonly bookingService: BookingService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new cargo shipment booking',
  })
  @ApiResponse({ status: 201, description: 'Booking created successfully.' })
  async create(@Body() dto: CreateBookingDto, @Request() req: any) {
    this.logger.log(
      `[BOOKINGS API] POST /api/bookings invoked by user: ${req?.user?.id || 'anonymous'}, body: ${JSON.stringify(dto)}`,
    );
    if (!dto.shipperId && req?.user?.id) {
      dto.shipperId = req.user.id;
    }
    try {
      const result = await this.bookingService.create(dto);
      this.logger.log(
        `[BOOKINGS API] POST /api/bookings completed: Ref ${result.booking_reference}, ID: ${result.id}`,
      );
      return result;
    } catch (err: any) {
      this.logger.error(
        `[BOOKINGS API] POST /api/bookings failed with error: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available shipments for drivers' })
  @ApiResponse({
    status: 200,
    description: 'List of available shipments returned.',
  })
  async getAvailable(@Request() req: any) {
    this.logger.log(`[BOOKINGS API] GET /api/bookings/available invoked by user: ${req?.user?.id || 'anonymous'}`);
    return this.bookingService.findAvailable(req.user?.id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Accept a cargo shipment booking' })
  @ApiResponse({ status: 200, description: 'Booking successfully accepted.' })
  async acceptBooking(@Param('id') id: string, @Request() req: any) {
    this.logger.log(`[BOOKINGS API] POST /api/bookings/${id}/accept invoked by user: ${req?.user?.id || 'anonymous'}`);
    return this.bookingService.assignDriver(id, req.user.id);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a booking' })
  @ApiResponse({ status: 200, description: 'Booking rejected successfully.' })
  rejectBooking(@Param('id') id: string) {
    this.logger.log(`[BOOKINGS API] POST /api/bookings/${id}/reject invoked`);
    return { success: true, bookingId: id };
  }

  @Get()
  @ApiOperation({ summary: 'Get all shipments queue' })
  @ApiResponse({ status: 200, description: 'List of shipments returned.' })
  async findAll(@Request() req: any, @Query('shipperId') shipperId?: string) {
    this.logger.log(`[BOOKINGS API] GET /api/bookings invoked by user: ${req?.user?.id || 'anonymous'}, role: ${req?.user?.role}, filter shipperId: ${shipperId || 'none'}`);
    try {
      const results = await this.bookingService.findAll(req?.user, shipperId);
      this.logger.log(`[BOOKINGS API] GET /api/bookings successfully returned ${results.length} bookings`);
      return results;
    } catch (err: any) {
      this.logger.error(
        `[BOOKINGS API] GET /api/bookings failed with error: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single booking' })
  @ApiResponse({ status: 200, description: 'Booking returned.' })
  @ApiResponse({ status: 404, description: 'Booking not found.' })
  async findOne(@Param('id') id: string) {
    this.logger.log(`[BOOKINGS API] GET /api/bookings/${id} invoked`);
    try {
      return await this.bookingService.findOne(id);
    } catch (err: any) {
      this.logger.error(
        `[BOOKINGS API] GET /api/bookings/${id} failed: ${err.message}`,
        err.stack,
      );
      throw err;
    }
  }

  @Put(':id/assign')
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
  @ApiOperation({
    summary: 'Submit electronic Proof of Delivery signature',
  })
  @ApiResponse({
    status: 201,
    description: 'Proof of Delivery accepted and payment settled.',
  })
  async submitEpod(@Param('id') id: string, @Body() body: EpodDto) {
    return this.bookingService.submitEpod(id, body.signature);
  }

  @Post(':id/stops/:stopId/epod')
  @ApiOperation({
    summary: 'Complete an intermediate waypoint stop',
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
