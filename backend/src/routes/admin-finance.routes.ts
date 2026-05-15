import { Router } from 'express';
import AdminFinanceExpenseController from '../controllers/admin-finance-expense.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/expenses', requireStaff, AdminFinanceExpenseController.list);
router.post('/expenses', requireStaff, AdminFinanceExpenseController.create);
router.patch('/expenses/:id', requireStaff, AdminFinanceExpenseController.update);
router.delete('/expenses/:id', requireStaff, AdminFinanceExpenseController.remove);

export default router;
