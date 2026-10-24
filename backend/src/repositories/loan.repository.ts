import { Loan, LoanStatus, Prisma } from '@prisma/client';
import { prisma } from '../prisma';
import { getUtcTodayDate } from '../utils/date.util';

export interface FindLoansFilter {
  status?: 'PENDING' | 'REPAID';
  overdue?: boolean;
  page: number;
  limit: number;
}

export interface PaginatedLoans {
  loans: Loan[];
  total: number;
}

export class LoanRepository {
  async create(
    userId: string,
    friendName: string,
    amountInPaise: number,
    dueDate: Date,
  ): Promise<Loan> {
    return prisma.loan.create({
      data: {
        userId,
        friendName,
        amount: amountInPaise,
        dueDate,
        status: LoanStatus.PENDING,
      },
    });
  }

  async findByIdAndUser(id: string, userId: string): Promise<Loan | null> {
    return prisma.loan.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async findManyByUser(userId: string, filter: FindLoansFilter): Promise<PaginatedLoans> {
    const today = getUtcTodayDate();
    const offset = (filter.page - 1) * filter.limit;

    // Build dynamic conditions for raw parameterized query
    // Always overdue first, then dueDate ASC, then createdAt DESC
    const statusCondition = filter.status
      ? Prisma.sql`AND status = ${filter.status}::"LoanStatus"`
      : Prisma.empty;

    let overdueCondition = Prisma.empty;
    if (filter.overdue === true) {
      overdueCondition = Prisma.sql`AND status = 'PENDING'::"LoanStatus" AND "dueDate" < ${today}::date`;
    } else if (filter.overdue === false) {
      overdueCondition = Prisma.sql`AND (status = 'REPAID'::"LoanStatus" OR "dueDate" >= ${today}::date)`;
    }

    const [loans, countResult] = await Promise.all([
      prisma.$queryRaw<Loan[]>`
        SELECT * FROM "loans"
        WHERE "userId" = ${userId}::uuid
        ${statusCondition}
        ${overdueCondition}
        ORDER BY
          CASE WHEN status = 'PENDING'::"LoanStatus" AND "dueDate" < ${today}::date THEN 0 ELSE 1 END ASC,
          "dueDate" ASC,
          "createdAt" DESC
        LIMIT ${filter.limit} OFFSET ${offset}
      `,
      prisma.$queryRaw<{ count: bigint }[]>`
        SELECT COUNT(*)::bigint as count FROM "loans"
        WHERE "userId" = ${userId}::uuid
        ${statusCondition}
        ${overdueCondition}
      `,
    ]);

    const total = countResult[0] ? Number(countResult[0].count) : 0;

    return {
      loans,
      total,
    };
  }

  /**
   * Race-safe conditional update: WHERE status = 'PENDING'.
   * Returns:
   * - null: loan not found for this user
   * - 'ALREADY_REPAID': loan exists but is already repaid
   * - Loan: successfully marked as repaid
   */
  async repayLoan(
    id: string,
    userId: string,
  ): Promise<{ status: 'NOT_FOUND' | 'ALREADY_REPAID' | 'SUCCESS'; loan?: Loan }> {
    const existing = await this.findByIdAndUser(id, userId);
    if (!existing) {
      return { status: 'NOT_FOUND' };
    }

    if (existing.status === LoanStatus.REPAID) {
      return { status: 'ALREADY_REPAID' };
    }

    const now = new Date();
    const updated = await prisma.$queryRaw<Loan[]>`
      UPDATE "loans"
      SET status = 'REPAID'::"LoanStatus", "repaidAt" = ${now}
      WHERE id = ${id}::uuid AND "userId" = ${userId}::uuid AND status = 'PENDING'::"LoanStatus"
      RETURNING *
    `;

    if (!updated[0]) {
      return { status: 'ALREADY_REPAID' };
    }

    return { status: 'SUCCESS', loan: updated[0] };
  }

  async updateReceiptUrl(id: string, userId: string, receiptUrl: string): Promise<Loan | null> {
    const existing = await this.findByIdAndUser(id, userId);
    if (!existing) {
      return null;
    }

    return prisma.loan.update({
      where: { id },
      data: { receiptUrl },
    });
  }
}
