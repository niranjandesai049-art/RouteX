import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { user_role } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as any;

  it('should allow access if no roles are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext({ role: 'shipper' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if user is not authenticated', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([user_role.driver]);
    const context = createMockContext(null);
    expect(guard.canActivate(context)).toBe(false);
  });

  it('should allow access if profile role matches required role', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([user_role.driver, user_role.fleet_owner]);
    const context = createMockContext({ role: 'driver' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if tokenRole matches required role even if profile role is different', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([user_role.driver, user_role.super_admin]);
    const context = createMockContext({ role: 'shipper', tokenRole: 'driver' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if user has drivers relation and driver role is required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([user_role.driver]);
    const context = createMockContext({ role: 'shipper', drivers: { id: 'driver-1' } });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny access if role does not match required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([user_role.fleet_owner, user_role.super_admin]);
    const context = createMockContext({ role: 'shipper', tokenRole: 'shipper' });
    expect(guard.canActivate(context)).toBe(false);
  });
});
