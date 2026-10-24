import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { SummaryService } from '../services/summary.service';
import { AppError } from '../errors/app-error';

export class SummaryController {
  constructor(private readonly summaryService = new SummaryService()) {}

  async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }
      const summary = await this.summaryService.getSummary(req.user.id);
      res.status(200).json(summary);
    } catch (err) {
      next(err);
    }
  }
}
