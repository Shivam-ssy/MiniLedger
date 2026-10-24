import { Otp } from '@prisma/client';
import { prisma } from '../prisma';

export class OtpRepository {
  async findLatestByPhone(phone: string): Promise<Otp | null> {
    return prisma.otp.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOtpsSince(phone: string, since: Date): Promise<Otp[]> {
    return prisma.otp.findMany({
      where: {
        phone,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async invalidatePreviousOtps(phone: string): Promise<void> {
    await prisma.otp.updateMany({
      where: {
        phone,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });
  }

  async createOtp(phone: string, codeHash: string, expiresAt: Date): Promise<Otp> {
    return prisma.otp.create({
      data: {
        phone,
        codeHash,
        expiresAt,
      },
    });
  }

  async incrementAttempts(id: string): Promise<Otp> {
    return prisma.otp.update({
      where: { id },
      data: {
        attempts: { increment: 1 },
      },
    });
  }

  async markConsumed(id: string): Promise<Otp> {
    return prisma.otp.update({
      where: { id },
      data: {
        consumedAt: new Date(),
      },
    });
  }
}
