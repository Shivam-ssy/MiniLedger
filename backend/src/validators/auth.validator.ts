import { z } from 'zod';

export const requestOtpSchema = z.object({
  phone: z.string({ required_error: 'Phone number is required' }).min(1, 'Phone number is required'),
});

export const verifyOtpSchema = z.object({
  phone: z.string({ required_error: 'Phone number is required' }).min(1, 'Phone number is required'),
  otp: z.string({ required_error: 'OTP is required' }).length(6, 'OTP must be exactly 6 digits'),
});

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
