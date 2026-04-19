import { Router } from 'express';
import FinanceController from '../controllers/finance.controller';

const router = Router();

router.get('/student-transactions', FinanceController.listStudent);
router.get('/transactions', FinanceController.list);
router.post('/transactions', FinanceController.create);
router.patch('/transactions/:id', FinanceController.update);

export default router;
