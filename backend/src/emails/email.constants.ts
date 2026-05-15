import config from '../config';

/**
 * Public path for the company logo (`backend/upload/logo.svg`, served by Express at `/upload`).
 * @see `app.ts` — `express.static(process.cwd()/upload)`
 */
export const EMAIL_DEFAULT_LOGO_PATH = '/upload/logo.svg';

/** Panel brand tokens (aligned with `client` CSS :root). */
export const EMAIL_BRAND = {
  pageBg: '#f9f8f5',
  cardBg: '#ffffff',
  text: '#0d0b0b',
  muted: '#565555',
  primary: '#f48633',
  onPrimary: '#0d0b0b',
  border: '#e2ded5',
  soft: '#efece6',
  shadow: 'rgba(13, 11, 11, 0.08)',
  link: '#c96a1a',
} as const;

export const EMAIL_LAYOUT = {
  maxWidth: 600,
  contentMaxWidth: 520,
  logoMaxWidth: 180,
  outerPadding: '32px 16px',
  cardRadius: '16px',
  bodyPadding: '8px 32px 24px',
  headerPadding: '28px 32px 8px',
  footerPadding: '20px 32px 28px',
} as const;

export const EMAIL_COMPANY = {
  name: config.MAIL.COMPANY_NAME,
  supportEmail: config.MAIL.SUPPORT_EMAIL,
  panelUrl: config.PANEL_DEFAULT_ORIGIN,
  senderName: config.MAIL.COMPANY_NAME,
} as const;
