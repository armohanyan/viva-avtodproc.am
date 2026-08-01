import { Router } from 'express';
import AdminPetrolExpenseRequestController from '../controllers/admin-petrol-expense-request.controller';
import { requireSuperAdmin } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/', requireSuperAdmin, AdminPetrolExpenseRequestController.list);
router.post('/:id/approve', requireSuperAdmin, AdminPetrolExpenseRequestController.approve);
router.post('/:id/reject', requireSuperAdmin, AdminPetrolExpenseRequestController.reject);

export default router;
