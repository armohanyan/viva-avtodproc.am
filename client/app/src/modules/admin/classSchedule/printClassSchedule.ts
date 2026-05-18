export type ClassSchedulePrintRow = {
	timeLabel: string;
	studentName: string;
	notesLabel: string;
};

export type ClassSchedulePrintLabels = {
	documentTitle: string;
	schoolName: string;
	labelBranch: string;
	labelDate: string;
	labelInstructor: string;
	branchValue: string;
	dateValue: string;
	instructorValue: string;
	colNo: string;
	colTime: string;
	colStudent: string;
	colSignature: string;
	colNotes: string;
	footerTotalHours: string;
	footerDeparted: string;
	footerInstructor: string;
};

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function buildMainTableRows(rows: ClassSchedulePrintRow[]): string {
	return rows
		.map(
			(row, i) => `
    <tr>
      <td class="col-num">${i + 1}</td>
      <td class="col-time">${escapeHtml(row.timeLabel)}</td>
      <td class="col-student">${escapeHtml(row.studentName)}</td>
      <td class="col-sign"></td>
      <td class="col-notes">${escapeHtml(row.notesLabel)}</td>
    </tr>`,
		)
		.join("");
}

export function buildClassSchedulePrintHtml(
	labels: ClassSchedulePrintLabels,
	rows: ClassSchedulePrintRow[],
	lang: string,
): string {
	const tableBody =
		rows.length > 0
			? buildMainTableRows(rows)
			: `<tr><td colspan="5" class="col-empty">&nbsp;</td></tr>`;

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
      font-size: 11pt;
      line-height: 1.3;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .sheet { width: 100%; }
    .doc-brand {
      text-align: center;
      margin: 0 0 22px;
      padding-bottom: 14px;
      border-bottom: 2px solid #000;
    }
    .doc-brand h1 {
      margin: 0;
      font-size: 15pt;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .section {
      margin-bottom: 20px;
    }
    .section:last-child {
      margin-bottom: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    td, th {
      border: 1.5px solid #000;
      padding: 6px 8px;
      vertical-align: middle;
      color: #000;
      background: #fff;
    }
    .meta-block {
      width: 54%;
    }
    .meta-block .meta-label {
      width: 38%;
      font-weight: 700;
      white-space: nowrap;
    }
    .meta-block .meta-value {
      min-height: 28px;
    }
    .schedule-table thead th {
      text-align: center;
      font-weight: 700;
      font-size: 10.5pt;
      padding: 8px 6px;
    }
    .schedule-table tbody td {
      min-height: 28px;
      font-size: 10.5pt;
    }
    .col-num { width: 7%; text-align: center; }
    .col-time { width: 16%; text-align: center; white-space: nowrap; }
    .col-student { width: 32%; }
    .col-sign { width: 22%; }
    .col-notes { width: 23%; }
    .col-empty { height: 28px; }
    .footer-block {
      width: 54%;
    }
    .footer-block .footer-label {
      width: 38%;
      font-weight: 700;
      white-space: nowrap;
    }
    .footer-block .footer-value {
      min-height: 32px;
    }
    @media print {
      body { -webkit-print-color-adjust: economy; print-color-adjust: economy; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="doc-brand">
      <h1>${escapeHtml(labels.schoolName)}</h1>
    </header>

    <div class="section">
    <table class="meta-block" aria-label="header">
      <tbody>
        <tr>
          <td class="meta-label">${escapeHtml(labels.labelBranch)}</td>
          <td class="meta-value">${escapeHtml(labels.branchValue)}</td>
        </tr>
        <tr>
          <td class="meta-label">${escapeHtml(labels.labelDate)}</td>
          <td class="meta-value">${escapeHtml(labels.dateValue)}</td>
        </tr>
        <tr>
          <td class="meta-label">${escapeHtml(labels.labelInstructor)}</td>
          <td class="meta-value">${escapeHtml(labels.instructorValue)}</td>
        </tr>
      </tbody>
    </table>
    </div>

    <div class="section">
    <table class="schedule-table">
      <thead>
        <tr>
          <th class="col-num">${escapeHtml(labels.colNo)}</th>
          <th class="col-time">${escapeHtml(labels.colTime)}</th>
          <th class="col-student">${escapeHtml(labels.colStudent)}</th>
          <th class="col-sign">${escapeHtml(labels.colSignature)}</th>
          <th class="col-notes">${escapeHtml(labels.colNotes)}</th>
        </tr>
      </thead>
      <tbody>
        ${tableBody}
      </tbody>
    </table>
    </div>

    <div class="section">
    <table class="footer-block" aria-label="footer">
      <tbody>
        <tr>
          <td class="footer-label">${escapeHtml(labels.footerTotalHours)}</td>
          <td class="footer-value"></td>
        </tr>
        <tr>
          <td class="footer-label">${escapeHtml(labels.footerDeparted)}</td>
          <td class="footer-value"></td>
        </tr>
        <tr>
          <td class="footer-label">${escapeHtml(labels.footerInstructor)}</td>
          <td class="footer-value"></td>
        </tr>
      </tbody>
    </table>
    </div>
  </div>
</body>
</html>`;
}

/** Print via a hidden iframe (avoids popup blockers and `noopener` blocking `document.write`). */
export function printClassScheduleDocument(html: string): boolean {
	try {
		const iframe = document.createElement("iframe");
		iframe.setAttribute("title", "class-schedule-print");
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
