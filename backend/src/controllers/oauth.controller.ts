import type { NextFunction, Request, Response } from 'express';
import config from '../config';
import { attachRefreshCookie } from '../helpers/auth-cookie.helper';
import AuthService from '../services/auth.service';
import {
  buildAppleAuthorizeUrl,
  buildFacebookAuthorizeUrl,
  buildGoogleAuthorizeUrl,
  exchangeAppleCode,
  exchangeFacebookCode,
  exchangeGoogleCode,
} from '../services/oauth-flow.service';
import { verifyOAuthState } from '../services/oauth-state.service';

function pickQuery(q: Request['query'], key: string): string {
  const v = q[key];
  return typeof v === 'string' ? v : '';
}

function readOptionalQuery(q: Request['query'], key: string): string | undefined {
  const v = q[key];
  return typeof v === 'string' && v.trim() ? v.trim() : undefined;
}

export default class OAuthController {
  static googleStart(req: Request, res: Response, next: NextFunction): void {
    try {
      const nextPath = readOptionalQuery(req.query, 'next');
      const ro = readOptionalQuery(req.query, 'ro');
      const url = buildGoogleAuthorizeUrl(nextPath, ro);
      res.redirect(url);
    } catch (e) {
      next(e);
    }
  }

  static facebookStart(req: Request, res: Response, next: NextFunction): void {
    try {
      const nextPath = readOptionalQuery(req.query, 'next');
      const ro = readOptionalQuery(req.query, 'ro');
      const url = buildFacebookAuthorizeUrl(nextPath, ro);
      res.redirect(url);
    } catch (e) {
      next(e);
    }
  }

  static appleStart(req: Request, res: Response, next: NextFunction): void {
    try {
      const nextPath = readOptionalQuery(req.query, 'next');
      const ro = readOptionalQuery(req.query, 'ro');
      const url = buildAppleAuthorizeUrl(nextPath, ro);
      res.redirect(url);
    } catch (e) {
      next(e);
    }
  }

  private static redirectOAuthError(res: Response, base: string, message: string): void {
    const u = new URL(`${base}/auth/callback`);
    u.searchParams.set('auth_error', message.slice(0, 400));
    res.redirect(u.toString());
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
      res.redirect(ok.toString());
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
      res.redirect(ok.toString());
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
      res.redirect(ok.toString());
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'oauth_failed';
      OAuthController.redirectOAuthError(res, base, msg);
    }
  }
}
