import { Router } from 'express';
import FinanceController from '../controllers/finance.controller';

const router = Router();

router.get('/transactions', FinanceController.list);
router.post('/transactions', FinanceController.create);

export default router;
