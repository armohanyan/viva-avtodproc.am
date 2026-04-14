import { Router } from 'express';
import { InstructorController } from '../controllers';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/', InstructorController.list);
router.post('/', InstructorController.create);

router.get('/:id/availability-blocks', InstructorController.listAvailabilityBlocks);
router.get('/:id/busy-slots', InstructorController.listBusySlots);
router.post('/:id/availability-blocks', requireStaff, InstructorController.createAvailabilityBlock);
router.delete('/:id/availability-blocks/:blockId', requireStaff, InstructorController.removeAvailabilityBlock);

router.patch('/:id', InstructorController.update);
router.delete('/:id', InstructorController.remove);

export default router;
