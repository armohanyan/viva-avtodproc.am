import config from '../config';
import {
  EMAIL_BRAND,
  escapeHtml,
  formatBookingDateHy,
  isTransactionalMailConfigured,
  renderEmailCtaButton,
  renderEmailLayout,
  sendTransactionalEmail,
  wrapPlainTextBody,
} from '../emails';

export { isTransactionalMailConfigured };

function bookingTypeLabelHy(bookingType: string): string {
  const t = bookingType.trim().toLowerCase();
  if (t.includes('group') || t.includes('theory')) return 'Խմբային տեսություն';
  if (t.includes('1:1') || t.includes('personal')) return '1:1 տեսություն';
  if (t.includes('practical')) return 'Պրակտիկ դաս';
  return bookingType || 'Դաս';
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

const { text, muted } = EMAIL_BRAND;

export default class MailService {
  static async sendStudentInvitation(toEmail: string, studentName: string, setupPasswordUrl: string): Promise<void> {
    const safeName = studentName.trim() || 'Ուսանող';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 👋</p>
        <p style="margin:0 0 16px;">Ուրախ ենք, որ մեզ հետ եք։ Հրավիրում ենք Ձեզ <strong style="color:${text};">${escapeHtml(config.MAIL.COMPANY_NAME)}</strong> ուսանողական հարթակ — մնում է միայն սահմանել Ձեր գաղտնաբառը, և կարող եք սկսել։</p>
        ${renderEmailCtaButton(setupPasswordUrl, 'Սահմանել գաղտնաբառը')}
        <p style="margin:0;font-size:14px;color:${muted};">Հղումը շուտով կդառնա անվավեր։ Եթե այս նամակը չեք սպասել, կարող եք անտեսել այն։</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: `Ուրախ ենք Ձեզ տեսնել ${config.MAIL.COMPANY_NAME}-ում — ակտիվացրեք Ձեր հաշիվը`,
      htmlContent: renderEmailLayout(inner, { preheader: 'Ակտիվացրեք Ձեր ուսանողական հաշիվը' }),
      textContent: wrapPlainTextBody(
        `Բարև, ${safeName},\n\nՈւրախ ենք, որ մեզ հետ եք։ Սահմանեք Ձեր գաղտնաբառը՝ ${setupPasswordUrl}\n\nՀղումը շուտով կդառնա անվավեր։`,
      ),
    });
  }

  static async sendInstructorInvitation(toEmail: string, instructorName: string, setupPasswordUrl: string): Promise<void> {
    const safeName = instructorName.trim() || 'Դասավանդող';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 👋</p>
        <p style="margin:0 0 16px;">Ձեզ հրավիրում ենք <strong style="color:${text};">${escapeHtml(config.MAIL.COMPANY_NAME)}</strong> դասավանդողի հարթակ — մնում է սահմանել Ձեր գաղտնաբառը, և կարող եք մուտք գործել։</p>
        ${renderEmailCtaButton(setupPasswordUrl, 'Սահմանել գաղտնաբառը')}
        <p style="margin:0;font-size:14px;color:${muted};">Հղումը շուտով կդառնա անվավեր։ Եթե այս նամակը չեք սպասել, կարող եք անտեսել այն։</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: `${config.MAIL.COMPANY_NAME} — հրավեր դասավանդողի հաշիվ ակտիվացնելու համար`,
      htmlContent: renderEmailLayout(inner, { preheader: 'Սահմանեք գաղտնաբառը և մուտք գործեք' }),
      textContent: wrapPlainTextBody(`Բարև, ${safeName},\n\nՍահմանեք Ձեր գաղտնաբառը՝ ${setupPasswordUrl}\n\nՀղումը շուտով կդառնա անվավեր։`),
    });
  }

  static async sendAdminInvitation(toEmail: string, adminName: string, setupPasswordUrl: string): Promise<void> {
    const safeName = adminName.trim() || 'Ադմին';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 👋</p>
        <p style="margin:0 0 16px;">Ձեզ հրավիրում ենք <strong style="color:${text};">${escapeHtml(config.MAIL.COMPANY_NAME)}</strong> ադմին վահանակ։ Մուտք գործելու համար նախ սահմանեք Ձեր գաղտնաբառը։</p>
        ${renderEmailCtaButton(setupPasswordUrl, 'Սահմանել գաղտնաբառը')}
        <p style="margin:0;font-size:14px;color:${muted};">Հղումը շուտով կդառնա անվավեր։ Եթե այս նամակը չեք սպասել, կարող եք անտեսել այն։</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: `${config.MAIL.COMPANY_NAME} — հրավեր ադմին հաշիվ ակտիվացնելու համար`,
      htmlContent: renderEmailLayout(inner),
      textContent: wrapPlainTextBody(`Բարև, ${safeName},\n\nՍահմանեք Ձեր գաղտնաբառը՝ ${setupPasswordUrl}\n\nՀղումը շուտով կդառնա անվավեր։`),
    });
  }

  static async sendSuperAdminInvitation(toEmail: string, adminName: string, setupPasswordUrl: string): Promise<void> {
    const safeName = adminName.trim() || 'Գլխավոր ադմին';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 👋</p>
        <p style="margin:0 0 16px;">Ձեզ հրավիրում ենք <strong style="color:${text};">${escapeHtml(config.MAIL.COMPANY_NAME)}</strong> գլխավոր ադմին վահանակ։ Մուտք գործելու համար նախ սահմանեք Ձեր գաղտնաբառը։</p>
        ${renderEmailCtaButton(setupPasswordUrl, 'Սահմանել գաղտնաբառը')}
        <p style="margin:0;font-size:14px;color:${muted};">Հղումը շուտով կդառնա անվավեր։ Եթե այս նամակը չեք սպասել, կարող եք անտեսել այն։</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: `${config.MAIL.COMPANY_NAME} — հրավեր գլխավոր ադմին հաշիվ ակտիվացնելու համար`,
      htmlContent: renderEmailLayout(inner),
      textContent: wrapPlainTextBody(`Բարև, ${safeName},\n\nՍահմանեք Ձեր գաղտնաբառը՝ ${setupPasswordUrl}\n\nՀղումը շուտով կդառնա անվավեր։`),
    });
  }

  static async sendAdminEmailOtp(toEmail: string, adminName: string, code: string): Promise<void> {
    const safeName = adminName.trim() || 'Ադմին';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 🔐</p>
        <p style="margin:0 0 12px;color:${muted};">Ձեր մեկանգամյա մուտքի կոդը՝</p>
        <p style="margin:0 0 20px;padding:16px 20px;border-radius:12px;border:2px solid ${EMAIL_BRAND.primary};background:${EMAIL_BRAND.soft};font-size:28px;font-weight:700;letter-spacing:6px;color:${text};font-family:ui-monospace,monospace;text-align:center;">${escapeHtml(code)}</p>
        <p style="margin:0;font-size:14px;color:${muted};">Կոդը վավեր է 10 րոպե։ Եթե դուք չեք փորձել մուտք գործել, պարզապես անտեսեք այս նամակը — Ձեր հաշիվը անվտանգ է։</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: `Ձեր ${config.MAIL.COMPANY_NAME} ադմին մուտքի կոդը`,
      htmlContent: renderEmailLayout(inner, { preheader: 'Մուտքի կոդը վավեր է 10 րոպե' }),
      textContent: wrapPlainTextBody(`Բարև, ${safeName},\n\nՁեր մուտքի կոդ՝ ${code}\n\nԿոդը վավեր է 10 րոպե։`),
    });
  }

  static async sendPasswordReset(toEmail: string, userName: string, resetUrl: string): Promise<void> {
    const safeName = userName.trim() || 'Հարգելի օգտվող';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(safeName)} 💜</p>
        <p style="margin:0 0 16px;">Ստացել ենք Ձեր գաղտնաբառը վերականգնելու հայցը։ Սեղմեք կոճակը՝ նոր գաղտնաբառ ընտրելու համար (հղումը կարճ ժամանակով է գործում)։</p>
        ${renderEmailCtaButton(resetUrl, 'Վերականգնել գաղտնաբառը')}
        <p style="margin:0;font-size:14px;color:${muted};">Եթե դուք չեք հայցել վերականգնում, պարզապես անտեսեք այս նամակը — Ձեր հաշիվը անվտանգ է մնում։</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: toEmail, name: safeName }],
      subject: `${config.MAIL.COMPANY_NAME} — Ձեր գաղտնաբառի վերականգնում`,
      htmlContent: renderEmailLayout(inner, { preheader: 'Վերականգնեք Ձեր գաղտնաբառը' }),
      textContent: wrapPlainTextBody(
        `Բարև, ${safeName},\n\nՎերականգնեք Ձեր գաղտնաբառը՝ ${resetUrl}\n\nԵթե դուք չեք հայցել, անտեսեք նամակը։`,
      ),
    });
  }

  static async sendBookingConfirmation(userEmail: string, bookingData: BookingConfirmationData): Promise<void> {
    const price =
      bookingData.priceAmd != null && Number.isFinite(Number(bookingData.priceAmd))
        ? `${Number(bookingData.priceAmd).toLocaleString('hy-AM')} ֏`
        : '—';
    const dateHy = formatBookingDateHy(bookingData.dateIso);
    const slots = bookingData.slots.length > 0 ? bookingData.slots.join(', ') : '—';
    const supportEmail = bookingData.supportEmail || config.MAIL.SUPPORT_EMAIL;
    const nextStep =
      bookingData.bookingStatus === 'pending'
        ? 'Խնդրում ենք ավարտել քարտային վճարումը, որպեսզի ամրագրումը հաստատվի։'
        : 'Դասից առաջ ստուգեք ամրագրման մանրամասները Ձեր ուսանողական հարթակում։';
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(bookingData.studentName || 'Student')} 🎉</p>
        <p style="margin:0 0 20px;">Ձեր ամրագրման տեղեկությունները պատրաստ են։</p>
        <ul style="margin:0 0 20px;padding-left:20px;color:${muted};">
          <li style="margin-bottom:8px;"><strong style="color:${text};">Գրանցման համար՝</strong> ${escapeHtml(String(bookingData.bookingId))}</li>
          <li style="margin-bottom:8px;"><strong style="color:${text};">Ամրագրման տեսակ՝</strong> ${escapeHtml(bookingData.bookingType)}</li>
          ${bookingData.instructorName ? `<li style="margin-bottom:8px;"><strong style="color:${text};">Դասավանդող՝</strong> ${escapeHtml(bookingData.instructorName)}</li>` : ''}
          ${bookingData.packageName ? `<li style="margin-bottom:8px;"><strong style="color:${text};">Փաթեթ՝</strong> ${escapeHtml(bookingData.packageName)}</li>` : ''}
          ${bookingData.theoryGroupName ? `<li style="margin-bottom:8px;"><strong style="color:${text};">Խմբային տեսություն՝</strong> ${escapeHtml(bookingData.theoryGroupName)}</li>` : ''}
          <li style="margin-bottom:8px;"><strong style="color:${text};">Ամսաթիվ և ժամ՝</strong> ${escapeHtml(dateHy)}</li>
          <li style="margin-bottom:8px;"><strong style="color:${text};">Սլոթեր՝</strong> ${escapeHtml(slots)}</li>
          <li><strong style="color:${text};">Գին՝</strong> ${escapeHtml(price)}</li>
          <li><strong style="color:${text};">Վճարման կարգավիճակ՝</strong> ${escapeHtml(bookingData.paymentStatus)}</li>
          <li><strong style="color:${text};">Ամրագրման կարգավիճակ՝</strong> ${escapeHtml(bookingData.bookingStatus)}</li>
        </ul>
        <p style="margin:0 0 8px;color:${muted};">${escapeHtml(nextStep)}</p>
    `;
    await sendTransactionalEmail({
      to: [{ email: userEmail }],
      subject: `Ձեր դասը հաստատված է (#${bookingData.bookingId})`,
      htmlContent: renderEmailLayout(inner, { preheader: `Ամրագրում #${bookingData.bookingId}` }),
      textContent: wrapPlainTextBody(
        `Ձեր դասը հաստատված է (#${bookingData.bookingId}).\nԱմսաթիվ՝ ${dateHy}\nԳին՝ ${price}\nԱջակցություն՝ ${supportEmail}`,
      ),
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
        <ul style="margin:0 0 20px;padding-left:20px;color:${muted};">
          <li style="margin-bottom:8px;"><strong style="color:${text};">Ամրագրում՝</strong> ${escapeHtml(amount)}</li>
          <li style="margin-bottom:8px;"><strong style="color:${text};">Տեսակ՝</strong> ${escapeHtml(bookingData.bookingType)}</li>
          <li style="margin-bottom:8px;"><strong style="color:${text};">Ժամանակ՝</strong> ${escapeHtml(priceDate)}</li>
          <li><strong style="color:${text};">Կարգավիճակ՝</strong> ${escapeHtml(bookingData.statusLabel)}</li>
        </ul>
        <p style="margin:0;color:${muted};">${escapeHtml(bookingData.summary)}</p>
    `;
    const subject = bookingEventSubject(bookingData);
    await sendTransactionalEmail({
      to: [{ email: userEmail }],
      subject,
      htmlContent: renderEmailLayout(inner, { preheader: intro }),
      textContent: wrapPlainTextBody(
        `Ամրագրման թարմացում ${amount}\nՏեսակ՝ ${bookingData.bookingType}\nԿարգավիճակ՝ ${bookingData.statusLabel}\n${bookingData.summary}`,
      ),
    });
  }

  static async sendTransactionLifecycleUpdate(userEmail: string, txData: TransactionLifecycleEmailData): Promise<void> {
    const amount = Number(txData.grossAmd).toLocaleString('hy-AM');
    const inner = `
        <p style="margin:0 0 16px;">Բարև, ${escapeHtml(txData.studentName || 'Student')} 👋</p>
        <p style="margin:0 0 16px;">Ձեր գործարքի կարգավիճակը թարմացվել է։</p>
        <ul style="margin:0 0 20px;padding-left:20px;color:${muted};">
          <li style="margin-bottom:8px;"><strong style="color:${text};">Գործարք՝</strong> #${txData.transactionId}</li>
          <li style="margin-bottom:8px;"><strong style="color:${text};">Նկարագրություն՝</strong> ${escapeHtml(txData.description)}</li>
          <li style="margin-bottom:8px;"><strong style="color:${text};">Գումար՝</strong> ${escapeHtml(amount)} ֏</li>
          <li><strong style="color:${text};">Կարգավիճակ՝</strong> ${escapeHtml(txData.statusLabel)}</li>
        </ul>
        <p style="margin:0;color:${muted};">${escapeHtml(txData.actionLabel)}</p>
    `;
    const subject = transactionEventSubject(txData);
    await sendTransactionalEmail({
      to: [{ email: userEmail }],
      subject,
      htmlContent: renderEmailLayout(inner, { preheader: txData.statusLabel }),
      textContent: wrapPlainTextBody(
        `Գործարքի թարմացում #${txData.transactionId}\nՆկարագրություն՝ ${txData.description}\nԳումար՝ ${amount} ֏\nԿարգավիճակ՝ ${txData.statusLabel}\n${txData.actionLabel}`,
      ),
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
