import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { LoanService } from '../services/loan.service';
import {
  createLoanSchema,
  loanQuerySchema,
  loanIdParamSchema,
} from '../validators/loan.validator';
import { AppError } from '../errors/app-error';

export class LoanController {
  constructor(private readonly loanService = new LoanService()) {}

  async create(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }
      const validated = createLoanSchema.parse(req.body);
      const loan = await this.loanService.createLoan(req.user.id, validated);
      res.status(201).json({ loan });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }
      const query = loanQuerySchema.parse(req.query);
      const result = await this.loanService.getLoans(req.user.id, query);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }
      const { id } = loanIdParamSchema.parse(req.params);
      const loan = await this.loanService.getLoanById(id, req.user.id);
      res.status(200).json({ loan });
    } catch (err) {
      next(err);
    }
  }

  async repay(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }
      const { id } = loanIdParamSchema.parse(req.params);
      const loan = await this.loanService.repayLoan(id, req.user.id);
      res.status(200).json({ loan });
    } catch (err) {
      next(err);
    }
  }

  async uploadReceipt(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }
      const { id } = loanIdParamSchema.parse(req.params);
      const loan = await this.loanService.uploadReceipt(id, req.user.id, req.file);
      res.status(200).json({ loan });
    } catch (err) {
      next(err);
    }
  }
}

