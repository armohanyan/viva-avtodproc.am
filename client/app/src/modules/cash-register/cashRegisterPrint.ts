import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import { DIRECTOR_PAYMENT_LABELS } from "src/modules/director/director.consts";
import type {
  CashRegisterPeriodSummary,
  CashShiftDetail,
  CashShiftSummary,
} from "./cash-register.types";

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

function formatDay(iso: string): string {
  return iso.slice(0, 10);
}

const PRINT_STYLES = `
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.35;
    color: #000;
    margin: 0;
  }
  .report-header {
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 14px;
  }
  .brand { font-size: 11pt; font-weight: 700; letter-spacing: 0.02em; margin: 0 0 4px; }
  .report-title { font-size: 14pt; font-weight: 700; margin: 0 0 6px; }
  .report-meta { font-size: 9pt; color: #333; margin: 0; }
  .report-meta span + span::before { content: " · "; }
  .section { margin-top: 16px; page-break-inside: avoid; }
  .section-title {
    font-size: 11pt;
    font-weight: 700;
    margin: 0 0 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid #999;
  }
  .branch-block {
    border: 1px solid #666;
    padding: 10px 12px;
    margin-bottom: 12px;
    page-break-inside: avoid;
  }
  .branch-name { font-size: 12pt; font-weight: 700; margin: 0 0 2px; }
  .branch-sub { font-size: 9pt; color: #444; margin: 0 0 8px; }
  .branch-cash-now {
    font-size: 13pt;
    font-weight: 700;
    margin: 0 0 10px;
  }
  table.data {
    width: 100%;
    border-collapse: collapse;
    font-size: 8.5pt;
  }
  table.data th,
  table.data td {
    border: 1px solid #333;
    padding: 4px 6px;
    vertical-align: top;
  }
  table.data th {
    background: #ececec;
    font-weight: 600;
    text-align: left;
  }
  table.data td.num,
  table.data th.num {
    text-align: right;
    white-space: nowrap;
  }
  table.kv { width: 100%; max-width: 420px; border-collapse: collapse; font-size: 9.5pt; }
  table.kv td { padding: 3px 0; border: none; vertical-align: top; }
  table.kv td:first-child { color: #333; padding-right: 12px; }
  table.kv td:last-child { text-align: right; font-weight: 600; white-space: nowrap; }
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 4px;
  }
  .kpi {
    border: 1px solid #333;
    padding: 8px 10px;
    min-height: 52px;
  }
  .kpi-label { font-size: 8pt; color: #444; margin: 0 0 4px; line-height: 1.2; }
  .kpi-value { font-size: 11pt; font-weight: 700; margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: economy; print-color-adjust: economy; }
    .section { page-break-inside: auto; }
    table.data thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
  }
`;

function reportHeaderHtml(opts: {
  dateStart: string;
  dateEnd: string;
  branchScope: string;
  printedBy?: string;
}): string {
  const range =
    opts.dateStart === opts.dateEnd
      ? escapeHtml(formatDay(opts.dateStart))
      : `${escapeHtml(formatDay(opts.dateStart))} — ${escapeHtml(formatDay(opts.dateEnd))}`;
  return `
  <header class="report-header">
    <p class="brand">Viva</p>
    <h1 class="report-title">Մասնաճյուղերի դրամարկղի հաշվետվություն</h1>
    <p class="report-meta">
      <span>${range}</span>
      <span>${escapeHtml(opts.branchScope)}</span>
      ${opts.printedBy ? `<span>${escapeHtml(opts.printedBy)}</span>` : ""}
      <span>AMD / ֏ · Asia/Yerevan</span>
    </p>
  </header>`;
}

/** Hidden iframe — avoids popup blockers and blank tabs when `noopener` blocks `document.write`. */
function openPrintWindow(title: string, body: string): void {
  const html = `<!DOCTYPE html>
<html lang="hy">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>${body}</body>
</html>`;

  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("title", "cash-register-print");
    iframe.style.cssText =
      "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win?.document;
    if (!win || !doc) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    let printed = false;
    const runPrint = () => {
      if (printed) return;
      printed = true;
      win.focus();
      win.print();
      window.setTimeout(() => iframe.remove(), 800);
    };

    win.addEventListener("load", runPrint);
    window.setTimeout(runPrint, 400);
  } catch {
    /* ignore */
  }
}

function branchRegisterBlock(shift: CashShiftSummary, reportDay: string): string {
  const isOpen = shift.status === "OPEN";
  const diff =
    shift.difference != null
      ? shift.difference === 0
        ? formatAmd(0)
        : shift.difference > 0
          ? `+${formatAmd(shift.difference)}`
          : `−${formatAmd(Math.abs(shift.difference))}`
      : "—";

  const statusLine = isOpen
    ? `Գրաֆիկը բաց է · ${escapeHtml(formatStamp(shift.openedAt))}`
    : shift.closedAt
      ? `Վերջին հաշվարկ · ${escapeHtml(formatStamp(shift.closedAt))}`
      : "";

  return `
  <div class="branch-block">
    <h2 class="branch-name">${escapeHtml(shift.branchName)}</h2>
    <p class="branch-sub">Մասնաճյուղի ընդհանուր դրամարկղ · ${escapeHtml(reportDay)}</p>
    <p class="branch-cash-now">Ընթացիկ հաշվարկային կանխիկ · ${escapeHtml(formatAmd(shift.expectedBalance))}</p>
    <table class="kv">
      <tr><td>Սկզբի մնացորդ</td><td>${escapeHtml(formatAmd(shift.openingBalance))}</td></tr>
      <tr><td>Կանխիկ մուտքեր</td><td>${escapeHtml(formatAmd(shift.cashInTotal))}</td></tr>
      <tr><td>Կանխիկ ելքեր</td><td>${escapeHtml(formatAmd(shift.cashOutTotal))}</td></tr>
      <tr><td>Քարտ · մուտք</td><td>${escapeHtml(formatAmd(shift.cardInTotal))}</td></tr>
      <tr><td>Քարտ · ելք</td><td>${escapeHtml(formatAmd(shift.cardOutTotal))}</td></tr>
      <tr><td>Գործարքներով հաշվարկային մնացորդ</td><td>${escapeHtml(formatAmd(shift.expectedBalance))}</td></tr>
      <tr><td>Փաստացի մնացորդ</td><td>${shift.actualBalance != null ? escapeHtml(formatAmd(shift.actualBalance)) : "—"}</td></tr>
      <tr><td>Տարբերություն</td><td>${escapeHtml(diff)}</td></tr>
      <tr><td>Ադմին</td><td>${escapeHtml(shift.adminName)}</td></tr>
    </table>
    ${statusLine ? `<p class="branch-sub" style="margin-top:8px;margin-bottom:0">${statusLine}</p>` : ""}
  </div>`;
}

/** Single shift — A4 report for one open/closed գրաֆիկ. */
export function printCashRegisterReport(
  detail: CashShiftDetail,
  opts?: { printedBy?: string },
): void {
  const { shift, entries } = detail;
  const reportDay = formatDay(shift.openedAt);

  const paymentRows = entries
    .filter((e) => e.direction === "in" && !e.unassigned)
    .map(
      (e) => `
    <tr>
      <td>${escapeHtml(e.date)}</td>
      <td>${escapeHtml(e.comment ?? "—")}</td>
      <td>${escapeHtml(e.performedByName ?? "—")}<br /><span style="font-size:8pt;color:#444">${escapeHtml(shift.branchName)}</span></td>
      <td class="num">${escapeHtml(formatAmd(e.amount))}</td>
      <td>${escapeHtml(DIRECTOR_PAYMENT_LABELS[e.paymentMethod])}</td>
    </tr>`,
    )
    .join("");

  const outRows = entries
    .filter((e) => e.direction === "out" && !e.unassigned)
    .map(
      (e) => `
    <tr>
      <td>${escapeHtml(e.date)}</td>
      <td>${escapeHtml(shift.branchName)}</td>
      <td>${escapeHtml(e.performedByName ?? "—")}</td>
      <td class="num">${escapeHtml(formatAmd(e.amount))}</td>
      <td>${escapeHtml(e.comment ?? "—")}</td>
    </tr>`,
    )
    .join("");

  const body = `
    ${reportHeaderHtml({
      dateStart: reportDay,
      dateEnd: reportDay,
      branchScope: shift.branchName,
      printedBy: opts?.printedBy,
    })}
    ${branchRegisterBlock(shift, reportDay)}
    <section class="section">
      <h3 class="section-title">Վճարումներ</h3>
      <table class="data">
        <thead>
          <tr>
            <th>Ամսաթիվ</th>
            <th>Նկարագրություն</th>
            <th>Մենեջեր / մասնաճյուղ</th>
            <th class="num">Գումար</th>
            <th>Եղանակ</th>
          </tr>
        </thead>
        <tbody>${paymentRows || '<tr><td colspan="5">—</td></tr>'}</tbody>
      </table>
    </section>
    ${
      outRows
        ? `
    <section class="section">
      <h3 class="section-title">Դրամարկղի ելքեր</h3>
      <table class="data">
        <thead>
          <tr>
            <th>Ամսաթիվ</th>
            <th>Մասնաճյուղ</th>
            <th>Գրանցող</th>
            <th class="num">Գումար</th>
            <th>Նպատակ</th>
          </tr>
        </thead>
        <tbody>${outRows}</tbody>
      </table>
    </section>`
        : ""
    }
  `;

  openPrintWindow(`Դրամարկղ · ${shift.branchName}`, body);
}

export type CashRegisterPeriodPrintInput = {
  startDate: string;
  endDate: string;
  branchScope: string;
  printedBy?: string;
  period: CashRegisterPeriodSummary;
  shifts: CashShiftSummary[];
};

/** Period dashboard — matches manager app A4 layout (no hint blocks). */
export function printCashRegisterPeriodReport(input: CashRegisterPeriodPrintInput): void {
  const { period, shifts, startDate, endDate } = input;
  const { totals, byManager, byBranch, entries } = period;

  const kpi = `
  <div class="kpi-grid">
    <div class="kpi"><p class="kpi-label">Ժամանակահատվածի հասույթ</p><p class="kpi-value">${escapeHtml(formatAmd(totals.periodIn))}</p></div>
    <div class="kpi"><p class="kpi-label">Կանխիկ հասույթ</p><p class="kpi-value">${escapeHtml(formatAmd(totals.periodCashIn))}</p></div>
    <div class="kpi"><p class="kpi-label">Անկանխիկ հասույթ</p><p class="kpi-value">${escapeHtml(formatAmd(totals.periodCardIn))}</p></div>
    <div class="kpi"><p class="kpi-label">Կանխիկ ելք</p><p class="kpi-value">${escapeHtml(formatAmd(totals.periodCashOut))}</p></div>
    <div class="kpi"><p class="kpi-label">Անկանխիկ ելք</p><p class="kpi-value">${escapeHtml(formatAmd(totals.periodCardOut))}</p></div>
    <div class="kpi"><p class="kpi-label">Ընդամենը ելք</p><p class="kpi-value">${escapeHtml(formatAmd(totals.periodOut))}</p></div>
  </div>`;

  const branchBlocks = shifts
    .filter((s) => s.status === "OPEN" || formatDay(s.openedAt) <= endDate)
    .slice(0, 12)
    .map((s) => branchRegisterBlock(s, formatDay(s.openedAt)))
    .join("");

  const shiftRows = shifts
    .map((s) => {
      const diff =
        s.difference != null
          ? s.difference === 0
            ? formatAmd(0)
            : s.difference > 0
              ? `+${formatAmd(s.difference)}`
              : `−${formatAmd(Math.abs(s.difference))}`
          : "—";
      return `
    <tr>
      <td>${escapeHtml(formatDay(s.openedAt))}<br /><span style="font-size:8pt">${escapeHtml(s.adminName)}</span></td>
      <td>${escapeHtml(s.branchName)}</td>
      <td>${s.status === "OPEN" ? "Բաց է" : "Ավարտված է"}</td>
      <td class="num">${escapeHtml(formatAmd(s.openingBalance))}</td>
      <td class="num">${escapeHtml(formatAmd(s.cashInTotal + s.cardInTotal))}</td>
      <td class="num">${s.actualBalance != null ? escapeHtml(formatAmd(s.actualBalance)) : "—"}</td>
      <td class="num">${escapeHtml(diff)}</td>
    </tr>`;
    })
    .join("");

  const managerRows = byManager
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.managerName)}</td>
      <td>${escapeHtml(r.branchName)}</td>
      <td class="num">${escapeHtml(formatAmd(r.cash))}</td>
      <td class="num">${escapeHtml(formatAmd(r.card))}</td>
      <td class="num">${escapeHtml(formatAmd(r.total))}</td>
      <td class="num">${r.paymentCount}</td>
    </tr>`,
    )
    .join("");

  const branchRows = byBranch
    .map(
      (r) => `
    <tr>
      <td>${escapeHtml(r.branchName)}</td>
      <td class="num">${escapeHtml(formatAmd(r.cash))}</td>
      <td class="num">${escapeHtml(formatAmd(r.card))}</td>
      <td class="num">${escapeHtml(formatAmd(r.total))}</td>
      <td class="num">${r.paymentCount}</td>
    </tr>`,
    )
    .join("");

  const paymentRows = entries
    .filter((e) => e.direction === "in")
    .map(
      (e) => `
    <tr>
      <td>${escapeHtml(e.date)}</td>
      <td>${escapeHtml(e.comment ?? "—")}</td>
      <td>${escapeHtml(e.performedByName ?? "—")}<br /><span style="font-size:8pt;color:#444">${escapeHtml(e.branchName)}</span></td>
      <td class="num">${escapeHtml(formatAmd(e.amount))}</td>
      <td>${escapeHtml(DIRECTOR_PAYMENT_LABELS[e.paymentMethod])}</td>
    </tr>`,
    )
    .join("");

  const body = `
    ${reportHeaderHtml({
      dateStart: startDate,
      dateEnd: endDate,
      branchScope: input.branchScope,
      printedBy: input.printedBy,
    })}
    ${branchBlocks ? `<section class="section">${branchBlocks}</section>` : ""}
    <section class="section">${kpi}</section>
    ${
      shiftRows
        ? `
    <section class="section">
      <h3 class="section-title">Հերթափոխեր</h3>
      <table class="data">
        <thead>
          <tr>
            <th>Ամսաթիվ / մենեջեր</th>
            <th>Մասնաճյուղ</th>
            <th>Վիճակ</th>
            <th class="num">Ընդունված</th>
            <th class="num">Հասույթ</th>
            <th class="num">Հանձնված</th>
            <th class="num">Տարբերություն</th>
          </tr>
        </thead>
        <tbody>${shiftRows || '<tr><td colspan="7">—</td></tr>'}</tbody>
      </table>
    </section>`
        : ""
    }
    <section class="section">
      <h3 class="section-title">Հասույթն ըստ մենեջերի և մասնաճյուղի</h3>
      <table class="data">
        <thead>
          <tr>
            <th>Մենեջեր</th>
            <th>Մասնաճյուղ</th>
            <th class="num">Կանխիկ</th>
            <th class="num">Քարտ</th>
            <th class="num">Հասույթ</th>
            <th class="num">Վճարումների քանակ</th>
          </tr>
        </thead>
        <tbody>${managerRows || '<tr><td colspan="6">—</td></tr>'}</tbody>
      </table>
    </section>
    <section class="section">
      <h3 class="section-title">Վճարումներ ըստ մասնաճյուղի</h3>
      <table class="data">
        <thead>
          <tr>
            <th>Մասնաճյուղ</th>
            <th class="num">Կանխիկ</th>
            <th class="num">Քարտ</th>
            <th class="num">Հասույթ</th>
            <th class="num">Վճարումների քանակ</th>
          </tr>
        </thead>
        <tbody>${branchRows || '<tr><td colspan="5">—</td></tr>'}</tbody>
      </table>
    </section>
    <section class="section">
      <h3 class="section-title">Ընտրված ժամանակահատվածի ընդհանուր մուտքեր</h3>
      <table class="data">
        <thead>
          <tr>
            <th class="num">Կանխիկ</th>
            <th class="num">Քարտ</th>
            <th class="num">Ընդամենը</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="num">${escapeHtml(formatAmd(totals.periodCashIn))}</td>
            <td class="num">${escapeHtml(formatAmd(totals.periodCardIn))}</td>
            <td class="num">${escapeHtml(formatAmd(totals.periodIn))}</td>
          </tr>
        </tbody>
      </table>
    </section>
    <section class="section">
      <h3 class="section-title">Վճարումներ</h3>
      <table class="data">
        <thead>
          <tr>
            <th>Ամսաթիվ</th>
            <th>Նկարագրություն</th>
            <th>Մենեջեր / մասնաճյուղ</th>
            <th class="num">Գումար</th>
            <th>Եղանակ</th>
          </tr>
        </thead>
        <tbody>${paymentRows || '<tr><td colspan="5">—</td></tr>'}</tbody>
      </table>
    </section>
  `;

  openPrintWindow("Մասնաճյուղերի դրամարկղի հաշվետվություն", body);
}
