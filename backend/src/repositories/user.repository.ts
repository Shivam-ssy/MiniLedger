import { User } from '@prisma/client';
import { prisma } from '../prisma';

export class UserRepository {
  async findByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { phone },
    });
  }

  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async findOrCreate(phone: string): Promise<User> {
    try {
      return await prisma.user.upsert({
        where: { phone },
        update: {},
        create: { phone },
      });
    } catch {
      // In case of high concurrency conflict, fetch existing record
      const existing = await this.findByPhone(phone);
      if (existing) {
        return existing;
      }
      throw new Error('Failed to create or find user');
    }
  }
}
