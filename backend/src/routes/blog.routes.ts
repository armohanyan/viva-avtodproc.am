import { Router } from 'express';
import { BlogController } from '../controllers';

const router = Router();

router.get('/published', BlogController.listPublished);
router.get('/slug/:slug', BlogController.getBySlug);
router.get('/admin/all', BlogController.listAll);
router.post('/', BlogController.create);
router.patch('/:id', BlogController.update);
router.delete('/:id', BlogController.remove);

export default router;
