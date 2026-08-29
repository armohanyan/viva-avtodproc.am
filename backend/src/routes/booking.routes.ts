import { Router } from 'express';
import { BookingController } from '../controllers';
import { requireStaff, requireSuperAdmin } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/', BookingController.list);
router.get('/gift-requests', requireStaff, BookingController.listGiftRequests);
router.get('/archives', requireStaff, BookingController.listArchives);
router.post('/archives/purge', requireStaff, BookingController.purgeArchivesBulk);
router.post('/archives/purge-all', requireStaff, BookingController.purgeAllArchives);
router.delete('/archives/:archiveId', requireStaff, BookingController.purgeArchive);
router.get('/:id', requireStaff, BookingController.getByIdForAdmin);
router.post('/bulk-import', requireStaff, BookingController.bulkImport);
router.post('/package-atomic', requireStaff, BookingController.createAdminPackageAtomic);
router.post('/', BookingController.create);
router.post('/theory-groups/:cohortId/book', BookingController.createTheoryGroupStudentBooking);
router.post('/:id/extend-payment-hold', BookingController.extendPaymentHold);
router.post('/:id/start-payment-window', BookingController.startPaymentWindow);
router.post('/:id/complete-payment', BookingController.completeStudentPayment);
router.post('/:id/approve-student-cancellation', requireStaff, BookingController.approveStudentCancellation);
router.post('/:id/reject-student-cancellation', requireStaff, BookingController.rejectStudentCancellation);
router.post('/:id/approve-gift', requireSuperAdmin, BookingController.approveGift);
router.post('/:id/reject-gift', requireSuperAdmin, BookingController.rejectGift);
router.post('/:id/cancel-student', BookingController.cancelStudentBooking);
router.post('/:id/archive', requireStaff, BookingController.archive);
router.post('/:id/remove-slot', requireStaff, BookingController.removeSlot);
router.patch('/:id/lesson-passed', BookingController.patchLessonPassed);
router.patch('/:id', BookingController.update);
router.delete('/:id', requireStaff, BookingController.remove);

export default router;
