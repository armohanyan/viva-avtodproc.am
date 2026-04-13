import { Router } from 'express';
import { BranchController } from '../controllers';

const router = Router();

router.get('/', BranchController.list);
router.post('/', BranchController.create);
router.patch('/:id', BranchController.update);
router.delete('/:id', BranchController.remove);

export default router;
