import dotenv from 'dotenv';
dotenv.config();

// Ensure test database is targeted during tests
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}

import { prisma } from '../src/prisma';

export async function cleanDatabase(): Promise<void> {
  await prisma.loan.deleteMany({});
  await prisma.otp.deleteMany({});
  await prisma.user.deleteMany({});
}

afterAll(async () => {
  await prisma.$disconnect();
});
