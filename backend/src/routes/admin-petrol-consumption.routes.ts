import { Router } from 'express';
import AdminPetrolConsumptionController from '../controllers/admin-petrol-consumption.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/', requireStaff, AdminPetrolConsumptionController.list);
router.post('/', requireStaff, AdminPetrolConsumptionController.create);
router.patch('/:id', requireStaff, AdminPetrolConsumptionController.update);
router.delete('/:id', requireStaff, AdminPetrolConsumptionController.remove);

export default router;
