import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import config from '../config';
import { parseBody } from '../helpers';
import { attachRefreshCookie } from '../helpers/auth-cookie.helper';
import AuthService from '../services/auth.service';
import {
  buildAppleAuthorizeUrl,
  buildFacebookAuthorizeUrl,
  buildGoogleAuthorizeUrl,
  exchangeAppleCode,
  exchangeFacebookCode,
  exchangeGoogleCode,
  verifyGoogleIdToken,
} from '../services/oauth-flow.service';
import { verifyOAuthState } from '../services/oauth-state.service';
import { SuccessHandlerUtil } from '../utils';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

function pickQuery(q: Request['query'], key: string): string {
  const v = q[key];
  return typeof v === 'string' ? v : '';
}

function readOptionalQuery(q: Request['query'], key: string): string | undefined {
  const v = q[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

const googleCredentialSchema = z.object({
  credential: z.string().min(20),
});

export default class OAuthController {
  /** Public client id for the Sign in with Google button. The secret stays on the server. */
  static googleClient(_req: Request, res: Response, next: NextFunction): void {
    const clientId = config.AUTH.OAUTH.google.clientId;
    if (!clientId) {
      next(new InputValidationError('Google sign-in is not configured', HttpStatusCodesUtil.BAD_REQUEST));
      return;
    }
    SuccessHandlerUtil.handleGet(res, next, { clientId });
  }

  /**
   * Sign in with Google (Identity Services). The browser never goes through
   * accounts.google.com/signin/oauth/id, which was spinning forever.
   */
  static async googleCredential(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = parseBody(googleCredentialSchema, req.body);
      const profile = await verifyGoogleIdToken(body.credential);
      const tokens = await AuthService.findOrCreateOAuthUser(profile);
      attachRefreshCookie(res, tokens.refreshPlain);
      SuccessHandlerUtil.handleGet(res, next, {
        accessToken: tokens.accessToken,
        user: tokens.user,
      });
    } catch (e) {
      next(e);
    }
  }

  static googleStart(req: Request, res: Response, next: NextFunction): void {
    try {
      const nextPath = readOptionalQuery(req.query, 'next');
      const ro = readOptionalQuery(req.query, 'ro');
      const url = buildGoogleAuthorizeUrl(nextPath, ro);
      OAuthController.redirectToProvider(res, url);
    } catch (e) {
      next(e);
    }
  }

  static facebookStart(req: Request, res: Response, next: NextFunction): void {
    try {
      const nextPath = readOptionalQuery(req.query, 'next');
      const ro = readOptionalQuery(req.query, 'ro');
      const url = buildFacebookAuthorizeUrl(nextPath, ro);
      OAuthController.redirectToProvider(res, url);
    } catch (e) {
      next(e);
    }
  }

  static appleStart(req: Request, res: Response, next: NextFunction): void {
    try {
      const nextPath = readOptionalQuery(req.query, 'next');
      const ro = readOptionalQuery(req.query, 'ro');
      const url = buildAppleAuthorizeUrl(nextPath, ro);
      OAuthController.redirectToProvider(res, url);
    } catch (e) {
      next(e);
    }
  }

  private static redirectToProvider(res: Response, url: string): void {
    // These must win over Helmet. Otherwise Chrome keeps the user on Google's
    // consent screen with the top progress bar running.
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.removeHeader('Origin-Agent-Cluster');
    res.removeHeader('Content-Security-Policy');
    res.redirect(url);
  }

  private static redirectOAuthError(res: Response, base: string, message: string): void {
    const u = new URL(`${base}/auth/callback`);
    u.searchParams.set('auth_error', message.slice(0, 400));
    OAuthController.sendBrowserRedirect(res, u.toString());
  }

  /**
   * Finish OAuth in a real document, then leave for the app.
   * A 302 with Set-Cookie is often dropped on the hop from accounts.google.com, and
   * Cross-Origin-Opener-Policy: same-origin leaves Google's confirmation modal spinning.
   */
  private static sendBrowserRedirect(res: Response, target: string): void {
    res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    let formAction = "'self' https: http:";
    try {
      formAction = `'self' ${new URL(target).origin}`;
    } catch {
      /* keep the broad fallback */
    }
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; script-src 'unsafe-inline'; base-uri 'none'; form-action ${formAction}`,
    );
    res.status(200);
    res.type('html');
    const href = target.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const jsTarget = JSON.stringify(target).replace(/</g, '\\u003c');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="referrer" content="no-referrer">
<meta http-equiv="refresh" content="0;url=${href}">
<title>Signing in</title>
</head>
<body>
<p><a href="${href}">Continue</a></p>
<script>location.replace(${jsTarget});</script>
</body>
</html>`);
  }

  private static baseFromState(state: string | undefined): string {
    let base = config.PANEL_DEFAULT_ORIGIN;
    if (!state) {
      return base;
    }
    try {
      const st = verifyOAuthState(state);
      if (st.ro) {
        base = st.ro;
      }
    } catch {
      /* ignore */
    }
    return base;
  }

  static async googleCallback(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const q = req.query;
    const base = OAuthController.baseFromState(pickQuery(q, 'state'));
    const err = pickQuery(q, 'error');

    if (err) {
      OAuthController.redirectOAuthError(res, base, err);
      return;
    }

    const code = pickQuery(q, 'code');
    const state = pickQuery(q, 'state');

    if (!code || !state) {
      OAuthController.redirectOAuthError(res, base, 'missing_oauth_params');
      return;
    }

    try {
      const st = verifyOAuthState(state);
      const profile = await exchangeGoogleCode(code, state);
      const tokens = await AuthService.findOrCreateOAuthUser(profile);

      attachRefreshCookie(res, tokens.refreshPlain);

      const ok = new URL(`${base}${st.next.startsWith('/') ? st.next : `/${st.next}`}`);

      ok.searchParams.set('from', 'oauth');
      OAuthController.sendBrowserRedirect(res, ok.toString());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'oauth_failed';
      OAuthController.redirectOAuthError(res, base, msg);
    }
  }

  static async facebookCallback(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const q = req.query;
    const base = OAuthController.baseFromState(pickQuery(q, 'state'));
    const err = pickQuery(q, 'error');

    if (err) {
      OAuthController.redirectOAuthError(res, base, err);
      return;
    }

    const code = pickQuery(q, 'code');
    const state = pickQuery(q, 'state');

    if (!code || !state) {
      OAuthController.redirectOAuthError(res, base, 'missing_oauth_params');
      return;
    }

    try {
      const st = verifyOAuthState(state);
      const profile = await exchangeFacebookCode(code, state);
      const tokens = await AuthService.findOrCreateOAuthUser(profile);

      attachRefreshCookie(res, tokens.refreshPlain);

      const ok = new URL(`${base}${st.next.startsWith('/') ? st.next : `/${st.next}`}`);

      ok.searchParams.set('from', 'oauth');
      OAuthController.sendBrowserRedirect(res, ok.toString());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'oauth_failed';
      OAuthController.redirectOAuthError(res, base, msg);
    }
  }

  static async appleCallback(req: Request, res: Response, _next: NextFunction): Promise<void> {
    const q = req.query;
    const base = OAuthController.baseFromState(pickQuery(q, 'state'));
    const err = pickQuery(q, 'error');

    if (err) {
      OAuthController.redirectOAuthError(res, base, err);
      return;
    }


    const code = pickQuery(q, 'code');
    const state = pickQuery(q, 'state');

    if (!code || !state) {
      OAuthController.redirectOAuthError(res, base, 'missing_oauth_params');
      return;
    }

    try {
      const st = verifyOAuthState(state);
      const idToken = readOptionalQuery(q, 'id_token');
      const userJson = readOptionalQuery(q, 'user');
      const profile = await exchangeAppleCode(code, state, idToken, userJson);
      const tokens = await AuthService.findOrCreateOAuthUser(profile);

      attachRefreshCookie(res, tokens.refreshPlain);

      const ok = new URL(`${base}${st.next.startsWith('/') ? st.next : `/${st.next}`}`);
      ok.searchParams.set('from', 'oauth');
      OAuthController.sendBrowserRedirect(res, ok.toString());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'oauth_failed';
      OAuthController.redirectOAuthError(res, base, msg);
    }
  }
}
