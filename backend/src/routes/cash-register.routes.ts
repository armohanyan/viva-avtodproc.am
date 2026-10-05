import { Router } from 'express';
import CashRegisterController from '../controllers/cash-register.controller';

const router = Router();

router.get('/shifts', CashRegisterController.list);
router.post('/shifts', CashRegisterController.open);
router.get('/shifts/:id', CashRegisterController.detail);
router.post('/shifts/:id/close', CashRegisterController.close);
router.post('/shifts/:id/entries', CashRegisterController.createEntry);
router.patch('/shifts/:id/entries/:entryId', CashRegisterController.updateEntry);
router.delete('/shifts/:id/entries/:entryId', CashRegisterController.deleteEntry);

export default router;
