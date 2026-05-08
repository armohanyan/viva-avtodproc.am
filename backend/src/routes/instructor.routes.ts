import { Router } from 'express';
import { InstructorController } from '../controllers';
import { attachStaffIfPresent, requireStaff, requireStaffOrInstructor } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/', attachStaffIfPresent, InstructorController.list);
router.post('/', requireStaff, InstructorController.create);

router.get('/:id/availability-blocks', InstructorController.listAvailabilityBlocks);
router.get('/:id/busy-slots', InstructorController.listBusySlots);
router.post('/:id/availability-blocks', requireStaff, InstructorController.createAvailabilityBlock);
router.delete('/:id/availability-blocks/:blockId', requireStaff, InstructorController.removeAvailabilityBlock);

router.patch('/:id', requireStaffOrInstructor, InstructorController.update);
router.delete('/:id', requireStaff, InstructorController.remove);

export default router;
