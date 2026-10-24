import crypto from 'crypto';

const OTP_SECRET_SALT = process.env.OTP_SALT || 'miniledger-otp-salt-constant';

export function generateSixDigitOtp(): string {
  // Generates integer between 100000 and 999999 inclusive
  return crypto.randomInt(100000, 1000000).toString();
}

export function hashOtp(otp: string): string {
  return crypto
    .createHmac('sha256', OTP_SECRET_SALT)
    .update(otp)
    .digest('hex');
}

export function verifyOtpHash(inputOtp: string, storedHash: string): boolean {
  const inputHash = hashOtp(inputOtp);
  const inputBuffer = Buffer.from(inputHash, 'hex');
  const storedBuffer = Buffer.from(storedHash, 'hex');

  if (inputBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(inputBuffer, storedBuffer);
}
