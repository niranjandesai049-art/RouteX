import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { verification_status, company_type } from '@prisma/client';

@Injectable()
export class CompaniesService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(
    userId: string,
    data: { companyName: string; gstNo: string },
  ) {
    const profile = await this.prisma.profiles.findUnique({
      where: { id: userId },
    });
    if (!profile) throw new NotFoundException('User profile not found');

    const company = await this.prisma.companies.findFirst({
      where: { owner_id: userId },
    });

    if (company) {
      return this.prisma.companies.update({
        where: { id: company.id },
        data: {
          legal_name: data.companyName,
          tax_id: data.gstNo,
          is_verified: true,
          verification_state: verification_status.verified,
        },
      });
    } else {
      return this.prisma.companies.create({
        data: {
          owner_id: userId,
          legal_name: data.companyName,
          tax_id: data.gstNo,
          company_type: company_type.shipper,
          is_verified: true,
          verification_state: verification_status.verified,
        },
      });
    }
  }

  async getProfile(userId: string) {
    const company = await this.prisma.companies.findFirst({
      where: { owner_id: userId },
    });
    if (!company) {
      throw new NotFoundException(
        'Company profile not registered for this user',
      );
    }
    return {
      id: company.id,
      companyName: company.legal_name,
      gstNo: company.tax_id,
      isVerified: company.is_verified,
    };
  }
}
