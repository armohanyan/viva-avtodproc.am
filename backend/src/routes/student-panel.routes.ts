import { Router } from 'express';
import ClassScheduleController from '../controllers/class-schedule.controller';

const router = Router();

router.get('/lessons-schedule', ClassScheduleController.listForStudent);

export default router;
