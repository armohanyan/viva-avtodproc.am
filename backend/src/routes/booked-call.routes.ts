import { Router } from 'express';
import { BookedCallController } from '../controllers';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.post('/', BookedCallController.create);
router.get('/', requireStaff, BookedCallController.list);
router.patch('/:id', requireStaff, BookedCallController.updateStatus);

export default router;
