import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/prisma';
import { signJwt } from '../../src/utils/jwt.util';
import { getUtcTodayDate } from '../../src/utils/date.util';
import { cleanDatabase } from '../setup';

const app = createApp();

describe('Loan APIs Integration Tests', () => {
  let userAId: string;
  let tokenA: string;
  let tokenB: string;

  beforeEach(async () => {
    await cleanDatabase();

    const userA = await prisma.user.create({ data: { phone: '+919900011111' } });
    userAId = userA.id;
    tokenA = signJwt({ userId: userA.id, phone: userA.phone });

    const userB = await prisma.user.create({ data: { phone: '+919900022222' } });
    tokenB = signJwt({ userId: userB.id, phone: userB.phone });
  });

  describe('POST /loans (Validation & Creation)', () => {
    it('creates loan successfully with amount in rupees and returns computed isOverdue', async () => {
      const todayStr = getUtcTodayDate().toISOString().split('T')[0]!;

      const res = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          friendName: 'Aman Gupta',
          amount: 1500.50,
          dueDate: todayStr,
        });

      expect(res.status).toBe(201);
      expect(res.body.loan).toBeDefined();
      expect(res.body.loan.friendName).toBe('Aman Gupta');
      expect(res.body.loan.amount).toBe(1500.5);
      expect(res.body.loan.dueDate).toBe(todayStr);
      expect(res.body.loan.status).toBe('PENDING');
      expect(res.body.loan.isOverdue).toBe(false); // Due today is NOT overdue
      expect(res.body.loan.repaidAt).toBeNull();
    });

    it('rejects invalid inputs with 400', async () => {
      // Empty friendName
      const res1 = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: '   ', amount: 500, dueDate: '2026-11-01' });
      expect(res1.status).toBe(400);

      // FriendName > 100 chars
      const res2 = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'a'.repeat(101), amount: 500, dueDate: '2026-11-01' });
      expect(res2.status).toBe(400);

      // Amount <= 0
      const res3 = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Bob', amount: 0, dueDate: '2026-11-01' });
      expect(res3.status).toBe(400);

      // Amount > 10,000,000
      const res4 = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Bob', amount: 10000001, dueDate: '2026-11-01' });
      expect(res4.status).toBe(400);

      // Amount with > 2 decimal places
      const res5 = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Bob', amount: 15.123, dueDate: '2026-11-01' });
      expect(res5.status).toBe(400);

      // Due date in the past
      const res6 = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ friendName: 'Bob', amount: 100, dueDate: '2020-01-01' });
      expect(res6.status).toBe(400);
    });
  });

  describe('Ownership Isolation', () => {
    it('returns 404 (not 403) when user attempts to access another users loan', async () => {
      // Create loan for User A
      const createRes = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          friendName: 'Private Friend',
          amount: 2000,
          dueDate: '2026-12-01',
        });
      const loanId = createRes.body.loan.id;

      // User B tries to get User A's loan
      const getRes = await request(app)
        .get(`/loans/${loanId}`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(getRes.status).toBe(404);
      expect(getRes.body.error.code).toBe('NOT_FOUND');

      // User B tries to repay User A's loan
      const repayRes = await request(app)
        .patch(`/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${tokenB}`);
      expect(repayRes.status).toBe(404);
      expect(repayRes.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 on invalid UUID and 404 on nonexistent UUID', async () => {
      const resInvalidUuid = await request(app)
        .get('/loans/non-uuid-string')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resInvalidUuid.status).toBe(400);

      const resNotFound = await request(app)
        .get('/loans/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(resNotFound.status).toBe(404);
    });
  });

  describe('Overdue Boundary & Sorting', () => {
    it('sorts overdue loans first, then by dueDate ASC', async () => {
      const today = getUtcTodayDate();
      const yesterday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 1));
      const twoDaysAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 2));
      const tomorrow = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1));
      const nextWeek = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 7));

      // Seed directly in DB to bypass create validation for past dates
      await prisma.loan.createMany({
        data: [
          { userId: userAId, friendName: 'Tomorrow Friend', amount: 10000, dueDate: tomorrow },
          { userId: userAId, friendName: 'Yesterday Friend', amount: 20000, dueDate: yesterday },
          { userId: userAId, friendName: 'Two Days Ago Friend', amount: 30000, dueDate: twoDaysAgo },
          { userId: userAId, friendName: 'Next Week Friend', amount: 40000, dueDate: nextWeek },
        ],
      });

      const res = await request(app)
        .get('/loans')
        .set('Authorization', `Bearer ${tokenA}`);

      expect(res.status).toBe(200);
      expect(res.body.loans.length).toBe(4);

      // Order should be:
      // 1. Two Days Ago (overdue)
      // 2. Yesterday (overdue)
      // 3. Tomorrow (not overdue)
      // 4. Next Week (not overdue)
      expect(res.body.loans[0].friendName).toBe('Two Days Ago Friend');
      expect(res.body.loans[0].isOverdue).toBe(true);

      expect(res.body.loans[1].friendName).toBe('Yesterday Friend');
      expect(res.body.loans[1].isOverdue).toBe(true);

      expect(res.body.loans[2].friendName).toBe('Tomorrow Friend');
      expect(res.body.loans[2].isOverdue).toBe(false);

      expect(res.body.loans[3].friendName).toBe('Next Week Friend');
      expect(res.body.loans[3].isOverdue).toBe(false);
    });
  });

  describe('PATCH /loans/:id/repay (Idempotency & Double Repay)', () => {
    it('marks pending loan as repaid and returns 409 on second attempt', async () => {
      const createRes = await request(app)
        .post('/loans')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          friendName: 'Sanjay Dutt',
          amount: 5000,
          dueDate: '2026-11-20',
        });
      const loanId = createRes.body.loan.id;

      // 1st repay
      const repay1 = await request(app)
        .patch(`/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(repay1.status).toBe(200);
      expect(repay1.body.loan.status).toBe('REPAID');
      expect(repay1.body.loan.repaidAt).not.toBeNull();

      // 2nd repay (must fail with 409 Conflict)
      const repay2 = await request(app)
        .patch(`/loans/${loanId}/repay`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(repay2.status).toBe(409);
      expect(repay2.body.error.code).toBe('CONFLICT');
      expect(repay2.body.error.message).toBe('Loan has already been marked as repaid');
    });
  });
});
