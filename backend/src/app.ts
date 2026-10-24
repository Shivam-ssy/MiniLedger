import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import { requestLogger } from './middlewares/request-logger.middleware';
import { errorHandler } from './middlewares/error-handler.middleware';
import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import loanRoutes from './routes/loan.routes';
import summaryRoutes from './routes/summary.routes';
import { AppError } from './errors/app-error';

export function createApp(): Application {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  // Serve static uploads
  const uploadDir = process.env.UPLOAD_DIR || 'uploads';
  app.use('/uploads', express.static(path.resolve(process.cwd(), uploadDir)));

  // Root health & API routes
  app.use(healthRoutes);
  app.use(authRoutes);
  app.use(loanRoutes);
  app.use(summaryRoutes);

  // 404 handler
  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(AppError.notFound('Route not found'));
  });

  // Central error handler
  app.use(errorHandler);

  return app;
}
