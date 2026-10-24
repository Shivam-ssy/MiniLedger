import { SummaryRepository } from '../repositories/summary.repository';
import { paiseToRupees } from '../utils/money.util';

export interface SummaryDto {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
  outstanding: number;
  counts: {
    total: number;
    repaid: number;
    overdue: number;
  };
}

export class SummaryService {
  constructor(private readonly summaryRepo = new SummaryRepository()) {}

  async getSummary(userId: string): Promise<SummaryDto> {
    const row = await this.summaryRepo.getSummaryByUserId(userId);

    const totalLentPaise = Number(row.totalLentPaise);
    const totalRepaidPaise = Number(row.totalRepaidPaise);
    const overdueAmountPaise = Number(row.overdueAmountPaise);
    const outstandingPaise = totalLentPaise - totalRepaidPaise;

    return {
      totalLent: paiseToRupees(totalLentPaise),
      totalRepaid: paiseToRupees(totalRepaidPaise),
      overdueAmount: paiseToRupees(overdueAmountPaise),
      outstanding: paiseToRupees(outstandingPaise),
      counts: {
        total: Number(row.totalCount),
        repaid: Number(row.repaidCount),
        overdue: Number(row.overdueCount),
      },
    };
  }
}
