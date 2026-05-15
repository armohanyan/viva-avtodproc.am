import config from '../config';
import { LoggerUtil } from '../utils';
import { EMAIL_COMPANY } from './email.constants';

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

function isBrevoConfigured(): boolean {
  return Boolean(config.MAIL.BREVO_API_KEY && config.MAIL.SENDER_EMAIL);
}

/** Whether transactional emails can be sent (Brevo API + verified sender). */
export function isTransactionalMailConfigured(): boolean {
  return isBrevoConfigured();
}

export type TransactionalEmailPayload = {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
};

/**
 * Sends HTML (+ optional plain text) via Brevo REST API.
 * Compatible with the same payload shape used by SendGrid/Nodemailer HTML transports.
 */
async function postBrevoEmail(body: TransactionalEmailPayload): Promise<void> {
  if (!isBrevoConfigured()) {
    LoggerUtil.warn('Brevo mail skipped: BREVO_API_KEY or SENDER_EMAIL not set');
    return;
  }

  const res = await fetch(BREVO_API, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': config.MAIL.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { email: config.MAIL.SENDER_EMAIL, name: EMAIL_COMPANY.senderName },
      ...body,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${text.slice(0, 500)}`);
  }
}

export async function sendTransactionalEmail(body: TransactionalEmailPayload): Promise<void> {
  if (!isBrevoConfigured()) {
    LoggerUtil.warn('Transactional mail skipped: set BREVO_API_KEY and SENDER_EMAIL (https://app.brevo.com/)');
    return;
  }
  await postBrevoEmail(body);
}
