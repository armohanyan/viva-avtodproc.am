import { Router } from 'express';
import DirectorController from '../controllers/director.controller';
import { requireSuperAdmin } from '../middleware/staff-auth.middleware';

const router = Router();

router.use(requireSuperAdmin);

router.get('/dashboard', DirectorController.dashboard);
router.get('/options/:category', DirectorController.listOptions);
router.post('/options/:category', DirectorController.addOption);

router.get('/cash', DirectorController.listCash);
router.post('/cash', DirectorController.createCash);
router.delete('/cash/:id', DirectorController.deleteCash);

router.get('/expenses', DirectorController.listExpenses);
router.get('/expenses/chart', DirectorController.expenseChart);
router.post('/expenses', DirectorController.createExpense);
router.delete('/expenses/:id', DirectorController.deleteExpense);

router.get('/repairs', DirectorController.listRepairs);
router.post('/repairs', DirectorController.createRepair);
router.delete('/repairs/:id', DirectorController.deleteRepair);

router.get('/fuel', DirectorController.listFuel);
router.post('/fuel', DirectorController.createFuel);
router.delete('/fuel/:id', DirectorController.deleteFuel);

router.get('/km', DirectorController.listKm);
router.post('/km', DirectorController.createKm);
router.delete('/km/:id', DirectorController.deleteKm);

router.get('/instructor-hours', DirectorController.listInstructorHours);
router.post('/instructor-hours', DirectorController.createInstructorHours);
router.delete('/instructor-hours/:id', DirectorController.deleteInstructorHours);

router.get('/salaries', DirectorController.listSalaries);
router.post('/salaries', DirectorController.createSalary);
router.delete('/salaries/:id', DirectorController.deleteSalary);

router.get('/revenues', DirectorController.listRevenues);
router.get('/revenues/chart', DirectorController.revenueChart);
router.post('/revenues', DirectorController.createRevenue);
router.delete('/revenues/:id', DirectorController.deleteRevenue);

router.get('/driver-profile', DirectorController.driverProfile);

export default router;
