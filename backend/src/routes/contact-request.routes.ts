import { Router } from 'express';
import { ContactRequestController } from '../controllers';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.post('/', ContactRequestController.create);
router.get('/', requireStaff, ContactRequestController.list);
router.patch('/:id', requireStaff, ContactRequestController.updateStatus);

export default router;
