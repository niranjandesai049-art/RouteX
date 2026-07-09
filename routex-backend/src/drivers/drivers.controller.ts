import { Controller, Get, Body, Put, UseGuards, Request } from '@nestjs/common';
import { DriversService } from './drivers.service';
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
import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

class ToggleOnlineDto {
  @ApiProperty({
    example: true,
    description: 'True to go online, false for offline',
  })
  @IsNotEmpty()
  @IsBoolean()
  isOnline: boolean;
}

class UpdateDocsDto {
  @ApiProperty({
    example: 'DL-142026194',
    description: 'Driving License number',
  })
  @IsNotEmpty()
  @IsString()
  licenseNo: string;

  @ApiProperty({
    example: '123456789012',
    description: '12-digit Aadhaar Card number',
  })
  @IsNotEmpty()
  @IsString()
  aadhaarNo: string;
}

class UpdateCoordsDto {
  @ApiProperty({ example: 28.6139, description: 'Current latitude' })
  @IsNotEmpty()
  @IsNumber()
  latitude: number;

  @ApiProperty({ example: 77.209, description: 'Current longitude' })
  @IsNotEmpty()
  @IsNumber()
  longitude: number;
}

@ApiTags('Drivers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('drivers')
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  @Get('profile')
  @Roles(user_role.driver)
  @ApiOperation({ summary: 'Get current driver profile metrics' })
  @ApiResponse({ status: 200, description: 'Driver profile returned.' })
  async getProfile(@Request() req: any) {
    return this.driversService.getProfile(req.user.id);
  }

  @Put('online')
  @Roles(user_role.driver)
  @ApiOperation({ summary: 'Toggle online/offline status (Driver only)' })
  @ApiResponse({ status: 200, description: 'Driver online status updated.' })
  async toggleOnline(@Request() req: any, @Body() body: ToggleOnlineDto) {
    return this.driversService.toggleOnline(req.user.id, body.isOnline);
  }

  @Put('location')
  @Roles(user_role.driver)
  @ApiOperation({
    summary: 'Update driver real-time coordinates (Driver only)',
  })
  @ApiResponse({ status: 200, description: 'Coordinates updated.' })
  async updateLocation(@Request() req: any, @Body() body: UpdateCoordsDto) {
    return this.driversService.updateLocation(
      req.user.id,
      body.latitude,
      body.longitude,
    );
  }

  @Put('documents')
  @Roles(user_role.driver)
  @ApiOperation({
    summary:
      'Submit driving license and Aadhaar for verification (Driver only)',
  })
  @ApiResponse({ status: 200, description: 'Documents uploaded for review.' })
  async updateDocs(@Request() req: any, @Body() body: UpdateDocsDto) {
    return this.driversService.updateDocuments(
      req.user.id,
      body.licenseNo,
      body.aadhaarNo,
    );
  }
}
