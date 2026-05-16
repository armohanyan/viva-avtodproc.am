import { Router } from 'express';
import ClassScheduleController from '../controllers/class-schedule.controller';
import { StudentController } from '../controllers';

const router = Router();

router.get('/lessons-schedule', ClassScheduleController.listForStudent);
router.get('/progress', StudentController.progressSelf);

export default router;
