import { Router } from 'express';
import { BookingController } from '../controllers';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/', BookingController.list);
router.post('/', BookingController.create);
router.post('/theory-groups/:cohortId/book', BookingController.createTheoryGroupStudentBooking);
router.post('/:id/extend-payment-hold', BookingController.extendPaymentHold);
router.post('/:id/start-payment-window', BookingController.startPaymentWindow);
router.post('/:id/complete-payment', BookingController.completeStudentPayment);
router.post('/:id/approve-student-cancellation', requireStaff, BookingController.approveStudentCancellation);
router.post('/:id/reject-student-cancellation', requireStaff, BookingController.rejectStudentCancellation);
router.post('/:id/cancel-student', BookingController.cancelStudentBooking);
router.patch('/:id/lesson-passed', BookingController.patchLessonPassed);
router.patch('/:id', BookingController.update);
router.delete('/:id', BookingController.remove);

export default router;
