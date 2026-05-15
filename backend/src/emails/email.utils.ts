import config from '../config';
import { EMAIL_DEFAULT_LOGO_PATH } from './email.constants';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatBookingDateHy(dateIso: string): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleString('hy-AM', { dateStyle: 'full', timeStyle: 'short' });
}

function isAbsoluteHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function joinPublicOrigin(origin: string, pathname: string): string {
  const base = origin.replace(/\/+$/, '');
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

/**
 * Resolves a public logo URL for email `<img src>`.
 * Default asset: `backend/upload/logo.svg` → `{API_PUBLIC_URL}/upload/logo.svg`.
 * Override with `EMAIL_LOGO_URL` when the logo is hosted elsewhere (CDN, etc.).
 */
export function resolveEmailLogoUrl(): string | null {
  const configured = config.MAIL.LOGO_URL.trim();
  if (configured && isAbsoluteHttpUrl(configured)) {
    return configured;
  }

  const candidates = [
    joinPublicOrigin(config.API_PUBLIC_URL, EMAIL_DEFAULT_LOGO_PATH),
    joinPublicOrigin(config.PANEL_DEFAULT_ORIGIN, EMAIL_DEFAULT_LOGO_PATH),
  ];

  for (const url of candidates) {
    if (isAbsoluteHttpUrl(url)) {
      return url;
    }
  }

  return null;
}

/** Prefixes plain-text bodies with consistent branding (logo cannot render in text). */
export function wrapPlainTextBody(body: string, options?: { preheader?: string }): string {
  const company = config.MAIL.COMPANY_NAME;
  const support = config.MAIL.SUPPORT_EMAIL;
  const lines = [`${company}`, ''];
  if (options?.preheader) {
    lines.push(options.preheader, '');
  }
  lines.push(body.trim(), '', '—', `Աջակցություն: ${support}`);
  return lines.join('\n');
}
