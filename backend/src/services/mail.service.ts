import config from '../config';
import { LoggerUtil } from '../utils';

const BREVO_API = 'https://api.brevo.com/v3/smtp/email';

function isBrevoConfigured(): boolean {
  return Boolean(config.MAIL.BREVO_API_KEY && config.MAIL.SENDER_EMAIL);
}

/** Whether transactional emails can be sent (Brevo API + verified sender). */
export function isTransactionalMailConfigured(): boolean {
  return isBrevoConfigured();
}

async function postBrevoEmail(body: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}): Promise<void> {
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
      sender: { email: config.MAIL.SENDER_EMAIL, name: 'Viva' },
      ...body,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Brevo API error ${res.status}: ${text.slice(0, 500)}`);
  }
}

async function sendTransactionalEmail(body: {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
}): Promise<void> {
  if (!isBrevoConfigured()) {
    LoggerUtil.warn('Transactional mail skipped: set BREVO_API_KEY and SENDER_EMAIL (https://app.brevo.com/)');
    return;
  }
  await postBrevoEmail(body);
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
  shadow: 'rgba(13, 11, 11, 0.08)',
} as const;

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
        <p style="margin:0;">Հարգանքներով,<br/><strong style="color:${text};">Viva</strong>✨</p>
      </td></tr>
    </table>
  </td></tr>
</table>`;
}

function ctaButton(href: string, label: string): string {
  const { primary, onPrimary } = BRAND;
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${primary};color:${onPrimary};text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:700;">${escapeHtml(label)}</a>`;
}

export type BookingConfirmationData = {
  bookingId: number;
  studentName: string;
  bookingType: string;
  instructorName?: string | null;
  slots: string[];
  packageName?: string | null;
  theoryGroupName?: string | null;
  dateIso: string;
  priceAmd: number | null;
  paymentStatus: string;
  bookingStatus: string;
  supportEmail?: string | null;
};

export type BookingLifecycleEmailData = {
  bookingId: number;
  studentName: string;
  bookingType: string;
  dateIso: string;
  time: string;
  eventKey:
    | 'created'
    | 'updated'
    | 'cancel_request'
    | 'confirmed'
    | 'cancelled'
    | 'refunded'
    | 'payment_received'
    | 'payment_reminder'
    | 'auto_cancelled_payment';
  statusLabel: string;
  summary: string;
};

export type TransactionLifecycleEmailData = {
  studentName: string;
  transactionId: number;
  description: string;
  grossAmd: number;
  flowLabel: 'package' | 'group' | 'practical' | 'one_on_one' | 'other';
  eventKey: 'created' | 'refund_requested' | 'refund_approved' | 'refund_rejected';
  statusLabel: string;
  actionLabel: string;
};

function bookingTypeLabelHy(bookingType: string): string {
  const t = bookingType.trim().toLowerCase();
  if (t.includes('group') || t.includes('theory')) return 'Խմբային տեսություն';
  if (t.includes('1:1') || t.includes('personal')) return '1:1 տեսություն';
  if (t.includes('practical')) return 'Պրակտիկ դաս';
  return bookingType || 'Դաս';
}

function bookingEventSubject(data: BookingLifecycleEmailData): string {
  const typeHy = bookingTypeLabelHy(data.bookingType);
  const idPart = `#${data.bookingId}`;
  switch (data.eventKey) {
    case 'created':
      return `Նոր ամրագրում (${typeHy}) ${idPart}`;
    case 'updated':
      return `Ամրագրման թարմացում (${typeHy}) ${idPart}`;
    case 'cancel_request':
      return `Չեղարկման հայտը ստացվել է (${typeHy}) ${idPart}`;
    case 'confirmed':
      return `Ամրագրումը հաստատվել է (${typeHy}) ${idPart}`;
    case 'cancelled':
      return `Ամրագրումը չեղարկվել է (${typeHy}) ${idPart}`;
    case 'refunded':
      return `Վերադարձով չեղարկում (${typeHy}) ${idPart}`;
    case 'payment_received':
      return `Վճարումը ստացվել է (${typeHy}) ${idPart}`;
    case 'payment_reminder':
      return `Վճարման հիշեցում (${typeHy}) ${idPart}`;
    case 'auto_cancelled_payment':
      return `Ամրագրումը չեղարկվել է — վճարում չկատարվեց (${typeHy}) ${idPart}`;
    default:
      return `Ամրագրման թարմացում ${idPart}`;
  }
}

function txFlowLabelHy(flow: TransactionLifecycleEmailData['flowLabel']): string {
  if (flow === 'package') return 'Փաթեթ';
  if (flow === 'group') return 'Խմբային տեսություն';
  if (flow === 'practical') return 'Պրակտիկ';
  if (flow === 'one_on_one') return '1:1';
  return 'Գործարք';
}

function transactionEventSubject(data: TransactionLifecycleEmailData): string {
  const flowHy = txFlowLabelHy(data.flowLabel);
  switch (data.eventKey) {
    case 'created':
      return `${flowHy} վճարման թարմացում #${data.transactionId}`;
    case 'refund_requested':
      return `${flowHy} վճարման վերադարձի հարցում #${data.transactionId}`;
    case 'refund_approved':
      return `${flowHy} վճարման վերադարձը հաստատվեց #${data.transactionId}`;
    case 'refund_rejected':
      return `${flowHy} վճարման վերադարձը մերժվեց #${data.transactionId}`;
    default:
      return `Գործարքի թարմացում #${data.transactionId}`;
  }
}

export default class MailService {
  static async sendStudentInvitation(toEmail: string, studentName: string, setupPasswordUrl: string): Promise<void> {
    const safeName = studentName.trim() || 'Ուսանող';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 👋</p>
        <p style="margin:0 0 16px;">Ուրախ ենք, որ մեզ հետ եք։ Հրավիրում ենք Ձեզ <strong style="color:${BRAND.text};">Viva</strong> ուսանողական հարթակ — մնում է միայն սահմանել Ձեր գաղտնաբառը, և կարող եք սկսել։</p>
        <p style="margin:0 0 16px;">${ctaButton(setupPasswordUrl, 'Սահմանել գաղտնաբառը')}</p>
        <p style="margin:0;font-size:14px;color:${BRAND.muted};">Հղումը շուտով կդառնա անվավեր։ Եթե այս նամակը չեք սպասել, կարող եք անտեսել այն։</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: 'Ուրախ ենք Ձեզ տեսնել Viva-ում — ակտիվացրեք Ձեր հաշիվը',
      htmlContent: emailShell(inner),
      textContent: `Բարև, ${safeName},\n\nՈւրախ ենք, որ մեզ հետ եք։ Սահմանեք Ձեր գաղտնաբառը՝ ${setupPasswordUrl}\n\nՀղումը շուտով կդառնա անվավեր։\n`,
    });
  }

  static async sendInstructorInvitation(toEmail: string, instructorName: string, setupPasswordUrl: string): Promise<void> {
    const safeName = instructorName.trim() || 'Դասավանդող';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 👋</p>
        <p style="margin:0 0 16px;">Ձեզ հրավիրում ենք <strong style="color:${BRAND.text};">Viva</strong> դասավանդողի հարթակ — մնում է սահմանել Ձեր գաղտնաբառը, և կարող եք մուտք գործել։</p>
        <p style="margin:0 0 16px;">${ctaButton(setupPasswordUrl, 'Սահմանել գաղտնաբառը')}</p>
        <p style="margin:0;font-size:14px;color:${BRAND.muted};">Հղումը շուտով կդառնա անվավեր։ Եթե այս նամակը չեք սպասել, կարող եք անտեսել այն։</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: 'Viva — հրավեր դասավանդողի հաշիվ ակտիվացնելու համար',
      htmlContent: emailShell(inner),
      textContent: `Բարև, ${safeName},\n\nՍահմանեք Ձեր գաղտնաբառը՝ ${setupPasswordUrl}\n\nՀղումը շուտով կդառնա անվավեր։\n`,
    });
  }

  static async sendAdminInvitation(toEmail: string, adminName: string, setupPasswordUrl: string): Promise<void> {
    const safeName = adminName.trim() || 'Ադմին';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 👋</p>
        <p style="margin:0 0 16px;">Ձեզ հրավիրում ենք <strong style="color:${BRAND.text};">Viva</strong> ադմին վահանակ։ Մուտք գործելու համար նախ սահմանեք Ձեր գաղտնաբառը։</p>
        <p style="margin:0 0 16px;">${ctaButton(setupPasswordUrl, 'Սահմանել գաղտնաբառը')}</p>
        <p style="margin:0;font-size:14px;color:${BRAND.muted};">Հղումը շուտով կդառնա անվավեր։ Եթե այս նամակը չեք սպասել, կարող եք անտեսել այն։</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: 'Viva — հրավեր ադմին հաշիվ ակտիվացնելու համար',
      htmlContent: emailShell(inner),
      textContent: `Բարև, ${safeName},\n\nՍահմանեք Ձեր գաղտնաբառը՝ ${setupPasswordUrl}\n\nՀղումը շուտով կդառնա անվավեր։\n`,
    });
  }

  static async sendSuperAdminInvitation(toEmail: string, adminName: string, setupPasswordUrl: string): Promise<void> {
    const safeName = adminName.trim() || 'Գլխավոր ադմին';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 👋</p>
        <p style="margin:0 0 16px;">Ձեզ հրավիրում ենք <strong style="color:${BRAND.text};">Viva</strong> գլխավոր ադմին վահանակ։ Մուտք գործելու համար նախ սահմանեք Ձեր գաղտնաբառը։</p>
        <p style="margin:0 0 16px;">${ctaButton(setupPasswordUrl, 'Սահմանել գաղտնաբառը')}</p>
        <p style="margin:0;font-size:14px;color:${BRAND.muted};">Հղումը շուտով կդառնա անվավեր։ Եթե այս նամակը չեք սպասել, կարող եք անտեսել այն։</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: 'Viva — հրավեր գլխավոր ադմին հաշիվ ակտիվացնելու համար',
      htmlContent: emailShell(inner),
      textContent: `Բարև, ${safeName},\n\nՍահմանեք Ձեր գաղտնաբառը՝ ${setupPasswordUrl}\n\nՀղումը շուտով կդառնա անվավեր։\n`,
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
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: 'Ձեր Viva ադմին մուտքի կոդը',
      htmlContent: emailShell(inner),
      textContent: `Բարև, ${safeName},\n\nՁեր մուտքի կոդ՝ ${code}\n\nԿոդը վավեր է 10 րոպե։\n`,
    });
  }

  static async sendPasswordReset(toEmail: string, userName: string, resetUrl: string): Promise<void> {
    const safeName = userName.trim() || 'Հարգելի օգտվող';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 💜</p>
        <p style="margin:0 0 16px;">Ստացել ենք Ձեր գաղտնաբառը վերականգնելու հայցը։ Սեղմեք կոճակը՝ նոր գաղտնաբառ ընտրելու համար (հղումը կարճ ժամանակով է գործում)։</p>
        <p style="margin:0 0 16px;">${ctaButton(resetUrl, 'Վերականգնել գաղտնաբառը')}</p>
        <p style="margin:0;font-size:14px;color:${BRAND.muted};">Եթե դուք չեք հայցել վերականգնում, պարզապես անտեսեք այս նամակը — Ձեր հաշիվը անվտանգ է մնում։</p>
    `;
    await sendTransactionalEmail({
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
    const slots = bookingData.slots.length > 0 ? bookingData.slots.join(', ') : '—';
    const nextStep =
      bookingData.bookingStatus === 'pending'
        ? 'Խնդրում ենք ավարտել քարտային վճարումը, որպեսզի ամրագրումը հաստատվի։'
        : 'Դասից առաջ ստուգեք ամրագրման մանրամասները Ձեր ուսանողական հարթակում։';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(bookingData.studentName || 'Student')} 🎉</p>
        <p style="margin:0 0 20px;">Ձեր ամրագրման տեղեկությունները պատրաստ են։</p>
        <ul style="margin:0 0 20px;padding-left:20px;color:${BRAND.muted};">
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Գրանցման համար՝</strong> ${escapeHtml(String(bookingData.bookingId))}</li>
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Ամրագրման տեսակ՝</strong> ${escapeHtml(bookingData.bookingType)}</li>
          ${bookingData.instructorName ? `<li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Դասավանդող՝</strong> ${escapeHtml(bookingData.instructorName)}</li>` : ''}
          ${bookingData.packageName ? `<li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Փաթեթ՝</strong> ${escapeHtml(bookingData.packageName)}</li>` : ''}
          ${bookingData.theoryGroupName ? `<li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Խմբային տեսություն՝</strong> ${escapeHtml(bookingData.theoryGroupName)}</li>` : ''}
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Ամսաթիվ և ժամ՝</strong> ${escapeHtml(dateHy)}</li>
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Սլոթեր՝</strong> ${escapeHtml(slots)}</li>
          <li><strong style="color:${BRAND.text};">Գին՝</strong> ${escapeHtml(price)}</li>
          <li><strong style="color:${BRAND.text};">Վճարման կարգավիճակ՝</strong> ${escapeHtml(bookingData.paymentStatus)}</li>
          <li><strong style="color:${BRAND.text};">Ամրագրման կարգավիճակ՝</strong> ${escapeHtml(bookingData.bookingStatus)}</li>
        </ul>
        <p style="margin:0 0 8px;color:${BRAND.muted};">${escapeHtml(nextStep)}</p>
        <p style="margin:0;color:${BRAND.muted};">Աջակցություն՝ ${escapeHtml(bookingData.supportEmail || 'support@viva.am')}</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: userEmail }],
      subject: `Ձեր դասը հաստատված է (#${bookingData.bookingId})`,
      htmlContent: emailShell(inner),
      textContent: `Ձեր դասը հաստատված է (#${bookingData.bookingId}).\nԱմսաթիվ՝ ${dateHy}\nԳին՝ ${price}\n`,
    });
  }

  static async sendBookingLifecycleUpdate(userEmail: string, bookingData: BookingLifecycleEmailData): Promise<void> {
    const amount = Number.isFinite(Number(bookingData.bookingId)) ? `#${bookingData.bookingId}` : '—';
    const priceDate = formatBookingDateHy(`${bookingData.dateIso}T${bookingData.time}:00+04:00`);
    const intro =
      bookingData.eventKey === 'confirmed'
        ? 'Ձեր ամրագրումը հաստատվել է։'
        : bookingData.eventKey === 'payment_reminder'
          ? 'Ձեր ամրագրման համար շուտով պարտադիր կլինի վճարումը։'
          : bookingData.eventKey === 'auto_cancelled_payment'
            ? 'Ձեր ամրագրումը չեղարկվել է վճարումը ժամանակին չավարտելու պատճառով։'
            : 'Ձեր ամրագրման հետ կապված առկա է նոր թարմացում։';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(bookingData.studentName || 'Student')} 👋</p>
        <p style="margin:0 0 16px;">${escapeHtml(intro)}</p>
        <ul style="margin:0 0 20px;padding-left:20px;color:${BRAND.muted};">
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Ամրագրում՝</strong> ${escapeHtml(amount)}</li>
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Տեսակ՝</strong> ${escapeHtml(bookingData.bookingType)}</li>
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Ժամանակ՝</strong> ${escapeHtml(priceDate)}</li>
          <li><strong style="color:${BRAND.text};">Կարգավիճակ՝</strong> ${escapeHtml(bookingData.statusLabel)}</li>
        </ul>
        <p style="margin:0;color:${BRAND.muted};">${escapeHtml(bookingData.summary)}</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: userEmail }],
      subject: bookingEventSubject(bookingData),
      htmlContent: emailShell(inner),
      textContent: `Ամրագրման թարմացում ${amount}\nՏեսակ՝ ${bookingData.bookingType}\nԿարգավիճակ՝ ${bookingData.statusLabel}\n${bookingData.summary}\n`,
    });
  }

  static async sendTransactionLifecycleUpdate(userEmail: string, txData: TransactionLifecycleEmailData): Promise<void> {
    const amount = Number(txData.grossAmd).toLocaleString('hy-AM');
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(txData.studentName || 'Student')} 👋</p>
        <p style="margin:0 0 16px;">Ձեր գործարքի կարգավիճակը թարմացվել է։</p>
        <ul style="margin:0 0 20px;padding-left:20px;color:${BRAND.muted};">
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Գործարք՝</strong> #${txData.transactionId}</li>
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Նկարագրություն՝</strong> ${escapeHtml(txData.description)}</li>
          <li style="margin-bottom:8px;"><strong style="color:${BRAND.text};">Գումար՝</strong> ${escapeHtml(amount)} ֏</li>
          <li><strong style="color:${BRAND.text};">Կարգավիճակ՝</strong> ${escapeHtml(txData.statusLabel)}</li>
        </ul>
        <p style="margin:0;color:${BRAND.muted};">${escapeHtml(txData.actionLabel)}</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: userEmail }],
      subject: transactionEventSubject(txData),
      htmlContent: emailShell(inner),
      textContent: `Գործարքի թարմացում #${txData.transactionId}\nՆկարագրություն՝ ${txData.description}\nԳումար՝ ${amount} ֏\nԿարգավիճակ՝ ${txData.statusLabel}\n${txData.actionLabel}\n`,
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
