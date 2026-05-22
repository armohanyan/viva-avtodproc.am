export type FinancialReportPrintSummary = {
	label: string;
	value: string;
};

export type FinancialReportPrintTable = {
	title: string;
	headers: string[];
	rows: string[][];
};

export type FinancialReportPrintLabels = {
	documentTitle: string;
	schoolName: string;
	labelPeriod: string;
	periodValue: string;
	labelBranch: string;
	branchValue: string;
	labelGenerated: string;
	generatedValue: string;
	sectionSummary: string;
};

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function buildTable(table: FinancialReportPrintTable): string {
	const head = table.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
	const body =
		table.rows.length > 0
			? table.rows
					.map(
						(cells) =>
							`<tr>${cells.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`,
					)
					.join("")
			: `<tr><td colspan="${table.headers.length}" class="empty">&nbsp;</td></tr>`;
	return `
    <section class="print-section">
      <h2>${escapeHtml(table.title)}</h2>
      <table class="data-table">
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </section>`;
}

export function buildFinancialReportPrintHtml(
	labels: FinancialReportPrintLabels,
	summary: FinancialReportPrintSummary[],
	tables: FinancialReportPrintTable[],
	lang: string,
): string {
	const summaryCards = summary
		.map(
			(s) =>
				`<div class="kpi"><div class="kpi-label">${escapeHtml(s.label)}</div><div class="kpi-value">${escapeHtml(s.value)}</div></div>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.documentTitle)}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: Arial, "Noto Sans Armenian", "Segoe UI", sans-serif;
      font-size: 10pt;
      line-height: 1.35;
      color: #000;
      margin: 0;
      padding: 0;
    }
    .sheet { width: 100%; }
    .doc-brand {
      text-align: center;
      margin: 0 0 16px;
      padding-bottom: 12px;
      border-bottom: 2px solid #000;
    }
    .doc-brand h1 { font-size: 16pt; margin: 0 0 4px; }
    .doc-brand .school { font-size: 11pt; margin: 0; }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 24px;
      margin-bottom: 18px;
      font-size: 10pt;
    }
    .meta-grid dt { font-weight: bold; margin: 0; }
    .meta-grid dd { margin: 0 0 6px; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 20px;
    }
    .kpi {
      border: 1px solid #333;
      padding: 8px;
      break-inside: avoid;
    }
    .kpi-label { font-size: 8pt; color: #333; margin-bottom: 4px; }
    .kpi-value { font-size: 11pt; font-weight: bold; }
    h2 { font-size: 11pt; margin: 16px 0 8px; border-bottom: 1px solid #666; padding-bottom: 4px; }
    .print-section { break-inside: avoid-page; margin-bottom: 12px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    .data-table th, .data-table td {
      border: 1px solid #333;
      padding: 4px 5px;
      text-align: left;
      vertical-align: top;
    }
    .data-table th { background: #eee; font-weight: bold; }
    .data-table .empty { text-align: center; color: #666; }
    @media print {
      .print-section { page-break-inside: avoid; }
      .data-table { page-break-inside: auto; }
      .data-table tr { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="doc-brand">
      <h1>${escapeHtml(labels.documentTitle)}</h1>
      <p class="school">${escapeHtml(labels.schoolName)}</p>
    </header>
    <dl class="meta-grid">
      <dt>${escapeHtml(labels.labelPeriod)}</dt>
      <dd>${escapeHtml(labels.periodValue)}</dd>
      <dt>${escapeHtml(labels.labelBranch)}</dt>
      <dd>${escapeHtml(labels.branchValue)}</dd>
      <dt>${escapeHtml(labels.labelGenerated)}</dt>
      <dd>${escapeHtml(labels.generatedValue)}</dd>
    </dl>
    <h2>${escapeHtml(labels.sectionSummary)}</h2>
    <div class="kpi-grid">${summaryCards}</div>
    ${tables.map(buildTable).join("")}
  </div>
</body>
</html>`;
}

/** Print via a hidden iframe (avoids popup blockers and blank `window.open` + `onload` races). */
export function printFinancialReportDocument(html: string): boolean {
	try {
		const iframe = document.createElement("iframe");
		iframe.setAttribute("title", "financial-report-print");
		iframe.style.cssText = "position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;";
		document.body.appendChild(iframe);

		const win = iframe.contentWindow;
		const doc = win?.document;
		if (!win || !doc) {
			iframe.remove();
			return false;
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

		return true;
	} catch {
		return false;
	}
}
