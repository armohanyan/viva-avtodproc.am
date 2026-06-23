import { Router } from 'express';
import AdminInstructorKmLogController from '../controllers/admin-instructor-km-log.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/', requireStaff, AdminInstructorKmLogController.list);
router.post('/', requireStaff, AdminInstructorKmLogController.create);
router.patch('/:id', requireStaff, AdminInstructorKmLogController.update);
router.delete('/:id', requireStaff, AdminInstructorKmLogController.remove);

export default router;
