import { Router } from 'express';
import PaymentController from '../controllers/payment.controller';
import { paymentInitiateLimiter, paymentSyncLimiter } from '../middleware/payment-rate-limit.middleware';

const router = Router();

router.get('/config', PaymentController.config);
router.post('/initiate', paymentInitiateLimiter, PaymentController.initiate);
router.post('/sync', paymentSyncLimiter, PaymentController.sync);
router.get('/return', PaymentController.return);
router.get('/fail', PaymentController.fail);

export default router;
