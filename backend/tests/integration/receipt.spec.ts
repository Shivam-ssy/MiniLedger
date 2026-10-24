import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../src/app';
import { prisma } from '../../src/prisma';
import { signJwt } from '../../src/utils/jwt.util';
import { cleanDatabase } from '../setup';

const app = createApp();

describe('Receipt Upload Integration Tests', () => {
  let userAId: string;
  let tokenA: string;
  let tokenB: string;
  let loanId: string;

  beforeEach(async () => {
    await cleanDatabase();

    const userA = await prisma.user.create({ data: { phone: '+919922211100' } });
    userAId = userA.id;
    tokenA = signJwt({ userId: userA.id, phone: userA.phone });

    const userB = await prisma.user.create({ data: { phone: '+919922211199' } });
    tokenB = signJwt({ userId: userB.id, phone: userB.phone });

    const loan = await prisma.loan.create({
      data: {
        userId: userAId,
        friendName: 'Receipt Friend',
        amount: 250000,
        dueDate: new Date(),
        status: 'PENDING',
      },
    });
    loanId = loan.id;
  });

  it('rejects upload when file is missing with 400', async () => {
    const res = await request(app)
      .post(`/loans/${loanId}/receipt`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Receipt file is required');
  });

  it('rejects file that does not match JPEG/PNG/WebP magic bytes with 400', async () => {
    const fakeBuffer = Buffer.from('Just plain text content inside fake.png');

    const res = await request(app)
      .post(`/loans/${loanId}/receipt`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('receipt', fakeBuffer, 'fake.png');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(res.body.error.message).toContain('Only JPEG, PNG, and WebP images are allowed');
  });

  it('rejects files larger than 5MB with 413', async () => {
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 100, 0xff);

    const res = await request(app)
      .post(`/loans/${loanId}/receipt`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('receipt', largeBuffer, 'huge.jpg');

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('returns 404 when non-owner attempts to upload receipt', async () => {
    const validPngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);

    const res = await request(app)
      .post(`/loans/${loanId}/receipt`)
      .set('Authorization', `Bearer ${tokenB}`)
      .attach('receipt', validPngBuffer, 'receipt.png');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('uploads valid image, replaces old file on re-upload, and serves statically', async () => {
    // 1. Upload valid PNG
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);

    const res1 = await request(app)
      .post(`/loans/${loanId}/receipt`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('receipt', pngBuffer, 'first.png');

    expect(res1.status).toBe(200);
    expect(res1.body.loan.receiptUrl).toMatch(/^\/uploads\/.+\.png$/);
    const firstUrl = res1.body.loan.receiptUrl;

    const firstFilename = path.basename(firstUrl);
    const firstFilePath = path.resolve(process.cwd(), 'uploads', firstFilename);
    expect(fs.existsSync(firstFilePath)).toBe(true);

    // Verify static serve
    const staticRes = await request(app).get(firstUrl);
    expect(staticRes.status).toBe(200);

    // 2. Upload replacement JPEG
    const jpegBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);

    const res2 = await request(app)
      .post(`/loans/${loanId}/receipt`)
      .set('Authorization', `Bearer ${tokenA}`)
      .attach('receipt', jpegBuffer, 'second.jpg');

    expect(res2.status).toBe(200);
    expect(res2.body.loan.receiptUrl).toMatch(/^\/uploads\/.+\.jpg$/);
    const secondUrl = res2.body.loan.receiptUrl;

    // First file must be removed
    expect(fs.existsSync(firstFilePath)).toBe(false);

    // Second file must exist
    const secondFilename = path.basename(secondUrl);
    const secondFilePath = path.resolve(process.cwd(), 'uploads', secondFilename);
    expect(fs.existsSync(secondFilePath)).toBe(true);

    // Cleanup
    if (fs.existsSync(secondFilePath)) {
      fs.unlinkSync(secondFilePath);
    }
  });
});
