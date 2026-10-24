import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/prisma';
import { hashOtp } from '../../src/utils/crypto.util';
import { signJwt } from '../../src/utils/jwt.util';
import { cleanDatabase } from '../setup';
import jwt from 'jsonwebtoken';

const app = createApp();

describe('Auth API Integration Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('POST /auth/request-otp', () => {
    it('generates OTP, stores hashed, does not return OTP in response', async () => {
      const res = await request(app)
        .post('/auth/request-otp')
        .send({ phone: '9811122233' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'OTP sent successfully' });
      expect(res.body.otp).toBeUndefined();

      // Check DB entry: codeHash exists, phone normalized to +919811122233
      const otpRecord = await prisma.otp.findFirst({
        where: { phone: '+919811122233' },
      });
      expect(otpRecord).toBeDefined();
      expect(otpRecord?.codeHash).toBeDefined();
      expect(otpRecord?.attempts).toBe(0);
      expect(otpRecord?.consumedAt).toBeNull();
    });

    it('enforces 30-second cooldown between requests (returns 429 with retryAfter)', async () => {
      const res1 = await request(app)
        .post('/auth/request-otp')
        .send({ phone: '9811122233' });
      expect(res1.status).toBe(200);

      const res2 = await request(app)
        .post('/auth/request-otp')
        .send({ phone: '9811122233' });
      expect(res2.status).toBe(429);
      expect(res2.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(res2.body.error.details.retryAfter).toBeGreaterThan(0);
    });

    it('enforces max 5 OTPs per hour per phone (returns 429)', async () => {
      const phone = '+919811100000';
      const now = Date.now();

      // Seed 5 past OTPs in the last 40 minutes (spaced out by 5 minutes so cooldown doesn't trigger)
      for (let i = 5; i >= 1; i--) {
        await prisma.otp.create({
          data: {
            phone,
            codeHash: 'hash',
            createdAt: new Date(now - i * 5 * 60 * 1000),
            expiresAt: new Date(now + 5 * 60 * 1000),
          },
        });
      }

      const res = await request(app)
        .post('/auth/request-otp')
        .send({ phone: '9811100000' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(res.body.error.message).toContain('Maximum 5 OTP requests per hour');
    });

    it('invalidates previous unconsumed OTPs when a new OTP is requested', async () => {
      const phone = '+919811122233';

      // Manually create an older active OTP
      const oldOtp = await prisma.otp.create({
        data: {
          phone,
          codeHash: hashOtp('111111'),
          createdAt: new Date(Date.now() - 40 * 1000), // 40s ago (cooldown passed)
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      // Request new OTP
      await request(app).post('/auth/request-otp').send({ phone });

      // Check that older OTP is marked as consumed
      const updatedOldOtp = await prisma.otp.findUnique({
        where: { id: oldOtp.id },
      });
      expect(updatedOldOtp?.consumedAt).not.toBeNull();
    });
  });

  describe('POST /auth/verify-otp', () => {
    it('verifies valid OTP, creates user on first login, and returns JWT', async () => {
      const phone = '+919811133344';
      const otp = '654321';
      await prisma.otp.create({
        data: {
          phone,
          codeHash: hashOtp(otp),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: '9811133344', otp });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.phone).toBe(phone);

      // Verify OTP is marked consumed
      const record = await prisma.otp.findFirst({ where: { phone } });
      expect(record?.consumedAt).not.toBeNull();
    });

    it('replaying an already consumed OTP fails with generic 400', async () => {
      const phone = '+919811133344';
      const otp = '654321';
      await prisma.otp.create({
        data: {
          phone,
          codeHash: hashOtp(otp),
          consumedAt: new Date(),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: '9811133344', otp });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toBe('Invalid or expired OTP');
    });

    it('locks OTP after 5 wrong attempts', async () => {
      const phone = '+919811144455';
      const correctOtp = '999999';
      await prisma.otp.create({
        data: {
          phone,
          codeHash: hashOtp(correctOtp),
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      // 5 wrong attempts
      for (let i = 0; i < 5; i++) {
        const res = await request(app)
          .post('/auth/verify-otp')
          .send({ phone: '9811144455', otp: '123456' });
        expect(res.status).toBe(400);
        expect(res.body.error.message).toBe('Invalid or expired OTP');
      }

      // Now try with correct OTP: must still fail because it is locked
      const resLocked = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: '9811144455', otp: correctOtp });
      expect(resLocked.status).toBe(400);
      expect(resLocked.body.error.message).toBe('Invalid or expired OTP');
    });

    it('fails with generic 400 if OTP is expired', async () => {
      const phone = '+919811155566';
      await prisma.otp.create({
        data: {
          phone,
          codeHash: hashOtp('123456'),
          expiresAt: new Date(Date.now() - 1000), // Expired 1 sec ago
        },
      });

      const res = await request(app)
        .post('/auth/verify-otp')
        .send({ phone: '9811155566', otp: '123456' });

      expect(res.status).toBe(400);
      expect(res.body.error.message).toBe('Invalid or expired OTP');
    });
  });

  describe('GET /auth/me', () => {
    it('returns user profile for valid authenticated user', async () => {
      const user = await prisma.user.create({
        data: { phone: '+919877788899' },
      });
      const token = signJwt({ userId: user.id, phone: user.phone });

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(user.id);
      expect(res.body.user.phone).toBe(user.phone);
    });

    it('returns 401 when token is missing or malformed', async () => {
      const resNoHeader = await request(app).get('/auth/me');
      expect(resNoHeader.status).toBe(401);
      expect(resNoHeader.body.error.code).toBe('UNAUTHORIZED');

      const resMalformed = await request(app)
        .get('/auth/me')
        .set('Authorization', 'InvalidFormatHeader');
      expect(resMalformed.status).toBe(401);
    });

    it('returns 401 when token is expired', async () => {
      const expiredToken = jwt.sign(
        { userId: 'fake-id', phone: '+919999999999' },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: -1 },
      );

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });
});
