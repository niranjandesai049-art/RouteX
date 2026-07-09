import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TrucksService } from './trucks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { user_role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
} from '@nestjs/swagger';

class CreateVehicleDto {
  @ApiProperty({
    example: 'MH-12-Q-9041',
    description: 'Vehicle Registration Certificate number',
  })
  rcNo: string;

  @ApiProperty({
    example: 'INS-890123-PO',
    description: 'Insurance policy number',
  })
  insuranceNo: string;

  @ApiProperty({
    example: 'Container',
    description:
      'Category (mini_truck, open_body, container, trailer, tanker, reefer)',
  })
  category: string;

  @ApiProperty({
    example: 30.0,
    description: 'Payload carrying capacity in Metric Tons',
  })
  capacityTons: number;

  @ApiProperty({
    example: 'FT-902184',
    required: false,
    description: 'Optional FASTag identifier',
  })
  fastagId?: string;
}

@ApiTags('Trucks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('trucks')
export class TrucksController {
  constructor(private readonly trucksService: TrucksService) {}

  @Post()
  @Roles(user_role.fleet_owner, user_role.super_admin)
  @ApiOperation({ summary: 'Register a new truck (Fleet Owners / Admin only)' })
  @ApiResponse({ status: 201, description: 'Vehicle created successfully.' })
  async create(@Request() req: any, @Body() body: CreateVehicleDto) {
    return this.trucksService.create(req.user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all registered trucks in the marketplace' })
  @ApiResponse({ status: 200, description: 'List of vehicles.' })
  async findAll() {
    return this.trucksService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get truck details by ID' })
  @ApiResponse({ status: 200, description: 'Vehicle returned.' })
  @ApiResponse({ status: 404, description: 'Vehicle not found.' })
  async findOne(@Param('id') id: string) {
    return this.trucksService.findOne(id);
  }
}
