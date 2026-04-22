import { Router } from 'express';
import { AuthController } from '../controllers';
import { authCredentialLimiter, authSessionMutationLimiter } from '../middleware/auth-rate-limit.middleware';
import oauthRoutes from './oauth.routes';

const router = Router();

router.post('/login', authCredentialLimiter, AuthController.login);
router.post('/verify-admin-mfa', authCredentialLimiter, AuthController.verifyAdminMfa);
router.post('/resend-admin-mfa', authCredentialLimiter, AuthController.resendAdminMfa);
router.get('/student-invitation', AuthController.studentInvitationMeta);
router.post('/setup-password', AuthController.setupPassword);
router.post('/forgot-password', authCredentialLimiter, AuthController.forgotPassword);
router.get('/password-reset', AuthController.passwordResetMeta);
router.post('/reset-password', authCredentialLimiter, AuthController.resetPassword);
router.post('/register', authCredentialLimiter, AuthController.register);
router.post('/refresh', authSessionMutationLimiter, AuthController.refresh);
router.post('/logout', authSessionMutationLimiter, AuthController.logout);
router.get('/me', AuthController.me);
router.post('/change-password', AuthController.changePassword);
router.patch('/me', AuthController.patchMe);
router.use('/oauth', oauthRoutes);

export default router;
