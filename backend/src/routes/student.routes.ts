import { Router } from 'express';
import { StudentController } from '../controllers';

const router = Router();

router.get('/', StudentController.list);
router.post('/', StudentController.create);
router.get('/:id/instructor-ratings/status', StudentController.instructorRatingsStatus);
router.post('/:id/instructor-ratings', StudentController.instructorRatingsSubmit);
router.get('/:id/entitlements', StudentController.entitlements);
router.post('/:id/entitlements/package/complete-purchase', StudentController.entitlementsPurchasePackage);
router.post('/:id/entitlements/package', StudentController.entitlementsAssignPackage);
router.post('/:id/entitlements/extra-practical', StudentController.entitlementsAddExtra);
router.get('/:id/exam-stats', StudentController.examStatsGet);
router.put('/:id/exam-stats', StudentController.examStatsPut);
router.post('/:id/exam-stats/attempt', StudentController.examStatsAttempt);
router.put('/:id/exam-stats/active-session', StudentController.examStatsSetActiveSession);
router.delete('/:id/exam-stats/active-session', StudentController.examStatsClearActiveSession);
router.get('/:id/exam-stats/topic/:topicId/progress', StudentController.examStatsGetTopicProgress);
router.put('/:id/exam-stats/topic/progress', StudentController.examStatsUpsertTopicProgress);
router.put('/:id/exam-stats/topic/index', StudentController.examStatsSaveTopicIndex);
router.delete('/:id/exam-stats/topic/:topicId', StudentController.examStatsResetTopic);
router.patch('/:id/instructor-fields', StudentController.patchInstructorFields);
router.patch('/:id', StudentController.update);
router.delete('/:id', StudentController.remove);

export default router;
