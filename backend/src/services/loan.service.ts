import { Loan } from '@prisma/client';
import { LoanRepository, FindLoansFilter } from '../repositories/loan.repository';
import { rupeesToPaise, paiseToRupees } from '../utils/money.util';
import { parseUtcDateOnly, isLoanOverdue } from '../utils/date.util';
import { AppError } from '../errors/app-error';

export interface LoanDto {
  id: string;
  userId: string;
  friendName: string;
  amount: number; // in rupees with 2 decimals
  dueDate: string; // ISO date string YYYY-MM-DD
  status: 'PENDING' | 'REPAID';
  isOverdue: boolean;
  repaidAt: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

export interface PaginatedLoansDto {
  loans: LoanDto[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class LoanService {
  constructor(private readonly loanRepo = new LoanRepository()) {}

  private mapToDto(loan: Loan): LoanDto {
    const isOverdue = isLoanOverdue(loan.status, loan.dueDate);
    const dueDateStr = loan.dueDate instanceof Date
      ? loan.dueDate.toISOString().split('T')[0] || ''
      : String(loan.dueDate).split('T')[0] || '';

    return {
      id: loan.id,
      userId: loan.userId,
      friendName: loan.friendName,
      amount: paiseToRupees(loan.amount),
      dueDate: dueDateStr,
      status: loan.status as 'PENDING' | 'REPAID',
      isOverdue,
      repaidAt: loan.repaidAt ? loan.repaidAt.toISOString() : null,
      receiptUrl: loan.receiptUrl,
      createdAt: loan.createdAt.toISOString(),
    };
  }

  async createLoan(
    userId: string,
    data: { friendName: string; amount: number; dueDate: string },
  ): Promise<LoanDto> {
    const amountInPaise = rupeesToPaise(data.amount);
    const dueDate = parseUtcDateOnly(data.dueDate);

    const loan = await this.loanRepo.create(userId, data.friendName, amountInPaise, dueDate);
    return this.mapToDto(loan);
  }

  async getLoans(userId: string, filter: FindLoansFilter): Promise<PaginatedLoansDto> {
    const { loans, total } = await this.loanRepo.findManyByUser(userId, filter);
    const totalPages = Math.ceil(total / filter.limit) || 1;

    return {
      loans: loans.map((l) => this.mapToDto(l)),
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages,
      },
    };
  }

  async getLoanById(id: string, userId: string): Promise<LoanDto> {
    const loan = await this.loanRepo.findByIdAndUser(id, userId);
    if (!loan) {
      throw AppError.notFound('Loan not found');
    }
    return this.mapToDto(loan);
  }

  async repayLoan(id: string, userId: string): Promise<LoanDto> {
    const result = await this.loanRepo.repayLoan(id, userId);
    if (result.status === 'NOT_FOUND') {
      throw AppError.notFound('Loan not found');
    }
    if (result.status === 'ALREADY_REPAID') {
      throw AppError.conflict('Loan has already been marked as repaid');
    }
    if (!result.loan) {
      throw AppError.conflict('Loan has already been marked as repaid');
    }

    return this.mapToDto(result.loan);
  }

  async uploadReceipt(
    id: string,
    userId: string,
    file: Express.Multer.File | undefined,
  ): Promise<LoanDto> {
    if (!file) {
      throw AppError.badRequest('Receipt file is required');
    }

    const { validateImageMagicBytes } = await import('../utils/file-validator.util');
    const validation = validateImageMagicBytes(file.buffer);
    if (!validation.valid || !validation.ext) {
      throw AppError.badRequest(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed.',
      );
    }

    const loan = await this.loanRepo.findByIdAndUser(id, userId);
    if (!loan) {
      throw AppError.notFound('Loan not found');
    }

    const crypto = await import('crypto');
    const path = await import('path');
    const fs = await import('fs');

    const uploadDir = process.env.UPLOAD_DIR || 'uploads';
    const uploadPath = path.resolve(process.cwd(), uploadDir);
    await fs.promises.mkdir(uploadPath, { recursive: true });

    const filename = `${crypto.randomUUID()}.${validation.ext}`;
    const newFilePath = path.join(uploadPath, filename);

    // Save newly uploaded file
    await fs.promises.writeFile(newFilePath, file.buffer);

    try {
      const receiptUrl = `/uploads/${filename}`;
      const updated = await this.loanRepo.updateReceiptUrl(id, userId, receiptUrl);
      if (!updated) {
        throw AppError.notFound('Loan not found');
      }

      // If previous receipt existed, safely remove old file
      if (loan.receiptUrl) {
        const oldFilename = path.basename(loan.receiptUrl);
        const oldFilePath = path.join(uploadPath, oldFilename);
        fs.promises.unlink(oldFilePath).catch(() => {});
      }

      return this.mapToDto(updated);
    } catch (err) {
      // Cleanup newly saved file if database update fails
      await fs.promises.unlink(newFilePath).catch(() => {});
      throw err;
    }
  }
}

