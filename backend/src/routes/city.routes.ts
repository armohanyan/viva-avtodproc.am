import { Router } from 'express';
import { CityController } from '../controllers';

const router = Router();

router.get('/', CityController.list);
router.post('/', CityController.create);
router.patch('/:id', CityController.update);
router.delete('/:id', CityController.remove);

export default router;
