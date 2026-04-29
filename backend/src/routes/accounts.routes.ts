import { Router } from 'express';
import AccountsController from '../controllers/accounts.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/', requireStaff, AccountsController.list);
router.post('/', requireStaff, AccountsController.create);
router.patch('/:id', requireStaff, AccountsController.update);

export default router;
