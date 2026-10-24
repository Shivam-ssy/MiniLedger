import { prisma } from '../prisma';
import { getUtcTodayDate } from '../utils/date.util';

export interface AggregateSummaryRow {
  totalLentPaise: bigint;
  totalRepaidPaise: bigint;
  overdueAmountPaise: bigint;
  totalCount: bigint;
  repaidCount: bigint;
  overdueCount: bigint;
}

export class SummaryRepository {
  async getSummaryByUserId(userId: string): Promise<AggregateSummaryRow> {
    const today = getUtcTodayDate();

    const rows = await prisma.$queryRaw<AggregateSummaryRow[]>`
      SELECT
        COALESCE(SUM(amount), 0)::bigint AS "totalLentPaise",
        COALESCE(SUM(CASE WHEN status = 'REPAID'::"LoanStatus" THEN amount ELSE 0 END), 0)::bigint AS "totalRepaidPaise",
        COALESCE(SUM(CASE WHEN status = 'PENDING'::"LoanStatus" AND "dueDate" < ${today}::date THEN amount ELSE 0 END), 0)::bigint AS "overdueAmountPaise",
        COUNT(*)::bigint AS "totalCount",
        COALESCE(COUNT(CASE WHEN status = 'REPAID'::"LoanStatus" THEN 1 END), 0)::bigint AS "repaidCount",
        COALESCE(COUNT(CASE WHEN status = 'PENDING'::"LoanStatus" AND "dueDate" < ${today}::date THEN 1 END), 0)::bigint AS "overdueCount"
      FROM "loans"
      WHERE "userId" = ${userId}::uuid
    `;

    return (
      rows[0] ?? {
        totalLentPaise: BigInt(0),
        totalRepaidPaise: BigInt(0),
        overdueAmountPaise: BigInt(0),
        totalCount: BigInt(0),
        repaidCount: BigInt(0),
        overdueCount: BigInt(0),
      }
    );
  }
}
