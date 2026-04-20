import { Router } from 'express';
import { BookingController } from '../controllers';

const router = Router();

router.get('/', BookingController.list);
router.post('/', BookingController.create);
router.post('/:id/extend-payment-hold', BookingController.extendPaymentHold);
router.post('/:id/start-payment-window', BookingController.startPaymentWindow);
router.post('/:id/complete-payment', BookingController.completeStudentPayment);
router.post('/:id/cancel-student', BookingController.cancelStudentBooking);
router.patch('/:id', BookingController.update);
router.delete('/:id', BookingController.remove);

export default router;
