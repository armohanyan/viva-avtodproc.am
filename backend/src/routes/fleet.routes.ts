import { Router } from 'express';
import { FleetController } from '../controllers';

const router = Router();

router.get('/cars', FleetController.listCars);
router.post('/cars', FleetController.createCar);
router.patch('/cars/:id', FleetController.updateCar);
router.delete('/cars/:id', FleetController.removeCar);

router.get('/expenses', FleetController.listExpenses);
router.post('/expenses', FleetController.addExpense);
router.patch('/expenses/:id', FleetController.updateExpense);
router.delete('/expenses/:id', FleetController.removeExpense);

export default router;
