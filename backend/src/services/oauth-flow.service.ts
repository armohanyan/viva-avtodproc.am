import { OAuth2Client } from 'google-auth-library';
import * as jose from 'jose';
import jwt from 'jsonwebtoken';
import config from '../config';
import { API_VERSION_PREFIX } from '../constants';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import type { OAuthProvider } from '../models/oauth-account.model';
import { peekNonceFromState, signOAuthState, verifyOAuthState } from './oauth-state.service';

const { InputValidationError } = ErrorsUtil;

function apiCallbackPath(provider: OAuthProvider): string {
  return `${API_VERSION_PREFIX}/auth/oauth/${provider}/callback`;
}

export function oauthRedirectUri(provider: OAuthProvider): string {
  return `${config.API_PUBLIC_URL}${apiCallbackPath(provider)}`;
}

export function buildGoogleAuthorizeUrl(nextPath: string | undefined, returnOrigin?: string): string {
  const { clientId } = config.AUTH.OAUTH.google;
  if (!clientId) {
    throw new InputValidationError('Google sign-in is not configured', HttpStatusCodesUtil.BAD_REQUEST);
  }

  const state = signOAuthState('google', nextPath, returnOrigin);
  const redirectUri = oauthRedirectUri('google');
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');

  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', 'openid email profile');
  u.searchParams.set('state', state);
  u.searchParams.set('access_type', 'offline');
  u.searchParams.set('prompt', 'select_account');

  return u.toString();
}

export function buildFacebookAuthorizeUrl(nextPath: string | undefined, returnOrigin?: string): string {
  const { appId } = config.AUTH.OAUTH.facebook;

  if (!appId) {
    throw new InputValidationError('Facebook sign-in is not configured', HttpStatusCodesUtil.BAD_REQUEST);
  }

  const state = signOAuthState('facebook', nextPath, returnOrigin);
  const redirectUri = oauthRedirectUri('facebook');
  const u = new URL('https://www.facebook.com/v19.0/dialog/oauth');

  u.searchParams.set('client_id', appId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  u.searchParams.set('scope', 'email,public_profile');

  return u.toString();
}

export function buildAppleAuthorizeUrl(nextPath: string | undefined, returnOrigin?: string): string {
  const { clientId } = config.AUTH.OAUTH.apple;

  if (!clientId) {
    throw new InputValidationError('Apple sign-in is not configured', HttpStatusCodesUtil.BAD_REQUEST);
  }

  const state = signOAuthState('apple', nextPath, returnOrigin);
  const redirectUri = oauthRedirectUri('apple');
  const u = new URL('https://appleid.apple.com/auth/authorize');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('response_type', 'code id_token');
  u.searchParams.set('response_mode', 'query');
  u.searchParams.set('scope', 'name email');
  u.searchParams.set('state', state);

  const nonce = peekNonceFromState(state);

  if (nonce) {
    u.searchParams.set('nonce', nonce);
  }

  return u.toString();
}

export async function exchangeGoogleCode(code: string, state: string): Promise<{
  provider: 'google';
  providerUserId: string;
  email: string;
  name: string;
}> {
  verifyOAuthState(state);

  const { clientId, clientSecret} = config.AUTH.OAUTH.google;
  if (!clientId || !clientSecret) {
    throw new InputValidationError('Google sign-in is not configured', HttpStatusCodesUtil.BAD_REQUEST);
  }

  const redirectUri = oauthRedirectUri('google');
  const client = new OAuth2Client(clientId, clientSecret, redirectUri);
  const { tokens } = await client.getToken({ code, redirect_uri: redirectUri });

  if (!tokens.id_token) {
    throw new InputValidationError('Google did not return an id_token', HttpStatusCodesUtil.BAD_REQUEST);
  }

  const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: clientId });
  const p = ticket.getPayload();

  if (!p?.sub || !p.email) {
    throw new InputValidationError('Google profile is missing email', HttpStatusCodesUtil.BAD_REQUEST);
  }

  return {
    provider: 'google',
    providerUserId: p.sub,
    email: p.email.trim().toLowerCase(),
    name: (p.name || p.email.split('@')[0] || 'User').trim(),
  };
}

export async function exchangeFacebookCode(code: string, state: string): Promise<{
  provider: 'facebook';
  providerUserId: string;
  email: string;
  name: string;
}> {
  verifyOAuthState(state);
  const { appId, appSecret } = config.AUTH.OAUTH.facebook;
  if (!appId || !appSecret) {
    throw new InputValidationError('Facebook sign-in is not configured', HttpStatusCodesUtil.BAD_REQUEST);
  }

  const redirectUri = oauthRedirectUri('facebook');
  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token');
  tokenUrl.searchParams.set('client_id', appId);
  tokenUrl.searchParams.set('redirect_uri', redirectUri);
  tokenUrl.searchParams.set('client_secret', appSecret);
  tokenUrl.searchParams.set('code', code);
  const tr = await fetch(tokenUrl.toString());
  const tokenJson = (await tr.json()) as { access_token?: string; error?: { message?: string } };

  if (!tr.ok || !tokenJson.access_token) {
    const msg = tokenJson.error?.message || 'Facebook token exchange failed';
    throw new InputValidationError(msg, HttpStatusCodesUtil.BAD_REQUEST);
  }

  const meUrl = new URL('https://graph.facebook.com/v19.0/me');
  meUrl.searchParams.set('fields', 'id,name,email');
  meUrl.searchParams.set('access_token', tokenJson.access_token);
  const mr = await fetch(meUrl.toString());
  const me = (await mr.json()) as { id?: string; name?: string; email?: string; error?: { message?: string } };

  if (!mr.ok || !me.id) {
    const msg = me.error?.message || 'Facebook profile fetch failed';
    throw new InputValidationError(msg, HttpStatusCodesUtil.BAD_REQUEST);
  }

  if (!me.email) {
    throw new InputValidationError(
      'Facebook did not return an email (grant email permission)',
      HttpStatusCodesUtil.BAD_REQUEST,
    );
  }

  return {
    provider: 'facebook',
    providerUserId: me.id,
    email: me.email.trim().toLowerCase(),
    name: (me.name || me.email.split('@')[0] || 'User').trim(),
  };
}

function appleClientSecretJwt(): string {
  const { clientId, teamId, keyId, privateKey } = config.AUTH.OAUTH.apple;

  if (!clientId || !teamId || !keyId || !privateKey) {
    throw new InputValidationError('Apple sign-in is not fully configured', HttpStatusCodesUtil.BAD_REQUEST);
  }

  return jwt.sign({}, privateKey, {
    algorithm: 'ES256',
    keyid: keyId,
    issuer: teamId,
    audience: 'https://appleid.apple.com',
    subject: clientId,
    expiresIn: '5m',
  });
}

export async function exchangeAppleCode(
  code: string,
  state: string,
  _idTokenFromQuery: string | undefined,
  userJsonFromQuery: string | undefined,
): Promise<{
  provider: 'apple';
  providerUserId: string;
  email: string;
  name: string;
}> {
  const st = verifyOAuthState(state);
  const { clientId } = config.AUTH.OAUTH.apple;

  if (!clientId) {
    throw new InputValidationError('Apple sign-in is not configured', HttpStatusCodesUtil.BAD_REQUEST);
  }

  const redirectUri = oauthRedirectUri('apple');
  const clientSecret = appleClientSecretJwt();
  const body = new URLSearchParams();

  body.set('client_id', clientId);
  body.set('client_secret', clientSecret);
  body.set('code', code);
  body.set('grant_type', 'authorization_code');
  body.set('redirect_uri', redirectUri);

  const tr = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const tokenJson = (await tr.json()) as { id_token?: string; error?: string; error_description?: string };

  if (!tr.ok || !tokenJson.id_token) {
    const msg = tokenJson.error_description || tokenJson.error || 'Apple token exchange failed';
    throw new InputValidationError(msg, HttpStatusCodesUtil.BAD_REQUEST);
  }

  const JWKS = jose.createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
  const { payload } = await jose.jwtVerify(tokenJson.id_token, JWKS, {
    issuer: 'https://appleid.apple.com',
    audience: clientId,
    ...(st.nonce ? { nonce: st.nonce } : {}),
  });

  const sub = typeof payload.sub === 'string' ? payload.sub : '';
  if (!sub) {
    throw new InputValidationError('Apple token missing subject', HttpStatusCodesUtil.BAD_REQUEST);
  }

  let email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  let nameFromToken = '';
  if (userJsonFromQuery) {
    try {
      const userObj = JSON.parse(userJsonFromQuery) as {
        email?: string;
        name?: { firstName?: string; lastName?: string };
      };

      if (userObj.email) {
        email = userObj.email.trim().toLowerCase();
      }

      const fn = userObj.name?.firstName?.trim() || '';
      const ln = userObj.name?.lastName?.trim() || '';
      nameFromToken = [fn, ln].filter(Boolean).join(' ').trim();
    } catch {
      /* ignore */
    }
  }
  if (!email) {
    throw new InputValidationError(
      'Apple did not provide an email. Use the same Apple ID or try again after granting email scope.',
      HttpStatusCodesUtil.BAD_REQUEST,
    );
  }

  const name = nameFromToken || email.split('@')[0] || 'User';

  return {
    provider: 'apple',
    providerUserId: sub,
    email,
    name,
  };
}
