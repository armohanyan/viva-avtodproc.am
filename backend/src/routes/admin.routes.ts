import { Router } from 'express';
import AdminFinancialReportController from '../controllers/admin-financial-report.controller';
import AdminInviteController from '../controllers/admin-invite.controller';
import AdminJobsController from '../controllers/admin-jobs.controller';
import AuditLogController from '../controllers/audit-log.controller';
import ClassScheduleController from '../controllers/class-schedule.controller';
import { requireStaff, requireSuperAdmin } from '../middleware/staff-auth.middleware';
import directorRoutes from './director.routes';
import adminPetrolExpenseRequestRoutes from './admin-petrol-expense-request.routes';

const router = Router();

router.use('/director', directorRoutes);
router.use('/petrol-expense-requests', adminPetrolExpenseRequestRoutes);

router.get('/reports/financial', requireSuperAdmin, AdminFinancialReportController.financial);

router.post('/invite-student', requireStaff, AdminInviteController.inviteStudent);
router.post('/invite-instructor', requireStaff, AdminInviteController.inviteInstructor);
router.get('/class-schedule', requireStaff, ClassScheduleController.list);
router.post('/jobs/lesson-completion', requireStaff, AdminJobsController.runLessonCompletion);
router.get('/audit-logs', requireStaff, AuditLogController.list);
router.get('/students/:studentId/progress', requireStaff, AdminJobsController.getStudentProgress);

export default router;
