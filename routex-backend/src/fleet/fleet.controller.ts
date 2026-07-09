import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FleetService } from './fleet.service';
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

class AssignDriverDto {
  @ApiProperty({ example: 'v-101-uuid', description: 'Vehicle UUID' })
  vehicleId: string;

  @ApiProperty({ example: 'd-202-uuid', description: 'Driver Profile UUID' })
  driverProfileId: string;
}

@ApiTags('Fleet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('trucks')
  @Roles(user_role.fleet_owner)
  @ApiOperation({
    summary: 'Get list of trucks in my fleet (Fleet Owners only)',
  })
  @ApiResponse({ status: 200, description: 'List of owned trucks returned.' })
  async getMyFleet(@Request() req: any) {
    return this.fleetService.getFleetList(req.user.id);
  }

  @Post('assign-driver')
  @Roles(user_role.fleet_owner)
  @ApiOperation({
    summary: 'Assign a driver to a specific truck (Fleet Owners only)',
  })
  @ApiResponse({ status: 201, description: 'Driver successfully assigned.' })
  async assignDriver(@Body() body: AssignDriverDto) {
    return this.fleetService.assignDriver(body.vehicleId, body.driverProfileId);
  }
}
