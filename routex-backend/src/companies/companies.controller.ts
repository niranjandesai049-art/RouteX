import { Controller, Get, Body, Put, UseGuards, Request } from '@nestjs/common';
import { CompaniesService } from './companies.service';
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

class UpdateCompanyProfileDto {
  @ApiProperty({
    example: 'TCI Freight Logistics',
    description: 'Registered business name',
  })
  companyName: string;

  @ApiProperty({
    example: '27AAAT1909M1Z5',
    description: '15-character GSTIN number',
  })
  gstNo: string;
}

@ApiTags('Companies / Shippers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Put('profile')
  @Roles(user_role.shipper)
  @ApiOperation({ summary: 'Update company profile and GSTIN (Shipper only)' })
  @ApiResponse({ status: 200, description: 'Profile successfully updated.' })
  async updateProfile(
    @Request() req: any,
    @Body() body: UpdateCompanyProfileDto,
  ) {
    return this.companiesService.updateProfile(req.user.id, body);
  }

  @Get('profile')
  @Roles(user_role.shipper)
  @ApiOperation({ summary: 'Get current shipper company details' })
  @ApiResponse({ status: 200, description: 'Company profile returned.' })
  async getProfile(@Request() req: any) {
    return this.companiesService.getProfile(req.user.id);
  }
}
