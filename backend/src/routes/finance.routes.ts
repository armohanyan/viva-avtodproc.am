import { Router } from 'express';
import FinanceController from '../controllers/finance.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/student-transactions', FinanceController.listStudent);
router.get('/transactions', FinanceController.list);
router.post('/transactions', FinanceController.create);
router.post('/transactions/:id/request-refund', FinanceController.requestRefund);
router.post('/transactions/:id/approve-refund', requireStaff, FinanceController.approveRefund);
router.post('/transactions/:id/reject-refund', requireStaff, FinanceController.rejectRefund);
router.patch('/transactions/:id', FinanceController.update);
router.delete('/transactions/:id', FinanceController.remove);

export default router;
