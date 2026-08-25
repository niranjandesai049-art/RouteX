import {
  Controller,
  Get,
  Param,
  Put,
  Delete,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
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
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

class UpdateKycDto {
  @ApiProperty({
    example: true,
    description: 'True to approve KYC, false to revoke/reject',
  })
  isVerified: boolean;
}

class UpdateFcmDto {
  @ApiProperty({
    example: 'fcm-registration-token-12345',
    description: 'Firebase Cloud Messaging Registration Token',
  })
  @IsNotEmpty()
  @IsString()
  fcmToken: string;
}

class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  gstNumber?: string;
}

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(user_role.super_admin)
  @ApiOperation({ summary: 'Get all user profiles (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of users returned.' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned.' })
  async getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  async updateMyProfile(@Request() req: any, @Body() body: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, body);
  }

  @Put(':id/profile')
  @ApiOperation({ summary: 'Update user profile by ID' })
  @ApiResponse({ status: 200, description: 'Profile updated.' })
  async updateProfileById(@Param('id') id: string, @Body() body: UpdateProfileDto) {
    return this.usersService.updateProfile(id, body);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Permanently delete authenticated user account' })
  @ApiResponse({ status: 200, description: 'Account permanently deleted.' })
  async deleteAccount(@Request() req: any) {
    return this.usersService.deleteAccount(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific user profile by ID' })
  @ApiResponse({ status: 200, description: 'User profile returned.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Put('fcm-token')
  @ApiOperation({
    summary:
      'Update Firebase Cloud Messaging registration token for current user',
  })
  @ApiResponse({
    status: 200,
    description: 'FCM token successfully registered.',
  })
  async updateFcmToken(@Request() req: any, @Body() body: UpdateFcmDto) {
    return this.usersService.updateFcmToken(req.user.id, body.fcmToken);
  }

  @Put(':id/verify')
  @Roles(user_role.super_admin)
  @ApiOperation({ summary: 'Verify or reject user KYC (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User KYC status successfully updated.',
  })
  async updateKyc(@Param('id') id: string, @Body() body: UpdateKycDto) {
    return this.usersService.updateKycStatus(id, body.isVerified);
  }

  @Put(':id/fcm')
  @ApiOperation({
    summary: 'Update Firebase Cloud Messaging registration token for a user',
  })
  @ApiResponse({
    status: 200,
    description: 'FCM token successfully registered.',
  })
  async updateFcm(@Param('id') id: string, @Body() body: UpdateFcmDto) {
    return this.usersService.updateFcmToken(id, body.fcmToken);
  }
}
