import { Router } from 'express';
import ClassScheduleController from '../controllers/class-schedule.controller';
import InstructorPetrolExpenseRequestController from '../controllers/instructor-petrol-expense-request.controller';
import InstructorSalaryReportController from '../controllers/instructor-salary-report.controller';
import { requireStaffOrInstructor } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/class-schedule', requireStaffOrInstructor, ClassScheduleController.listForInstructor);

router.get('/salary-report', requireStaffOrInstructor, InstructorSalaryReportController.report);

router.get(
  '/petrol-expense-requests/cars',
  requireStaffOrInstructor,
  InstructorPetrolExpenseRequestController.cars,
);
router.get(
  '/petrol-expense-requests',
  requireStaffOrInstructor,
  InstructorPetrolExpenseRequestController.list,
);
router.post(
  '/petrol-expense-requests',
  requireStaffOrInstructor,
  InstructorPetrolExpenseRequestController.create,
);

export default router;
