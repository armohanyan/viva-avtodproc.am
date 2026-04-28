import { Router } from 'express';
import { ExamQuestionController } from '../controllers';

const router = Router();

router.get('/', ExamQuestionController.list);
router.get('/meta', ExamQuestionController.getMeta);
router.put('/replace', ExamQuestionController.replaceAll);
router.put('/meta', ExamQuestionController.updateMeta);
router.post('/', ExamQuestionController.upsert);
router.delete('/:id', ExamQuestionController.remove);

export default router;
