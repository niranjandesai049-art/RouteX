import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomBytes } from 'crypto';

export interface IEmailProvider {
  sendEmail(to: string, subject: string, html: string): Promise<boolean>;
}

@Injectable()
export class ConsoleEmailProvider implements IEmailProvider {
  private readonly logger = new Logger(ConsoleEmailProvider.name);

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    this.logger.log(`[EMAIL PROVIDER - CONSOLE] Sending to ${to} | Subject: "${subject}"`);
    return true;
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private emailProvider: IEmailProvider;

  constructor(private readonly prisma: PrismaService) {
    // Abstraction: Default to Console provider for dev environment
    this.emailProvider = new ConsoleEmailProvider();
  }

  setProvider(provider: IEmailProvider) {
    this.emailProvider = provider;
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a secure email verification token and sends verification link.
   */
  async sendVerificationEmail(userId: string, emailAddress: string): Promise<{ success: boolean; message: string }> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    await this.prisma.email_verifications.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${rawToken}&userId=${userId}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1A1A1A;">
        <h2>Verify Your Email Address - RouteX</h2>
        <p>Please click the button below to verify your corporate email address for RouteX Logistics:</p>
        <a href="${verifyUrl}" style="background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        <p style="margin-top: 20px; font-size: 12px; color: #666666;">This verification link will expire in 24 hours.</p>
      </div>
    `;

    await this.emailProvider.sendEmail(emailAddress, 'Verify Your RouteX Email Address', htmlBody);
    this.logger.log(`[EMAIL VERIFICATION] Token generated for user ${userId} (${emailAddress})`);

    return {
      success: true,
      message: 'Verification email sent successfully.',
    };
  }

  /**
   * Validates the verification token and sets email_verified = true.
   */
  async verifyEmailToken(userId: string, token: string): Promise<boolean> {
    const tokenHash = this.hashToken(token);
    const now = new Date();

    const record = await this.prisma.email_verifications.findFirst({
      where: {
        user_id: userId,
        token_hash: tokenHash,
        verified_at: null,
      },
      orderBy: { created_at: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Invalid or expired email verification token.');
    }

    if (record.expires_at < now) {
      throw new BadRequestException('Email verification token has expired.');
    }

    // Mark verification token as used
    await this.prisma.email_verifications.update({
      where: { id: record.id },
      data: { verified_at: now },
    });

    // Update user profile email status
    await this.prisma.profiles.update({
      where: { id: userId },
      data: { is_active: true },
    });

    return true;
  }

  /**
   * Generic provider-agnostic transactional email dispatch for receipts, invoices, alerts.
   */
  async sendTransactionalEmail(to: string, subject: string, bodyText: string): Promise<boolean> {
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1A1A1A;">
        <h3 style="color: #2563EB;">RouteX India Logistics OS</h3>
        <p>${bodyText.replace(/\n/g, '<br/>')}</p>
        <hr style="border: none; border-top: 1px solid #EBEBEB; margin-top: 20px;"/>
        <p style="font-size: 10px; color: #888888;">This is an automated notification from RouteX System.</p>
      </div>
    `;
    return this.emailProvider.sendEmail(to, subject, htmlBody);
  }
}
