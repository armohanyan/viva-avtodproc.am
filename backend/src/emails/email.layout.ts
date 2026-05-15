import { EMAIL_BRAND, EMAIL_LAYOUT } from './email.constants';
import { renderEmailFooter, renderEmailHeader } from './email.components';
import { escapeHtml } from './email.utils';

const { pageBg, cardBg, text, border, shadow } = EMAIL_BRAND;
const { maxWidth, contentMaxWidth, outerPadding, cardRadius, bodyPadding, headerPadding } = EMAIL_LAYOUT;

/**
 * Wraps transactional email body HTML in a responsive, client-safe shell
 * (Gmail, Outlook, Apple Mail). Inline CSS only; table-based structure.
 */
export function renderEmailLayout(innerHtml: string, options?: { preheader?: string }): string {
  const preheader = options?.preheader?.trim();
  const preheaderBlock = preheader
    ? `<div style="display:none;font-size:1px;color:${pageBg};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">&#847;&nbsp;&#847;&nbsp;&#847;&nbsp;${escapeHtml(preheader)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="hy" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <title></title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style type="text/css">
    #outlook a { padding: 0; }
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-body-cell { padding-left: 20px !important; padding-right: 20px !important; }
      .email-header-cell { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${pageBg};font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;line-height:1.55;color:${text};-webkit-font-smoothing:antialiased;">
  ${preheaderBlock}
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color:${pageBg};">
    <tr>
      <td align="center" style="padding:${outerPadding};">
        <!--[if mso]>
        <table role="presentation" cellpadding="0" cellspacing="0" width="${contentMaxWidth}" align="center"><tr><td>
        <![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="email-container" style="max-width:${maxWidth}px;width:100%;background-color:${cardBg};border-radius:${cardRadius};border:1px solid ${border};box-shadow:0 8px 28px ${shadow};">
          <tr>
            <td class="email-header-cell" style="padding:${headerPadding};">
              ${renderEmailHeader()}
            </td>
          </tr>
          <tr>
            <td class="email-body-cell" style="padding:${bodyPadding};font-size:16px;line-height:1.55;color:${text};">
              ${innerHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0;">
              ${renderEmailFooter()}
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** @deprecated Use {@link renderEmailLayout}. */
export const emailShell = renderEmailLayout;
