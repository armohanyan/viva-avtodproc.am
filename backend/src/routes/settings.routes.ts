import { Router } from 'express';
import SettingsController from '../controllers/settings.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/practical-slot-plan', requireStaff, SettingsController.getPracticalSlotPlan);
router.put('/practical-slot-plan', requireStaff, SettingsController.replacePracticalSlotPlan);

export default router;
