import { Router } from 'express';
import { BranchController } from '../controllers';

const router = Router();

router.get('/', BranchController.list);
router.get('/:id/booking-schedule', BranchController.bookingSchedule);
router.post('/', BranchController.create);
router.patch('/:id', BranchController.update);
router.delete('/:id', BranchController.remove);

export default router;
