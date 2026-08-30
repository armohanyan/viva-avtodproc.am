import { Router } from 'express';
import DirectorController from '../controllers/director.controller';
import { requireSuperAdmin } from '../middleware/staff-auth.middleware';

const router = Router();

router.use(requireSuperAdmin);

router.get('/dashboard', DirectorController.dashboard);
router.get('/reports/monthly', DirectorController.monthlyReport);
router.get('/options/:category', DirectorController.listOptions);
router.post('/options/:category', DirectorController.addOption);

router.get('/cash', DirectorController.listCash);
router.post('/cash', DirectorController.createCash);
router.patch('/cash/:id', DirectorController.updateCash);
router.delete('/cash/:id', DirectorController.deleteCash);

router.get('/expenses', DirectorController.listExpenses);
router.get('/expenses/chart', DirectorController.expenseChart);
router.post('/expenses', DirectorController.createExpense);
router.patch('/expenses/:id', DirectorController.updateExpense);
router.delete('/expenses/:id', DirectorController.deleteExpense);

router.get('/repairs', DirectorController.listRepairs);
router.post('/repairs', DirectorController.createRepair);
router.patch('/repairs/:id', DirectorController.updateRepair);
router.delete('/repairs/:id', DirectorController.deleteRepair);

router.get('/fuel', DirectorController.listFuel);
router.post('/fuel', DirectorController.createFuel);
router.patch('/fuel/:id', DirectorController.updateFuel);
router.delete('/fuel/:id', DirectorController.deleteFuel);

router.get('/km', DirectorController.listKm);
router.post('/km', DirectorController.createKm);
router.patch('/km/:id', DirectorController.updateKm);
router.delete('/km/:id', DirectorController.deleteKm);

router.get('/instructor-hours', DirectorController.listInstructorHours);
router.post('/instructor-hours', DirectorController.createInstructorHours);
router.patch('/instructor-hours/:id', DirectorController.updateInstructorHours);
router.delete('/instructor-hours/:id', DirectorController.deleteInstructorHours);

router.get('/salaries', DirectorController.listSalaries);
router.post('/salaries', DirectorController.createSalary);
router.patch('/salaries/:id', DirectorController.updateSalary);
router.delete('/salaries/:id', DirectorController.deleteSalary);

router.get('/revenues', DirectorController.listRevenues);
router.get('/revenues/chart', DirectorController.revenueChart);
router.post('/revenues', DirectorController.createRevenue);
router.delete('/revenues/:id', DirectorController.deleteRevenue);

router.get('/driver-profile', DirectorController.driverProfile);

export default router;
