import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'routex-jwt-secret-token',
    });
  }

  async validate(payload: { sub: string; phone: string; role: string }) {
    if (!payload?.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    try {
      const user: any = await this.prisma.profiles.findUnique({
        where: { id: payload.sub },
        include: { drivers: true },
      });
      if (user && user.is_active !== false) {
        return {
          ...user,
          tokenRole: payload.role,
        };
      }
    } catch {}

    return {
      id: payload.sub,
      phone_number: payload.phone,
      role: payload.role,
      tokenRole: payload.role,
      is_active: true,
    };
  }
}
