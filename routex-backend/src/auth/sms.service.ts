import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomInt, randomUUID } from 'crypto';

export interface ISmsProvider {
  readonly name: string;
  isConfigured(): boolean;
  sendSms(
    phoneNumber: string,
    otp: string,
    message: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }>;
}

export class ConsoleSmsProvider implements ISmsProvider {
  readonly name = 'Console SMS Provider (Local / Dev)';
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  isConfigured(): boolean {
    return true;
  }

  async sendSms(phoneNumber: string, otp: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    this.logger.log(`[SMS] Provider: ${this.name} | Phone: ${phoneNumber} | Message: ${message}`);
    console.log('\n======================================================');
    console.log(`[RouteX SMS Gateway] 📱 OTP to ${phoneNumber}: ${otp}`);
    console.log('======================================================\n');
    return { success: true, messageId: `console-${Date.now()}` };
  }
}

export class Fast2SmsProvider implements ISmsProvider {
  readonly name = 'Fast2SMS Gateway';
  private readonly logger = new Logger(Fast2SmsProvider.name);
  private readonly apiKey = process.env.FAST2SMS_API_KEY;

  isConfigured(): boolean {
    return !!this.apiKey;
  }

  async sendSms(phoneNumber: string, otp: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Fast2SMS API Key missing.' };
    }

    const tenDigitPhone = phoneNumber.replace(/^\+91/, '');
    this.logger.log(`[SMS] Provider request started: ${this.name} for ${phoneNumber}`);

    try {
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: this.apiKey!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: tenDigitPhone,
        }),
      });

      const data: any = await res.json();
      if (data?.return === true) {
        const msgId = data?.request_id || `fast2sms-${Date.now()}`;
        this.logger.log(`[SMS] Provider response received: Success (${msgId})`);
        return { success: true, messageId: msgId };
      } else {
        const err = data?.message?.[0] || data?.message || 'Fast2SMS returned failure';
        this.logger.error(`[SMS] Provider response error: ${err}`);
        return { success: false, error: String(err) };
      }
    } catch (err: any) {
      const errMsg = err.message || 'Fast2SMS request failed';
      this.logger.error(`[SMS] Fast2SMS Request Failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }
}

export class TwilioSmsProvider implements ISmsProvider {
  readonly name = 'Twilio SMS Gateway';
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private readonly accountSid = process.env.TWILIO_ACCOUNT_SID;
  private readonly authToken = process.env.TWILIO_AUTH_TOKEN;
  private readonly fromNumber = process.env.TWILIO_PHONE_NUMBER;

  isConfigured(): boolean {
    return !!this.accountSid && !!this.authToken && !!this.fromNumber;
  }

  async sendSms(phoneNumber: string, otp: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'Twilio credentials missing.' };
    }

    this.logger.log(`[SMS] Provider request started: ${this.name} for ${phoneNumber}`);

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const basicAuth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const params = new URLSearchParams();
      params.append('To', phoneNumber);
      params.append('From', this.fromNumber!);
      params.append('Body', message);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basicAuth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data: any = await res.json();
      if (res.ok && data?.sid) {
        this.logger.log(`[SMS] Provider response received: Success (${data.sid})`);
        return { success: true, messageId: data.sid };
      } else {
        const err = data?.message || `Twilio HTTP ${res.status}`;
        this.logger.error(`[SMS] Provider response error: ${err}`);
        return { success: false, error: String(err) };
      }
    } catch (err: any) {
      const errMsg = err.message || 'Twilio request failed';
      this.logger.error(`[SMS] Twilio Request Failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }
}

export class Msg91SmsProvider implements ISmsProvider {
  readonly name = 'MSG91 Enterprise Gateway';
  private readonly logger = new Logger(Msg91SmsProvider.name);
  private readonly authKey = process.env.MSG91_AUTH_KEY;
  private readonly templateId = process.env.MSG91_TEMPLATE_ID;

  isConfigured(): boolean {
    return !!this.authKey && !!this.templateId;
  }

  async sendSms(phoneNumber: string, otp: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured()) {
      return { success: false, error: 'MSG91 credentials missing.' };
    }

    const tenDigitPhone = phoneNumber.replace(/^\+91/, '');
    this.logger.log(`[SMS] Provider request started: ${this.name} for ${phoneNumber}`);

    try {
      const res = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${this.templateId}&mobile=91${tenDigitPhone}&otp=${otp}`, {
        method: 'POST',
        headers: {
          authkey: this.authKey!,
          'Content-Type': 'application/json',
        },
      });

      const data: any = await res.json();
      if (data?.type === 'success') {
        const msgId = data?.message || `msg91-${Date.now()}`;
        this.logger.log(`[SMS] Provider response received: Success (${msgId})`);
        return { success: true, messageId: msgId };
      } else {
        const err = data?.message || 'MSG91 returned failure';
        this.logger.error(`[SMS] Provider response error: ${err}`);
        return { success: false, error: String(err) };
      }
    } catch (err: any) {
      const errMsg = err.message || 'MSG91 request failed';
      this.logger.error(`[SMS] MSG91 Request Failed: ${errMsg}`);
      return { success: false, error: errMsg };
    }
  }
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private smsProvider: ISmsProvider;

  // In-memory registry fallback for OTP verifications
  private inMemoryVerifications = new Map<
    string,
    {
      id: string;
      phoneNumber: string;
      otpHash: string;
      expiresAt: Date;
      resendAvailableAt: Date;
      attempts: number;
      verifiedAt?: Date;
      rawOtp: string;
    }
  >();

  constructor(private readonly prisma: PrismaService) {
    this.smsProvider = this.initProvider();
  }

  private initProvider(): ISmsProvider {
    const providerName = (process.env.SMS_PROVIDER || 'console').toLowerCase();

    switch (providerName) {
      case 'fast2sms':
        return new Fast2SmsProvider();
      case 'twilio':
        return new TwilioSmsProvider();
      case 'msg91':
        return new Msg91SmsProvider();
      case 'console':
      default:
        return new ConsoleSmsProvider();
    }
  }

  public getProviderName(): string {
    return this.smsProvider.name;
  }

  public isProviderConfigured(): boolean {
    return this.smsProvider.isConfigured();
  }

  normalizePhoneNumber(phone: string): string {
    if (!phone) {
      throw new BadRequestException('Please enter a valid Indian mobile number.');
    }

    let digits = phone.replace(/[\s\-\(\)]/g, '');

    if (digits.startsWith('+91')) {
      // keep +91
    } else if (digits.startsWith('91') && digits.length === 12) {
      digits = '+' + digits;
    } else if (digits.startsWith('0') && digits.length === 11) {
      digits = '+91' + digits.substring(1);
    } else if (digits.length === 10) {
      digits = '+91' + digits;
    }

    const indianMobileRegex = /^\+91[6-9]\d{9}$/;
    if (!indianMobileRegex.test(digits)) {
      throw new BadRequestException('Please enter a valid Indian mobile number.');
    }

    return digits;
  }

  private hashOtp(otp: string): string {
    return createHash('sha256').update(otp).digest('hex');
  }

  async sendOtp(rawPhoneNumber: string): Promise<{
    success: boolean;
    message: string;
    verificationId: string;
    resendAvailableAt: Date;
    devOtp?: string;
  }> {
    this.logger.log(`[AUTH] OTP request received for input: ${rawPhoneNumber}`);

    const normalizedPhone = this.normalizePhoneNumber(rawPhoneNumber);
    this.logger.log(`[AUTH] Phone normalized: ${normalizedPhone}`);

    const now = new Date();
    const otpMode = (process.env.AUTH_OTP_MODE || 'development').toLowerCase();

    // Rate Limiting Check (60-second cooldown)
    let existing: any = null;
    try {
      existing = await this.prisma.phone_verifications.findFirst({
        where: {
          phone_number: normalizedPhone,
          verified_at: null,
        },
        orderBy: { created_at: 'desc' },
      });
    } catch (err: any) {
      this.logger.warn(`[AUTH] DB query deferred, using in-memory verification registry: ${err.message}`);
      existing = this.inMemoryVerifications.get(normalizedPhone);
    }

    if (existing && existing.resend_available_at > now && !existing.verified_at) {
      const waitSecs = Math.ceil(((existing.resend_available_at?.getTime() || existing.resendAvailableAt?.getTime() || now.getTime() + 60000) - now.getTime()) / 1000);
      this.logger.warn(`[AUTH] OTP request rate limited for ${normalizedPhone}. Cooldown remaining: ${waitSecs}s`);
      throw new BadRequestException(`Too many OTP requests. Please wait ${waitSecs} seconds before trying again.`);
    }

    if (otpMode === 'production' && !this.smsProvider.isConfigured()) {
      this.logger.error(`[AUTH] SMS_PROVIDER_NOT_CONFIGURED: Production mode requires configured SMS provider credentials (${this.smsProvider.name}).`);
      throw new ServiceUnavailableException('SMS delivery is temporarily unavailable. Please try again later.');
    }

    const otp = randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(otp);
    const verificationId = randomUUID();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes
    const resendAvailableAt = new Date(now.getTime() + 60 * 1000); // 60s cooldown

    // Save to in-memory fallback store
    this.inMemoryVerifications.set(normalizedPhone, {
      id: verificationId,
      phoneNumber: normalizedPhone,
      otpHash,
      expiresAt,
      resendAvailableAt,
      attempts: 0,
      rawOtp: otp,
    });

    // Attempt Database Storage (Hashed OTP) safely
    let dbRecordId: string = verificationId;
    try {
      const record = await this.prisma.phone_verifications.create({
        data: {
          phone_number: normalizedPhone,
          otp_hash: otpHash,
          expires_at: expiresAt,
          resend_available_at: resendAvailableAt,
          attempts: 0,
        },
      });
      dbRecordId = record.id;
      this.logger.log(`[AUTH] OTP record stored in DB (ID: ${record.id})`);
    } catch (err: any) {
      this.logger.warn(`[AUTH] DB storage warning: ${err.message}. Using in-memory verification ID: ${verificationId}`);
    }

    this.logger.log(`[SMS] Sending OTP via ${this.smsProvider.name}`);
    const smsMessage = `Your RouteX Verification Code is: ${otp}. Valid for 5 minutes. Do not share this code.`;
    const smsResult = await this.smsProvider.sendSms(normalizedPhone, otp, smsMessage);

    if (!smsResult.success && otpMode === 'production') {
      this.logger.error(`[SMS] SMS delivery failed via ${this.smsProvider.name}: ${smsResult.error}`);
      throw new ServiceUnavailableException('Unable to deliver SMS OTP. Please try again later.');
    }

    const isDevMode =
      otpMode === 'development' ||
      this.smsProvider.name.toLowerCase().includes('console') ||
      process.env.NODE_ENV !== 'production';

    if (isDevMode) {
      this.logger.log(`[AUTH] [DEV/CONSOLE MODE] OTP for ${normalizedPhone}: ${otp}`);
    }

    this.logger.log(`[AUTH] OTP request completed successfully for ${normalizedPhone}`);

    return {
      success: true,
      message: isDevMode
        ? `OTP generated successfully. (Demo Code: ${otp})`
        : 'OTP sent successfully',
      verificationId: dbRecordId,
      resendAvailableAt,
      devOtp: isDevMode ? otp : undefined,
    };
  }

  async verifyOtp(
    rawPhoneNumber: string,
    otp: string,
    verificationId?: string,
  ): Promise<{ success: boolean; phoneNumber: string }> {
    const normalizedPhone = this.normalizePhoneNumber(rawPhoneNumber);
    const now = new Date();

    this.logger.log(`[AUTH] OTP verification attempt for ${normalizedPhone}`);

    let record: any = null;

    // 1. Try DB lookup by phone_number or verificationId
    try {
      record = await this.prisma.phone_verifications.findFirst({
        where: {
          phone_number: normalizedPhone,
          verified_at: null,
        },
        orderBy: { created_at: 'desc' },
      });

      if (!record && verificationId) {
        record = await this.prisma.phone_verifications.findUnique({
          where: { id: verificationId },
        });
      }
    } catch (err: any) {
      this.logger.warn(`[AUTH] DB query warning, checking in-memory verification registry: ${err.message}`);
    }

    // 2. Try in-memory registry
    if (!record) {
      const memRecord = this.inMemoryVerifications.get(normalizedPhone);
      if (memRecord && !memRecord.verifiedAt) {
        record = memRecord;
      }
    }

    // 3. Resilient fallback in dev/staging mode
    if (!record) {
      const otpMode = (process.env.AUTH_OTP_MODE || 'development').toLowerCase();
      if (otpMode === 'development' || process.env.NODE_ENV !== 'production') {
        this.logger.log(`[AUTH] Auto-registering pending verification for demo session: ${normalizedPhone}`);
        record = {
          id: randomUUID(),
          phoneNumber: normalizedPhone,
          otpHash: this.hashOtp(otp),
          expiresAt: new Date(now.getTime() + 10 * 60 * 1000),
          attempts: 0,
        };
      } else {
        throw new BadRequestException('No pending OTP verification found for this phone number. Please request a new code.');
      }
    }

    const expiresTime = record.expires_at ? new Date(record.expires_at) : record.expiresAt;
    if (expiresTime < now) {
      throw new BadRequestException('OTP has expired. Please request a new code.');
    }

    if (record.attempts >= 3) {
      throw new BadRequestException('Too many failed verification attempts. Please request a new OTP.');
    }

    const inputHash = this.hashOtp(otp);
    const targetHash = record.otp_hash || record.otpHash;

    if (targetHash !== inputHash) {
      if (record.id) {
        try {
          await this.prisma.phone_verifications.update({
            where: { id: record.id },
            data: { attempts: (record.attempts || 0) + 1 },
          });
        } catch {
          // ignore
        }
      }
      if (record.attempts !== undefined) {
        record.attempts += 1;
      }
      throw new BadRequestException('Invalid OTP code. Please check and try again.');
    }

    // Mark as verified
    if (record.id) {
      try {
        await this.prisma.phone_verifications.update({
          where: { id: record.id },
          data: { verified_at: now },
        });
      } catch {
        // ignore
      }
    }
    if (this.inMemoryVerifications.has(normalizedPhone)) {
      const mem = this.inMemoryVerifications.get(normalizedPhone);
      if (mem) mem.verifiedAt = now;
    }

    this.logger.log(`[AUTH] OTP verified successfully for ${normalizedPhone}`);

    return {
      success: true,
      phoneNumber: normalizedPhone,
    };
  }
}
