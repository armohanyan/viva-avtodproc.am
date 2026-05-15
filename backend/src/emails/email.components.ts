import config from '../config';
import { EMAIL_BRAND, EMAIL_COMPANY, EMAIL_LAYOUT } from './email.constants';
import { escapeHtml, resolveEmailLogoUrl } from './email.utils';

const { text, muted, primary, onPrimary, link } = EMAIL_BRAND;
const { logoMaxWidth } = EMAIL_LAYOUT;

export function renderEmailCtaButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;">
  <tr>
    <td align="left">
      <a href="${escapeHtml(href)}" target="_blank" style="display:inline-block;background:${primary};color:${onPrimary};text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:700;font-size:15px;line-height:1.2;mso-padding-alt:12px 24px;">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

export function renderEmailLogoBlock(): string {
  const logoUrl = resolveEmailLogoUrl();
  const companyName = escapeHtml(EMAIL_COMPANY.name);
  const homeHref = escapeHtml(EMAIL_COMPANY.panelUrl);

  if (logoUrl) {
    const safeSrc = escapeHtml(logoUrl);
    return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding:0 0 4px;">
      <a href="${homeHref}" target="_blank" style="text-decoration:none;display:inline-block;">
        <!--[if mso]>
        <table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="${logoMaxWidth}">
        <![endif]-->
        <img
          src="${safeSrc}"
          alt="${companyName}"
          width="${logoMaxWidth}"
          border="0"
          style="display:block;max-width:${logoMaxWidth}px;width:100%;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;"
        />
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </a>
    </td>
  </tr>
</table>`;
  }

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
  <tr>
    <td align="center" style="padding:4px 0 8px;">
      <a href="${homeHref}" target="_blank" style="text-decoration:none;font-size:22px;font-weight:700;line-height:1.3;color:${text};letter-spacing:-0.02em;">${companyName}</a>
    </td>
  </tr>
</table>`;
}

export function renderEmailHeader(): string {
  return renderEmailLogoBlock();
}

export function renderEmailFooter(): string {
  const companyName = escapeHtml(EMAIL_COMPANY.name);
  const supportEmail = escapeHtml(EMAIL_COMPANY.supportEmail);
  const supportMailto = `mailto:${supportEmail}`;
  const panelUrl = escapeHtml(EMAIL_COMPANY.panelUrl);
  const panelLabel = escapeHtml(config.MAIL.COMPANY_NAME);

  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-top:1px solid ${EMAIL_BRAND.border};">
  <tr>
    <td style="padding:${EMAIL_LAYOUT.footerPadding};font-size:14px;line-height:1.6;color:${muted};background:${EMAIL_BRAND.soft};border-radius:0 0 ${EMAIL_LAYOUT.cardRadius} ${EMAIL_LAYOUT.cardRadius};">
      <p style="margin:0 0 12px;color:${text};font-size:15px;">Հարգանքներով,<br/><strong>${companyName}</strong></p>
      <p style="margin:0 0 8px;">
        <strong style="color:${text};">Աջակցություն՝</strong>
        <a href="${supportMailto}" style="color:${link};text-decoration:underline;">${supportEmail}</a>
      </p>
      <p style="margin:0;font-size:13px;">
        <a href="${panelUrl}" target="_blank" style="color:${link};text-decoration:underline;">${panelLabel}</a>
      </p>
    </td>
  </tr>
</table>`;
}
