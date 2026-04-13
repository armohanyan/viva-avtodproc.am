import { Router } from 'express';
import { ExamQuestionController } from '../controllers';

const router = Router();

router.get('/', ExamQuestionController.list);
router.put('/replace', ExamQuestionController.replaceAll);
router.post('/', ExamQuestionController.upsert);
router.delete('/:id', ExamQuestionController.remove);

export default router;
