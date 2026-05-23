import { Router } from 'express';
import AdminPetrolExpenseController from '../controllers/admin-petrol-expense.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/', requireStaff, AdminPetrolExpenseController.list);
router.post('/', requireStaff, AdminPetrolExpenseController.create);
router.patch('/:id', requireStaff, AdminPetrolExpenseController.update);
router.delete('/:id', requireStaff, AdminPetrolExpenseController.remove);

export default router;
