import { Router } from 'express';
import { InstructorController } from '../controllers';

const router = Router();

router.get('/', InstructorController.list);
router.post('/', InstructorController.create);
router.patch('/:id', InstructorController.update);
router.delete('/:id', InstructorController.remove);

export default router;
