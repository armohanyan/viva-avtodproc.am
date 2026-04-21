import config from '../config';
import { LoggerUtil } from '../utils';

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

/** Panel brand tokens (aligned with `client/src/styles.css` :root). */
const BRAND = {
  pageBg: '#f9f8f5',
  cardBg: '#ffffff',
  text: '#0d0b0b',
  muted: '#565555',
  primary: '#f48633',
  onPrimary: '#0d0b0b',
  border: '#e2ded5',
  soft: '#efece6',
  link: '#c26a22',
  shadow: 'rgba(13, 11, 11, 0.08)',
} as const;

export type BookingConfirmationData = {
  bookingId: number;
  dateIso: string;
  priceAmd: number | null;
  /** Absolute URL to the student booking dashboard. */
  dashboardUrl: string;
};

function isMailConfigured(): boolean {
  return Boolean(config.MAIL.BREVO_API_KEY && config.MAIL.SENDER_EMAIL);
}

/** Whether transactional emails can be sent (Brevo + sender). */
export function isTransactionalMailConfigured(): boolean {
  return isMailConfigured();
}

async function postBrevoEmail(body: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}): Promise<void> {
  if (!isMailConfigured()) {
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
      sender: { email: config.MAIL.SENDER_EMAIL, name: 'Viva' },
      ...body,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${text.slice(0, 500)}`);
  }
}

function formatBookingDateHy(dateIso: string): string {
  const d = new Date(dateIso);
  if (Number.isNaN(d.getTime())) return dateIso;
  return d.toLocaleString('hy-AM', { dateStyle: 'full', timeStyle: 'short' });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function emailShell(innerHtml: string): string {
  const { pageBg, cardBg, text, muted, border, shadow, soft } = BRAND;
  return `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:${pageBg};font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.55;color:${text};">
  <tr><td align="center" style="padding:28px 16px;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;background:${cardBg};border-radius:16px;border:1px solid ${border};box-shadow:0 8px 28px ${shadow};">
      <tr><td style="padding:28px 28px 8px;font-size:17px;">
        ${innerHtml}
      </td></tr>
      <tr><td style="padding:12px 28px 28px;font-size:14px;color:${muted};background:${soft};border-radius:0 0 16px 16px;">
        <p style="margin:0;">Հարգանքներով,<br/><strong style="color:${text};">Viva</strong> թիմը ✨</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function ctaButton(href: string, label: string): string {
  const { primary, onPrimary } = BRAND;
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${primary};color:${onPrimary};text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">${escapeHtml(label)}</a>`;
}

export default class MailService {
  static async sendStudentInvitation(toEmail: string, studentName: string, setupPasswordUrl: string): Promise<void> {
    const safeName = studentName.trim() || 'Ուսանող';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 👋</p>
        <p style="margin:0 0 16px;">Ուրախ ենք, որ մեզ հետ եք։ Հրավիրում ենք Ձեզ <strong style="color:${BRAND.text};">Viva</strong> ուսանողական հարթակ — մնում է միայն սահմանել Ձեր գաղտնաբառը, և կարող եք սկսել։</p>
        <p style="margin:0 0 20px;">${ctaButton(setupPasswordUrl, 'Սահմանել գաղտնաբառը')}</p>
        <p style="margin:0 0 12px;font-size:15px;color:${BRAND.muted};">Եթե կոճակը չի բացվում, պատճենեք հղումը Ձեր դիտարկիչի մեջ՝</p>
        <p style="margin:0 0 20px;word-break:break-all;font-size:14px;color:${BRAND.link};">${escapeHtml(setupPasswordUrl)}</p>
        <p style="margin:0;font-size:14px;color:${BRAND.muted};">Հղումը շուտով կդառնա անվավեր։ Եթե այս նամակը չեք սպասել, կարող եք անտեսել այն։</p>
    `;
    await postBrevoEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: 'Ուրախ ենք Ձեզ տեսնել Viva-ում — ակտիվացրեք Ձեր հաշիվը',
      htmlContent: emailShell(inner),
      textContent: `Բարև, ${safeName},\n\nՈւրախ ենք, որ մեզ հետ եք։ Սահմանեք Ձեր գաղտնաբառը՝ ${setupPasswordUrl}\n\nՀղումը շուտով կդառնա անվավեր։\n`,
    });
  }

  static async sendAdminEmailOtp(toEmail: string, adminName: string, code: string): Promise<void> {
    const safeName = adminName.trim() || 'Ադմին';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 🔐</p>
        <p style="margin:0 0 12px;color:${BRAND.muted};">Ձեր մեկանգամյա մուտքի կոդը՝</p>
        <p style="margin:0 0 20px;padding:16px 20px;border-radius:12px;border:2px solid ${BRAND.primary};background:${BRAND.soft};font-size:28px;font-weight:700;letter-spacing:6px;color:${BRAND.text};font-family:ui-monospace,monospace;text-align:center;">${escapeHtml(code)}</p>
        <p style="margin:0;font-size:14px;color:${BRAND.muted};">Կոդը վավեր է 10 րոպե։ Եթե դուք չեք փորձել մուտք գործել, պարզապես անտեսեք այս նամակը — Ձեր հաշիվը անվտանգ է։</p>
    `;
    await postBrevoEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: 'Ձեր Viva ադմին մուտքի կոդը',
      htmlContent: emailShell(inner),
      textContent: `Բարև, ${safeName},\n\nՁեր մուտքի կոդ՝ ${code}\n\nԿոդը վավեր է 10 րոպե։\n`,
    });
  }

  /** Sends booking confirmation; safe to call without awaiting in fire-and-forget flows (caller should catch). */
  static async sendPasswordReset(toEmail: string, userName: string, resetUrl: string): Promise<void> {
    const safeName = userName.trim() || 'Հարգելի օգտվող';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 💜</p>
        <p style="margin:0 0 16px;">Ստացել ենք Ձեր գաղտնաբառը վերականգնելու հայցը։ Խնդրում ենք սեղմել ստորևի կոճակը՝ նոր գաղտնաբառ ընտրելու համար (հղումը կարճ ժամանակով է գործում)։</p>
        <p style="margin:0 0 20px;">${ctaButton(resetUrl, 'Վերականգնել գաղտնաբառը')}</p>
        <p style="margin:0 0 12px;font-size:15px;color:${BRAND.muted};">Եթե կոճակը չի բացվում, պատճենեք հղումը Ձեր դիտարկիչի մեջ՝</p>
        <p style="margin:0 0 20px;word-break:break-all;font-size:14px;color:${BRAND.link};">${escapeHtml(resetUrl)}</p>
        <p style="margin:0;font-size:14px;color:${BRAND.muted};">Եթե դուք չեք հայցել վերականգնում, պարզապես անտեսեք այս նամակը — Ձեր հաշիվը անվտանգ է մնում։</p>
    `;
    await postBrevoEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: 'Viva — Ձեր գաղտնաբառի վերականգնում',
      htmlContent: emailShell(inner),
      textContent: `Բարև, ${safeName},\n\nՎերականգնեք Ձեր գաղտնաբառը՝ ${resetUrl}\n\nԵթե դուք չեք հայցել, անտեսեք նամակը։\n`,
    });
  }

  static async sendBookingConfirmation(userEmail: string, bookingData: BookingConfirmationData): Promise<void> {
    const price =
      bookingData.priceAmd != null && Number.isFinite(Number(bookingData.priceAmd))
        ? `${Number(bookingData.priceAmd).toLocaleString('hy-AM')} ֏`
        : '—';
    const dateHy = formatBookingDateHy(bookingData.dateIso);
    const inner = `
        <p style="margin:0 0 16px;">Հիանալի նորություն է 🎉</p>
        <p style="margin:0 0 20px;">Ձեր դասը հաստատված է։ Սպասում ենք Ձեզ՝ պատրաստվեք հարմարավետ մթնոլորտում և կենտրոնացված դասին։</p>
        <ul style="margin:0 0 20px;padding-left:20px;color:${BRAND.muted};">
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Գրանցման համար՝</strong> ${escapeHtml(String(bookingData.bookingId))}</li>
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Ամսաթիվ և ժամ՝</strong> ${escapeHtml(dateHy)}</li>
          <li><strong style="color:${BRAND.text};">Գին՝</strong> ${escapeHtml(price)}</li>
        </ul>
        <p style="margin:0 0 12px;">${ctaButton(bookingData.dashboardUrl, 'Բացել Ձեր գրանցումների էջը')}</p>
        <p style="margin:0;word-break:break-all;font-size:13px;color:${BRAND.link};">${escapeHtml(bookingData.dashboardUrl)}</p>
    `;
    await postBrevoEmail({
      to: [{ email: userEmail }],
      subject: `Ձեր դասը հաստատված է (#${bookingData.bookingId})`,
      htmlContent: emailShell(inner),
      textContent: `Ձեր դասը հաստատված է (#${bookingData.bookingId}).\nԱմսաթիվ՝ ${dateHy}\nԳին՝ ${price}\nՀարթակ՝ ${bookingData.dashboardUrl}\n`,
    });
  }
}

/** Reusable entry point for booking confirmation emails (Brevo). */
export async function sendBookingConfirmation(
  userEmail: string,
  bookingData: BookingConfirmationData,
): Promise<void> {
  return MailService.sendBookingConfirmation(userEmail, bookingData);
}
