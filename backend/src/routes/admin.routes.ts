import { Router } from 'express';
import AdminInviteController from '../controllers/admin-invite.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.post('/invite-student', requireStaff, AdminInviteController.inviteStudent);
router.post('/invite-instructor', requireStaff, AdminInviteController.inviteInstructor);

export default router;
