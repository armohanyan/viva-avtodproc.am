import { Router } from 'express';
import AdminSalaryController from '../controllers/admin-salary.controller';
import { requireSuperAdmin } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/report', requireSuperAdmin, AdminSalaryController.report);
router.get('/payments', requireSuperAdmin, AdminSalaryController.listPayments);
router.post('/payments', requireSuperAdmin, AdminSalaryController.createPayment);
router.delete('/payments/:id', requireSuperAdmin, AdminSalaryController.removePayment);

export default router;
