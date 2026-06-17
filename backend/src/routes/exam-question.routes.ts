import { Router } from 'express';
import { ExamQuestionController } from '../controllers';

const router = Router();

router.get('/', ExamQuestionController.list);
router.get('/meta', ExamQuestionController.getMeta);
router.get('/saved/mine', ExamQuestionController.listSavedQuestions);
router.get('/pack/signs', ExamQuestionController.listPackSigns);
router.get('/pack/signs-category/:topicId', ExamQuestionController.listPackSignCategory);
router.get('/pack/rules-safety', ExamQuestionController.listPackRulesSafety);
router.get('/pack/thematic/:topicId', ExamQuestionController.listPackThematic);
router.post('/pack/by-ids', ExamQuestionController.listPackByIds);
router.get('/:id', ExamQuestionController.getOne);
router.get('/:id/comments', ExamQuestionController.listComments);
router.post('/:id/comments', ExamQuestionController.addComment);
router.delete('/:id/comments/:commentId', ExamQuestionController.removeComment);
router.get('/:id/saved', ExamQuestionController.getSavedState);
router.put('/:id/saved', ExamQuestionController.setSavedState);
router.put('/replace', ExamQuestionController.replaceAll);
router.put('/meta', ExamQuestionController.updateMeta);
router.post('/', ExamQuestionController.upsert);
router.delete('/:id', ExamQuestionController.remove);

export default router;
