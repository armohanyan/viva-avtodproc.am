import { Router } from 'express';
import PersonalTheoryLessonRequestController from '../controllers/personal-theory-lesson-request.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.post('/', PersonalTheoryLessonRequestController.create);
router.get('/mine', PersonalTheoryLessonRequestController.listMine);
router.post('/:id/cancel-mine', PersonalTheoryLessonRequestController.cancelMine);

router.get('/', requireStaff, PersonalTheoryLessonRequestController.listForStaff);
router.get('/:id', requireStaff, PersonalTheoryLessonRequestController.getByIdForStaff);
router.delete('/:id', requireStaff, PersonalTheoryLessonRequestController.remove);
router.post('/:id/contacted', requireStaff, PersonalTheoryLessonRequestController.markContacted);
router.post('/:id/cancel', requireStaff, PersonalTheoryLessonRequestController.cancel);
router.post('/:id/create-booking', requireStaff, PersonalTheoryLessonRequestController.createBooking);
router.post('/:id/link-booking', requireStaff, PersonalTheoryLessonRequestController.linkBooking);

export default router;
