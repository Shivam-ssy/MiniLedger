import { Router } from 'express';
import { SummaryController } from '../controllers/summary.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const summaryController = new SummaryController();

router.get('/summary', authMiddleware, (req, res, next) =>
  summaryController.getSummary(req, res, next),
);

export default router;
