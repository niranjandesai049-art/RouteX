import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty, ApiBearerAuth } from '@nestjs/swagger';
import { user_role } from '@prisma/client';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsEmail } from 'class-validator';
import { JwtAuthGuard } from './jwt-auth.guard';

class SendPhoneOtpDto {
  @ApiProperty({ example: '+919322468515', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: '9322468515', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}

class VerifyPhoneOtpDto {
  @ApiProperty({ example: '+919322468515', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ example: '9322468515', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP' })
  @IsNotEmpty()
  @IsString()
  otp: string;

  @ApiProperty({ example: 'verification-uuid-123', required: false })
  @IsOptional()
  @IsString()
  verificationId?: string;

  @ApiProperty({ example: 'device-id-xyz', required: false })
  @IsOptional()
  @IsString()
  deviceId?: string;

  @ApiProperty({ example: 'shipper', required: false })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ example: 'Ramesh Sharma', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'ramesh@gmail.com', required: false })
  @IsOptional()
  @IsString()
  email?: string;
}

class RefreshTokenDto {
  @ApiProperty({ example: 'rt_xxxx-xxxx' })
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}

class SendEmailVerificationDto {
  @ApiProperty({ example: 'user@company.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

class RegisterPushTokenDto {
  @ApiProperty({ example: 'device-uuid-123' })
  @IsNotEmpty()
  @IsString()
  deviceId: string;

  @ApiProperty({ example: 'fcm-push-token-abc' })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({ example: 'android', enum: ['android', 'ios', 'web'] })
  @IsNotEmpty()
  @IsString()
  platform: 'android' | 'ios' | 'web';
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('phone/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send 6-digit OTP to phone number via SMS' })
  @ApiResponse({ status: 200, description: 'OTP sent successfully.' })
  @ApiResponse({ status: 400, description: 'Invalid phone number or rate limited.' })
  async sendPhoneOtp(@Body() body: SendPhoneOtpDto) {
    const inputPhone = body.phoneNumber || body.phone;
    if (!inputPhone) {
      throw new BadRequestException('Please enter a valid Indian mobile number.');
    }
    return this.authService.sendPhoneOtp(inputPhone);
  }

  @Post('phone/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify 6-digit OTP and issue JWT + Refresh Session' })
  @ApiResponse({ status: 200, description: 'OTP verified. Session created.' })
  @ApiResponse({ status: 400, description: 'Invalid OTP code or expired.' })
  async verifyPhoneOtp(@Body() body: VerifyPhoneOtpDto) {
    const inputPhone = body.phoneNumber || body.phone;
    if (!inputPhone && !body.verificationId) {
      throw new BadRequestException('Phone number or verification ID is required.');
    }
    return this.authService.verifyPhoneOtp(
      inputPhone || '',
      body.otp,
      body.verificationId,
      body.deviceId,
      body.role,
      body.name,
      body.email,
    );
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  async refreshSession(@Body() body: RefreshTokenDto) {
    return this.authService.refreshSession(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke current session refresh token' })
  async logoutSession(@Body() body: RefreshTokenDto) {
    return this.authService.logoutSession(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke all sessions for authenticated user' })
  async logoutAllSessions(@Request() req: any) {
    return this.authService.logoutAllSessions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile and roles' })
  async getMe(@Request() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('email/send-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send email verification link' })
  async sendEmailVerification(@Request() req: any, @Body() body: SendEmailVerificationDto) {
    return this.authService.sendEmailVerification(req.user.id, body.email);
  }

  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email token' })
  async verifyEmail(@Query('userId') userId: string, @Query('token') token: string) {
    return this.authService.verifyEmailToken(userId, token);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('push-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register device push token' })
  async registerPushToken(@Request() req: any, @Body() body: RegisterPushTokenDto) {
    return this.authService.registerPushToken(req.user.id, body.deviceId, body.token, body.platform);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('push-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove device push token' })
  async removePushToken(@Request() req: any, @Query('deviceId') deviceId: string) {
    return this.authService.removePushToken(req.user.id, deviceId);
  }

  // Legacy compatibility routes
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Legacy mobile login' })
  async login(@Body() body: SendPhoneOtpDto) {
    const inputPhone = body.phoneNumber || body.phone;
    if (!inputPhone) {
      throw new BadRequestException('Please enter a valid Indian mobile number.');
    }
    return this.authService.login(inputPhone);
  }

  @Post('register')
  @ApiOperation({ summary: 'Legacy registration route' })
  async register(@Body() body: any) {
    return this.authService.register(body);
  }
}
