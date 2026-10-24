import { UserRepository } from '../repositories/user.repository';
import { OtpRepository } from '../repositories/otp.repository';
import { normalizePhone } from '../utils/phone.util';
import { generateSixDigitOtp, hashOtp, verifyOtpHash } from '../utils/crypto.util';
import { signJwt } from '../utils/jwt.util';
import { AppError } from '../errors/app-error';

export interface UserResponse {
  id: string;
  phone: string;
  createdAt: Date;
}

export interface VerifyOtpResponse {
  accessToken: string;
  user: UserResponse;
}

export class AuthService {
  constructor(
    private readonly userRepo = new UserRepository(),
    private readonly otpRepo = new OtpRepository(),
  ) {}

  async requestOtp(rawPhone: string): Promise<{ message: string }> {
    const phone = normalizePhone(rawPhone);
    const now = Date.now();

    // 1. Check 30s cooldown from the most recent OTP request
    const latestOtp = await this.otpRepo.findLatestByPhone(phone);
    if (latestOtp) {
      const elapsedMs = now - latestOtp.createdAt.getTime();
      if (elapsedMs < 30_000) {
        const retryAfter = Math.ceil((30_000 - elapsedMs) / 1000);
        throw AppError.tooManyRequests(
          `Please wait ${retryAfter}s before requesting another OTP`,
          { retryAfter },
        );
      }
    }

    // 2. Check 5 OTPs per hour rate limit
    const oneHourAgo = new Date(now - 3600 * 1000);
    const recentOtps = await this.otpRepo.findOtpsSince(phone, oneHourAgo);
    if (recentOtps.length >= 5) {
      const oldestInWindow = recentOtps[0];
      const retryAfter = oldestInWindow
        ? Math.max(1, Math.ceil((oldestInWindow.createdAt.getTime() + 3600 * 1000 - now) / 1000))
        : 3600;
      throw AppError.tooManyRequests(
        'Maximum 5 OTP requests per hour reached. Please try again later.',
        { retryAfter },
      );
    }

    // 3. Invalidate previous OTPs for this phone
    await this.otpRepo.invalidatePreviousOtps(phone);

    // 4. Generate 6-digit OTP & hash
    const otp = generateSixDigitOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(now + 5 * 60 * 1000); // 5 minutes

    await this.otpRepo.createOtp(phone, codeHash, expiresAt);

    // Single mock-SMS log line as required by spec
    // eslint-disable-next-line no-console
    console.log(`[MOCK SMS] Phone: ${phone} | OTP: ${otp} (expires in 5 minutes)`);

    return { message: 'OTP sent successfully' };
  }

  async verifyOtp(rawPhone: string, rawOtp: string): Promise<VerifyOtpResponse> {
    const phone = normalizePhone(rawPhone);
    const otp = typeof rawOtp === 'string' ? rawOtp.trim() : '';

    const genericError = AppError.badRequest('Invalid or expired OTP');

    if (!/^\d{6}$/.test(otp)) {
      throw genericError;
    }

    const latestOtp = await this.otpRepo.findLatestByPhone(phone);
    if (!latestOtp) {
      throw genericError;
    }

    // Already consumed, expired, or locked due to >= 5 attempts
    if (latestOtp.consumedAt !== null || latestOtp.expiresAt.getTime() < Date.now() || latestOtp.attempts >= 5) {
      throw genericError;
    }

    // Constant-time compare
    const isMatch = verifyOtpHash(otp, latestOtp.codeHash);
    if (!isMatch) {
      await this.otpRepo.incrementAttempts(latestOtp.id);
      throw genericError;
    }

    // Valid: mark OTP consumed
    await this.otpRepo.markConsumed(latestOtp.id);

    // Find or create user (atomic upsert handling concurrent first-login)
    const user = await this.userRepo.findOrCreate(phone);
    const accessToken = signJwt({ userId: user.id, phone: user.phone });

    return {
      accessToken,
      user: {
        id: user.id,
        phone: user.phone,
        createdAt: user.createdAt,
      },
    };
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    return {
      id: user.id,
      phone: user.phone,
      createdAt: user.createdAt,
    };
  }
}
