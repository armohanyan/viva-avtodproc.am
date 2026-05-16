import { Router } from 'express';
import TheoryCohortController from '../controllers/theory-cohort.controller';

const router = Router();

router.get('/', TheoryCohortController.list);
router.post('/', TheoryCohortController.create);
router.post('/preview-sessions', TheoryCohortController.previewSessions);
router.get('/:id/sessions', TheoryCohortController.listSessions);
router.get('/:id/enrollments', TheoryCohortController.listEnrollments);
router.patch('/:id', TheoryCohortController.update);
router.delete('/:id', TheoryCohortController.remove);
router.post('/:id/enrollments', TheoryCohortController.enroll);

export default router;
