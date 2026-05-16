import { Router } from 'express';
import AdminInviteController from '../controllers/admin-invite.controller';
import AdminJobsController from '../controllers/admin-jobs.controller';
import ClassScheduleController from '../controllers/class-schedule.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';
import adminFinanceRoutes from './admin-finance.routes';

const router = Router();

router.use('/finance', adminFinanceRoutes);

router.post('/invite-student', requireStaff, AdminInviteController.inviteStudent);
router.post('/invite-instructor', requireStaff, AdminInviteController.inviteInstructor);
router.get('/class-schedule', requireStaff, ClassScheduleController.list);
router.post('/jobs/lesson-completion', requireStaff, AdminJobsController.runLessonCompletion);
router.get('/students/:studentId/progress', requireStaff, AdminJobsController.getStudentProgress);

export default router;
