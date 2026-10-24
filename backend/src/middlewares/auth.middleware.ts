import { Request, Response, NextFunction } from 'express';
import { verifyJwt } from '../utils/jwt.util';
import { AppError } from '../errors/app-error';

export interface AuthenticatedUser {
  id: string;
  phone: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function authMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next(AppError.unauthorized('Missing authorization header'));
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    next(AppError.unauthorized('Malformed authorization header'));
    return;
  }

  const token = parts[1];
  try {
    const payload = verifyJwt(token);
    req.user = {
      id: payload.userId,
      phone: payload.phone,
    };
    next();
  } catch {
    next(AppError.unauthorized('Invalid or expired token'));
  }
}
