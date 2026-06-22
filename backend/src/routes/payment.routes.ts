import { Router } from 'express';
import PaymentController from '../controllers/payment.controller';

const router = Router();

router.get('/config', PaymentController.config);
router.post('/initiate', PaymentController.initiate);
router.get('/return', PaymentController.return);
router.get('/fail', PaymentController.fail);

export default router;
