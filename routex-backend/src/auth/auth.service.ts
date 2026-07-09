import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { user_role, verification_status, driver_status } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async validateUserLogin(phone: string) {
    const profile = await this.prisma.profiles.findFirst({
      where: { phone_number: phone },
    });
    if (!profile) {
      throw new UnauthorizedException(
        'Invalid phone number or user not registered',
      );
    }
    return profile;
  }

  async login(phone: string) {
    const profile = await this.prisma.profiles.findFirst({
      where: { phone_number: phone },
      include: {
        drivers: {
          include: {
            trucks: true,
          },
        },
      },
    });
    if (!profile) {
      throw new UnauthorizedException(
        'Invalid phone number or user not registered',
      );
    }
    const payload = {
      sub: profile.id,
      phone: profile.phone_number,
      role: profile.role,
    };
    const token = this.jwtService.sign(payload);
    const driver = profile.drivers;
    return {
      token,
      refreshToken: 'mock-refresh-token-' + randomUUID(),
      profile: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone_number,
        license_number: driver?.license_number || 'DL-PENDING',
        experience_years: driver?.years_of_experience || 0,
        status: driver?.status || 'available',
        vehicle: driver?.trucks || null,
      },
      accessToken: token,
      user: {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        phone: profile.phone_number,
        role: profile.role,
        isVerified: profile.verification_state === verification_status.verified,
      },
    };
  }

  async register(body: {
    name: string;
    phone: string;
    role: user_role;
    email?: string;
  }) {
    const exists = await this.prisma.profiles.findFirst({
      where: { phone_number: body.phone },
    });
    if (exists) {
      throw new ConflictException('Phone number already registered');
    }

    const userId = randomUUID();
    const names = body.name.split(' ');
    const firstName = names[0] || 'User';
    const lastName = names.slice(1).join(' ') || 'RouteX';
    const emailAddress = body.email || `${body.phone}@routex.in`;

    // 1. Create user in Supabase auth schema
    await this.prisma.users.create({
      data: {
        id: userId,
        email: emailAddress,
        phone: body.phone,
        aud: 'authenticated',
        role: 'authenticated',
      },
    });

    // Check if a trigger already auto-provisioned the profile
    let profile = await this.prisma.profiles.findUnique({
      where: { id: userId },
    });

    if (profile) {
      profile = await this.prisma.profiles.update({
        where: { id: userId },
        data: {
          first_name: firstName,
          last_name: lastName,
          email: emailAddress,
          phone_number: body.phone,
          role: body.role,
          verification_state: verification_status.pending,
          is_active: true,
        },
      });
    } else {
      profile = await this.prisma.profiles.create({
        data: {
          id: userId,
          first_name: firstName,
          last_name: lastName,
          email: emailAddress,
          phone_number: body.phone,
          role: body.role,
          verification_state: verification_status.pending,
          is_active: true,
        },
      });
    }

    // 3. Create wallet in public.wallets schema
    const existsWallet = await this.prisma.wallets.findFirst({
      where: { profile_id: userId },
    });
    if (!existsWallet) {
      await this.prisma.wallets.create({
        data: {
          profile_id: userId,
          balance: 0.0,
          currency: 'INR',
          is_frozen: false,
        },
      });
    }

    // 4. Provision Driver record if the user role is driver
    if (body.role === user_role.driver) {
      const existsDriver = await this.prisma.drivers.findFirst({
        where: { id: userId },
      });
      if (!existsDriver) {
        await this.prisma.drivers.create({
          data: {
            id: userId,
            license_number: `DL-${Math.floor(100000 + Math.random() * 900000)}`,
            license_expiry: new Date(
              Date.now() + 5 * 365 * 24 * 60 * 60 * 1000,
            ), // 5 years expiry
            years_of_experience: 1,
            status: driver_status.available,
            verification_state: verification_status.pending,
          },
        });
      }
    }

    const payload = {
      sub: profile.id,
      phone: profile.phone_number,
      role: profile.role,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        phone: profile.phone_number,
        role: profile.role,
        isVerified: false,
      },
    };
  }

  /**
   * Verify a Clerk JWT and find-or-create the backend user profile.
   * Returns a backend JWT that all existing API guards use.
   */
  async clerkSync(clerkToken: string) {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new UnauthorizedException('Clerk is not configured on this server');
    }

    // Verify the Clerk session token
    const clerk = createClerkClient({ secretKey: clerkSecretKey });
    let clerkUser: Awaited<ReturnType<typeof clerk.users.getUser>>;
    try {
      const payload = await verifyToken(clerkToken, {
        secretKey: clerkSecretKey,
      });
      clerkUser = await clerk.users.getUser(payload.sub);
    } catch {
      throw new UnauthorizedException('Invalid or expired Clerk token');
    }

    const email =
      clerkUser.emailAddresses?.[0]?.emailAddress ||
      `${clerkUser.id}@clerk.routex.in`;
    const phone =
      clerkUser.phoneNumbers?.[0]?.phoneNumber?.replace(/^\+91/, '') ||
      clerkUser.id.slice(0, 10);
    const firstName = clerkUser.firstName || 'User';
    const lastName = clerkUser.lastName || 'RouteX';

    // Find existing profile by Clerk ID (stored in email or by clerk_id lookup)
    let profile = await this.prisma.profiles.findFirst({
      where: {
        OR: [{ email }, { phone_number: phone }],
      },
    });

    if (!profile) {
      // First-time Clerk sign-in: auto-provision a shipper profile
      const userId = randomUUID();
      try {
        await this.prisma.users.create({
          data: {
            id: userId,
            email,
            phone,
            aud: 'authenticated',
            role: 'authenticated',
          },
        });
      } catch {
        // user row may already exist due to trigger; continue
      }

      profile = await this.prisma.profiles.create({
        data: {
          id: userId,
          first_name: firstName,
          last_name: lastName,
          email,
          phone_number: phone,
          role: user_role.shipper,
          verification_state: verification_status.pending,
          is_active: true,
        },
      });

      // Create wallet
      await this.prisma.wallets.create({
        data: {
          profile_id: userId,
          balance: 0.0,
          currency: 'INR',
          is_frozen: false,
        },
      });
    }

    const jwtPayload = {
      sub: profile.id,
      phone: profile.phone_number,
      role: profile.role,
    };

    return {
      accessToken: this.jwtService.sign(jwtPayload),
      user: {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        phone: profile.phone_number,
        role: profile.role,
        isVerified: profile.verification_state === verification_status.verified,
      },
    };
  }

  /**
   * Verify a Firebase Phone Auth ID token and find-or-create a driver profile.
   * Used by the RouteX Driver App after Firebase OTP verification.
   * Returns a backend JWT compatible with all existing guards.
   */
  async firebaseSync(idToken: string) {
    const firebaseAuth = this.firebaseService.getAuth();
    if (!firebaseAuth) {
      throw new UnauthorizedException(
        'Firebase is not configured on this server. Please add firebase-service-account.json to the backend root.',
      );
    }

    // Verify the Firebase ID token with google public keys
    let decoded: Awaited<ReturnType<typeof firebaseAuth.verifyIdToken>>;
    try {
      decoded = await firebaseAuth.verifyIdToken(idToken);
    } catch (err: any) {
      throw new UnauthorizedException(
        `Invalid or expired Firebase ID token: ${err.message}`,
      );
    }

    // Firebase phone auth stores the number in decoded.phone_number (+919876543210)
    const rawPhone = decoded.phone_number || '';
    const phone = rawPhone.replace(/^\+91/, '').replace(/\D/g, ''); // strip +91, keep digits
    const firebaseUid = decoded.uid;

    if (!phone || phone.length < 10) {
      throw new UnauthorizedException(
        'Firebase token does not contain a valid Indian phone number',
      );
    }

    // Find existing profile by phone number
    let profile = await this.prisma.profiles.findFirst({
      where: { phone_number: phone },
      include: {
        drivers: { include: { trucks: true } },
      },
    });

    if (!profile) {
      // First-time Firebase driver sign-in: auto-provision driver account
      const userId = randomUUID();
      const email = `${phone}@firebase.routex.in`;

      // Create auth user row
      try {
        await this.prisma.users.create({
          data: {
            id: userId,
            email,
            phone,
            aud: 'authenticated',
            role: 'authenticated',
          },
        });
      } catch {
        // Supabase trigger may have already created this row — safe to continue
      }

      // Create profile with driver role
      profile = await this.prisma.profiles.create({
        data: {
          id: userId,
          first_name: 'Driver',
          last_name: firebaseUid.slice(0, 8), // temp name until profile completed
          email,
          phone_number: phone,
          role: user_role.driver,
          verification_state: verification_status.pending,
          is_active: true,
        },
        include: { drivers: { include: { trucks: true } } },
      });

      // Create wallet
      await this.prisma.wallets.create({
        data: {
          profile_id: userId,
          balance: 0.0,
          currency: 'INR',
          is_frozen: false,
        },
      });

      // Create driver record
      await this.prisma.drivers.create({
        data: {
          id: userId,
          license_number: `DL-PENDING-${Math.floor(100000 + Math.random() * 900000)}`,
          license_expiry: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
          years_of_experience: 0,
          status: driver_status.available,
          verification_state: verification_status.pending,
        },
      });
    }

    const driver = (profile as any).drivers;
    const jwtPayload = {
      sub: profile.id,
      phone: profile.phone_number,
      role: profile.role,
    };
    const token = this.jwtService.sign(jwtPayload);

    return {
      token,
      accessToken: token,
      refreshToken: 'firebase-refresh-' + randomUUID(),
      profile: {
        id: profile.id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone_number,
        license_number: driver?.license_number || 'DL-PENDING',
        experience_years: driver?.years_of_experience || 0,
        status: driver?.status || 'available',
        vehicle: driver?.trucks || null,
      },
      user: {
        id: profile.id,
        name: `${profile.first_name} ${profile.last_name}`.trim(),
        phone: profile.phone_number,
        role: profile.role,
        isVerified: profile.verification_state === verification_status.verified,
      },
    };
  }
}
