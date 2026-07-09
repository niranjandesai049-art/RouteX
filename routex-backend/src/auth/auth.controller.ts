import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiProperty,
} from '@nestjs/swagger';
import { user_role } from '@prisma/client';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

class LoginDto {
  @ApiProperty({
    example: '9876543210',
    description: 'Driver or Shipper mobile number',
  })
  @IsNotEmpty()
  @IsString()
  phone: string;
}

class RegisterDto {
  @ApiProperty({
    example: 'Ramesh Sharma',
    description: 'Legal name of the user',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: '9876543210',
    description: 'Unique mobile phone number',
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiProperty({
    enum: user_role,
    example: user_role.shipper,
    description: 'Role of user',
  })
  @IsNotEmpty()
  @IsEnum(user_role)
  role: user_role;

  @ApiProperty({
    example: 'ramesh@gmail.com',
    required: false,
    description: 'Email address',
  })
  @IsOptional()
  @IsString()
  email?: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with mobile number (OTP bypass simulation)' })
  @ApiResponse({ status: 200, description: 'Bearer JWT token returned.' })
  @ApiResponse({
    status: 401,
    description: 'Invalid phone number or not registered.',
  })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.phone);
  }

  @Post('register')
  @ApiOperation({
    summary: 'Register new user account (Shipper / Driver / FleetOwner)',
  })
  @ApiResponse({
    status: 201,
    description: 'User successfully created and token returned.',
  })
  @ApiResponse({ status: 409, description: 'Phone number already registered.' })
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('clerk-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a Clerk JWT for a RouteX backend JWT',
    description:
      'Verifies the Clerk session token, finds or auto-provisions the user profile, and returns a backend JWT compatible with all existing guards.',
  })
  @ApiResponse({ status: 200, description: 'Backend JWT returned.' })
  @ApiResponse({ status: 401, description: 'Invalid or expired Clerk token.' })
  async clerkSync(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const clerkToken = authHeader.slice(7);
    return this.authService.clerkSync(clerkToken);
  }

  @Post('firebase-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a Firebase Phone Auth ID Token for a RouteX backend JWT',
    description:
      'Used by the RouteX Driver App. Verifies the Firebase ID token (issued after OTP verification), ' +
      'finds or auto-provisions the driver profile, and returns a backend JWT for all protected API calls.',
  })
  @ApiResponse({
    status: 200,
    description: 'Backend JWT and driver profile returned.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired Firebase ID token.',
  })
  async firebaseSync(@Headers('authorization') authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }
    const firebaseIdToken = authHeader.slice(7);
    return this.authService.firebaseSync(firebaseIdToken);
  }
}
