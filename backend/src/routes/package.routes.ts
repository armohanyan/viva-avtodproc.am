import { Router } from 'express';
import { PackageController } from '../controllers';

const router = Router();

router.get('/', PackageController.list);
router.post('/', PackageController.create);
router.patch('/:id', PackageController.update);
router.delete('/:id', PackageController.remove);

export default router;
