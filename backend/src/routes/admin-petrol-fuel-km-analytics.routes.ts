import { Router } from 'express';
import AdminPetrolFuelKmAnalyticsController from '../controllers/admin-petrol-fuel-km-analytics.controller';
import { requireStaff } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/analytics', requireStaff, AdminPetrolFuelKmAnalyticsController.list);

export default router;
