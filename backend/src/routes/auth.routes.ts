import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
const authController = new AuthController();

router.post('/auth/request-otp', (req, res, next) => authController.requestOtp(req, res, next));
router.post('/auth/verify-otp', (req, res, next) => authController.verifyOtp(req, res, next));
router.get('/auth/me', authMiddleware, (req, res, next) => authController.getMe(req, res, next));

export default router;
