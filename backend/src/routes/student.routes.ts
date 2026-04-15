import { Router } from 'express';
import { StudentController } from '../controllers';

const router = Router();

router.get('/', StudentController.list);
router.post('/', StudentController.create);
router.get('/:id/instructor-ratings/status', StudentController.instructorRatingsStatus);
router.post('/:id/instructor-ratings', StudentController.instructorRatingsSubmit);
router.get('/:id/entitlements', StudentController.entitlements);
router.post('/:id/entitlements/package', StudentController.entitlementsAssignPackage);
router.post('/:id/entitlements/extra-practical', StudentController.entitlementsAddExtra);
router.patch('/:id', StudentController.update);
router.delete('/:id', StudentController.remove);

export default router;
