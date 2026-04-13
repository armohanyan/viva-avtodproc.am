import { Router } from 'express';
import { MarketingController } from '../controllers';
import { requireSuperAdmin } from '../middleware/staff-auth.middleware';

const router = Router();

router.get('/public', MarketingController.publicBundle);

router.get('/admin', requireSuperAdmin, MarketingController.adminBundle);
router.put('/stats', requireSuperAdmin, MarketingController.replaceStats);
router.put('/settings', requireSuperAdmin, MarketingController.replaceSettings);
router.post('/testimonials', requireSuperAdmin, MarketingController.createTestimonial);
router.patch('/testimonials/:id', requireSuperAdmin, MarketingController.updateTestimonial);
router.delete('/testimonials/:id', requireSuperAdmin, MarketingController.removeTestimonial);

export default router;
