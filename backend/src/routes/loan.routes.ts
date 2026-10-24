import { Router } from 'express';
import { LoanController } from '../controllers/loan.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { uploadReceiptMiddleware } from '../middlewares/upload.middleware';

const router = Router();
const loanController = new LoanController();

router.use('/loans', authMiddleware);

router.post('/loans', (req, res, next) => loanController.create(req, res, next));
router.get('/loans', (req, res, next) => loanController.getAll(req, res, next));
router.get('/loans/:id', (req, res, next) => loanController.getById(req, res, next));
router.patch('/loans/:id/repay', (req, res, next) => loanController.repay(req, res, next));
router.post('/loans/:id/receipt', uploadReceiptMiddleware, (req, res, next) =>
  loanController.uploadReceipt(req, res, next),
);

export default router;
