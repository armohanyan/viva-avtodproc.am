import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import {
  DIRECTOR_CASH_DIRECTION_LABELS,
  DIRECTOR_CASH_SOURCE_LABELS,
  DIRECTOR_PAYMENT_LABELS,
} from "src/modules/director/director.consts";
import type { CashShiftDetail } from "./cash-register.types";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatStamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("hy-AM", {
    timeZone: "Asia/Yerevan",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function printCashRegisterReport(detail: CashShiftDetail): void {
  const { shift, entries } = detail;
  const diffLabel =
    shift.difference != null
      ? shift.difference === 0
        ? "0"
        : shift.difference > 0
          ? `+${formatAmd(shift.difference)}`
          : `−${formatAmd(Math.abs(shift.difference))}`
      : "—";

  const rows = entries
    .map(
      (e) => `
    <tr>
      <td>${escapeHtml(e.occurredAt)}</td>
      <td>${escapeHtml(DIRECTOR_CASH_SOURCE_LABELS[e.source])}</td>
      <td>${escapeHtml(DIRECTOR_PAYMENT_LABELS[e.paymentMethod])}</td>
      <td>${escapeHtml(DIRECTOR_CASH_DIRECTION_LABELS[e.direction])}</td>
      <td class="num">${escapeHtml(formatAmd(e.amount))}</td>
      <td>${escapeHtml(e.performedByName ?? "—")}</td>
      <td>${escapeHtml(e.comment ?? "—")}</td>
    </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="hy">
<head>
  <meta charset="utf-8" />
  <title>Դրամարկղ · ${escapeHtml(shift.branchName)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: system-ui, sans-serif; font-size: 11pt; color: #111; margin: 0; }
    h1 { font-size: 16pt; margin: 0 0 4px; }
    .meta { margin-bottom: 16px; line-height: 1.5; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin-bottom: 16px; }
    .grid dt { font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; }
    th, td { border: 1px solid #ccc; padding: 4px 6px; vertical-align: top; }
    th { background: #f3f4f6; text-align: left; }
    td.num { text-align: right; white-space: nowrap; }
    @media print {
      body { -webkit-print-color-adjust: economy; print-color-adjust: economy; }
    }
  </style>
</head>
<body>
  <h1>Դրամարկղ · ${escapeHtml(shift.branchName)}</h1>
  <div class="meta">
    <div>Ադմին · ${escapeHtml(shift.adminName)}</div>
    <div>Բացված · ${escapeHtml(formatStamp(shift.openedAt))}</div>
    <div>Փակված · ${escapeHtml(formatStamp(shift.closedAt))}</div>
  </div>
  <dl class="grid">
    <dt>Սկզբնական մնացորդ</dt><dd>${escapeHtml(formatAmd(shift.openingBalance))}</dd>
    <dt>Կանխիկ մուտք</dt><dd>${escapeHtml(formatAmd(shift.cashInTotal))}</dd>
    <dt>Կանխիկ ելք</dt><dd>${escapeHtml(formatAmd(shift.cashOutTotal))}</dd>
    <dt>Հաշվարկային մնացորդ</dt><dd>${escapeHtml(formatAmd(shift.expectedBalance))}</dd>
    <dt>Փաստացի մնացորդ</dt><dd>${shift.actualBalance != null ? escapeHtml(formatAmd(shift.actualBalance)) : "—"}</dd>
    <dt>Տարբերություն</dt><dd>${escapeHtml(diffLabel)}</dd>
  </dl>
  <h2 style="font-size: 12pt; margin: 16px 0 8px;">Գործարքներ</h2>
  <table>
    <thead>
      <tr>
        <th>Ամսաթիվ</th>
        <th>Աղբյուր</th>
        <th>Վճարում</th>
        <th>Ուղղություն</th>
        <th>Գումար</th>
        <th>Կատարող</th>
        <th>Մեկնաբանություն</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7">—</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
