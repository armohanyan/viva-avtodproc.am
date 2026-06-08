import { Router } from 'express';
import AdminFinancialReportController from '../controllers/admin-financial-report.controller';
import AdminInviteController from '../controllers/admin-invite.controller';
import AdminJobsController from '../controllers/admin-jobs.controller';
import AuditLogController from '../controllers/audit-log.controller';
import ClassScheduleController from '../controllers/class-schedule.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';
import adminFinanceRoutes from './admin-finance.routes';
import adminPetrolConsumptionRoutes from './admin-petrol-consumption.routes';
import adminPetrolExpenseRoutes from './admin-petrol-expense.routes';

const router = Router();

router.use('/finance', adminFinanceRoutes);
router.use('/petrol-expenses', adminPetrolExpenseRoutes);
router.use('/petrol-consumptions', adminPetrolConsumptionRoutes);

router.post('/invite-student', requireStaff, AdminInviteController.inviteStudent);
router.post('/invite-instructor', requireStaff, AdminInviteController.inviteInstructor);
router.get('/class-schedule', requireStaff, ClassScheduleController.list);
router.get('/reports/financial', requireStaff, AdminFinancialReportController.financial);
router.post('/jobs/lesson-completion', requireStaff, AdminJobsController.runLessonCompletion);
router.get('/audit-logs', requireStaff, AuditLogController.list);
router.get('/students/:studentId/progress', requireStaff, AdminJobsController.getStudentProgress);

export default router;
