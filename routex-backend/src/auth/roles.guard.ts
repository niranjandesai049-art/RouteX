import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { user_role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<user_role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles restricted on this endpoint
    }
    const { user } = context.switchToHttp().getRequest();
    if (!user) return false;

    const userRoleStr = (user.role || '').toString().toLowerCase();
    const tokenRoleStr = (user.tokenRole || '').toString().toLowerCase();
    const isDriver = !!user.drivers;

    return requiredRoles.some((reqRole) => {
      const reqStr = reqRole.toString().toLowerCase();
      if (reqStr === userRoleStr || reqStr === tokenRoleStr) return true;
      if (reqStr === 'driver' && isDriver) return true;
      return false;
    });
  }
}
