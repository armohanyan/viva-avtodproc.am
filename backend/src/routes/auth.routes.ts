import { Router } from 'express';
import { AuthController } from '../controllers';
import oauthRoutes from './oauth.routes';

const router = Router();

router.post('/login', AuthController.login);
router.post('/register', AuthController.register);
router.post('/refresh', AuthController.refresh);
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.me);
router.post('/change-password', AuthController.changePassword);
router.patch('/me', AuthController.patchMe);
router.use('/oauth', oauthRoutes);

export default router;
