import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/prisma';
import { signJwt } from '../../src/utils/jwt.util';
import { getUtcTodayDate } from '../../src/utils/date.util';
import { cleanDatabase } from '../setup';

const app = createApp();

describe('Summary API Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it('returns zeros (not null) when user has no loans', async () => {
    const user = await prisma.user.create({ data: { phone: '+919911122233' } });
    const token = signJwt({ userId: user.id, phone: user.phone });

    const res = await request(app)
      .get('/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      totalLent: 0,
      totalRepaid: 0,
      overdueAmount: 0,
      outstanding: 0,
      counts: {
        total: 0,
        repaid: 0,
        overdue: 0,
      },
    });
  });

  it('correctly calculates totalLent, totalRepaid, overdueAmount, outstanding, and counts for caller only', async () => {
    const today = getUtcTodayDate();
    const past = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 5));
    const future = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 5));

    // User A
    const userA = await prisma.user.create({ data: { phone: '+919911133344' } });
    const tokenA = signJwt({ userId: userA.id, phone: userA.phone });

    // User B (to test cross-user isolation)
    const userB = await prisma.user.create({ data: { phone: '+919911144455' } });
    await prisma.loan.create({
      data: {
        userId: userB.id,
        friendName: 'User B Friend',
        amount: 99999900,
        dueDate: past,
        status: 'PENDING',
      },
    });

    // User A loans:
    // 1. Pending future: 500.25 (50025 paise)
    // 2. Pending overdue: 300.75 (30075 paise)
    // 3. Repaid: 200.00 (20000 paise)
    await prisma.loan.createMany({
      data: [
        { userId: userA.id, friendName: 'F1', amount: 50025, dueDate: future, status: 'PENDING' },
        { userId: userA.id, friendName: 'F2', amount: 30075, dueDate: past, status: 'PENDING' },
        { userId: userA.id, friendName: 'F3', amount: 20000, dueDate: past, status: 'REPAID', repaidAt: new Date() },
      ],
    });

    const res = await request(app)
      .get('/summary')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);

    // totalLent = 500.25 + 300.75 + 200.00 = 1001.00
    // totalRepaid = 200.00
    // overdueAmount = 300.75
    // outstanding = 1001.00 - 200.00 = 801.00
    // counts = { total: 3, repaid: 1, overdue: 1 }
    expect(res.body.totalLent).toBe(1001);
    expect(res.body.totalRepaid).toBe(200);
    expect(res.body.overdueAmount).toBe(300.75);
    expect(res.body.outstanding).toBe(801);
    expect(res.body.counts).toEqual({
      total: 3,
      repaid: 1,
      overdue: 1,
    });
  });
});
