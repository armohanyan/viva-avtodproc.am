import { Router } from 'express';
import accountsRoutes from './accounts.routes';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import blogRoutes from './blog.routes';
import bookedCallRoutes from './booked-call.routes';
import bookingRoutes from './booking.routes';
import branchRoutes from './branch.routes';
import cityRoutes from './city.routes';
import contactRequestRoutes from './contact-request.routes';
import examQuestionRoutes from './exam-question.routes';
import financeRoutes from './finance.routes';
import fleetRoutes from './fleet.routes';
import instructorRoutes from './instructor.routes';
import instructorPanelRoutes from './instructor-panel.routes';
import studentPanelRoutes from './student-panel.routes';
import marketingRoutes from './marketing.routes';
import notificationRoutes from './notification.routes';
import packageRoutes from './package.routes';
import paymentRoutes from './payment.routes';
import personalTheoryLessonRequestRoutes from './personal-theory-lesson-request.routes';
import studentRoutes from './student.routes';
import theoryCohortRoutes from './theory-cohort.routes';
import uploadRoutes from './upload.routes';
import userRoutes from './user.routes';
import settingsRoutes from './settings.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.status(200).json({
    ok: true,
    service: 'viva-backend',
    time: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/accounts', accountsRoutes);
router.use('/cities', cityRoutes);
router.use('/contact-requests', contactRequestRoutes);
router.use('/branches', branchRoutes);
router.use('/instructors', instructorRoutes);
router.use('/instructor', instructorPanelRoutes);
router.use('/student', studentPanelRoutes);
router.use('/students', studentRoutes);
router.use('/theory-cohorts', theoryCohortRoutes);
router.use('/packages', packageRoutes);
router.use('/payments', paymentRoutes);
router.use('/bookings', bookingRoutes);
router.use('/personal-theory-lesson-requests', personalTheoryLessonRequestRoutes);
router.use('/booked-calls', bookedCallRoutes);
router.use('/blogs', blogRoutes);
router.use('/marketing', marketingRoutes);
router.use('/notifications', notificationRoutes);
router.use('/exam-questions', examQuestionRoutes);
router.use('/finance', financeRoutes);
router.use('/fleet', fleetRoutes);
router.use('/user', userRoutes);
router.use('/uploads', uploadRoutes);
router.use('/settings', settingsRoutes);

export default router;
