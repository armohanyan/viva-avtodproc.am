import { Router } from 'express';
import AccountsController from '../controllers/accounts.controller';

const router = Router();

router.get('/', AccountsController.list);
router.post('/', AccountsController.create);
router.patch('/:id', AccountsController.update);

export default router;
