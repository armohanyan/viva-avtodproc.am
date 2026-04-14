import { Router } from 'express';
import { OAuthController } from '../controllers';

const router = Router();

router.get('/google/start', OAuthController.googleStart);
router.get('/google/callback', OAuthController.googleCallback);
router.get('/facebook/start', OAuthController.facebookStart);
router.get('/facebook/callback', OAuthController.facebookCallback);
router.get('/apple/start', OAuthController.appleStart);
router.get('/apple/callback', OAuthController.appleCallback);

export default router;
