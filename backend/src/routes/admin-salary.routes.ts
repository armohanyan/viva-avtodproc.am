import { Router } from 'express';
import AdminSalaryController from '../controllers/admin-salary.controller';
import { requireSuperAdmin } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/report', requireSuperAdmin, AdminSalaryController.report);
router.get('/lessons', requireSuperAdmin, AdminSalaryController.lessons);
router.get('/employee-detail', requireSuperAdmin, AdminSalaryController.employeeDetail);
router.get('/payments', requireSuperAdmin, AdminSalaryController.listPayments);
router.post('/payments', requireSuperAdmin, AdminSalaryController.createPayment);
router.patch('/payments/:id/mark-paid', requireSuperAdmin, AdminSalaryController.markPaymentPaid);
router.delete('/payments/:id', requireSuperAdmin, AdminSalaryController.removePayment);
router.get('/compensation-rules', requireSuperAdmin, AdminSalaryController.listCompensationRules);
router.post('/compensation-rules', requireSuperAdmin, AdminSalaryController.createCompensationRule);
router.patch('/compensation-rules/:id', requireSuperAdmin, AdminSalaryController.updateCompensationRule);
router.delete('/compensation-rules/:id', requireSuperAdmin, AdminSalaryController.removeCompensationRule);
router.get('/adjustments', requireSuperAdmin, AdminSalaryController.listAdjustments);
router.post('/adjustments', requireSuperAdmin, AdminSalaryController.createAdjustment);
router.delete('/adjustments/:id', requireSuperAdmin, AdminSalaryController.removeAdjustment);

export default router;
