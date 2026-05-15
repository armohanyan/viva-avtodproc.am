import { Router } from 'express';
import ClassScheduleController from '../controllers/class-schedule.controller';
import { requireStaffOrInstructor } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/class-schedule', requireStaffOrInstructor, ClassScheduleController.listForInstructor);

export default router;
