import { Router } from 'express';
import { BookingController } from '../controllers';

const router = Router();

router.get('/', BookingController.list);
router.post('/', BookingController.create);
router.patch('/:id', BookingController.update);
router.delete('/:id', BookingController.remove);

export default router;
