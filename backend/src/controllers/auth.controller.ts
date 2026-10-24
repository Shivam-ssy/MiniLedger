import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { requestOtpSchema, verifyOtpSchema } from '../validators/auth.validator';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';
import { AppError } from '../errors/app-error';

export class AuthController {
  constructor(private readonly authService = new AuthService()) {}

  async requestOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = requestOtpSchema.parse(req.body);
      const result = await this.authService.requestOtp(validated.phone);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = verifyOtpSchema.parse(req.body);
      const result = await this.authService.verifyOtp(validated.phone, validated.otp);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized();
      }
      const user = await this.authService.getMe(req.user.id);
      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }
}
