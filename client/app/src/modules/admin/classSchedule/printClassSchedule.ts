export type ClassSchedulePrintRow = {
	timeLabel: string;
	studentName: string;
	notesLabel: string;
	/** Lesson branch name; used when `showBranchColumn` is true. */
	branchLabel?: string;
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
	/** Shown after time when `showBranchColumn` is true. */
	colBranch?: string;
	colStudent: string;
	colSignature: string;
	colNotes: string;
	footerTotalHours: string;
	footerDeparted: string;
	footerInstructor: string;
};

export type ClassSchedulePrintOptions = {
	/** Insert Մասնաճյուղ after Ժամ when lessons span multiple branches/instructors. */
	showBranchColumn?: boolean;
};

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

/** Compact slot for narrow print columns: "08:00–09:00". */
export function formatClassSchedulePrintTime(start: string, end: string): string {
	const a = start.length >= 5 ? start.slice(0, 5) : start;
	const b = end.length >= 5 ? end.slice(0, 5) : end;
	return `${a}–${b}`;
}

function buildMainTableRows(rows: ClassSchedulePrintRow[], showBranchColumn: boolean): string {
	return rows
		.map((row, i) => {
			const branchCell = showBranchColumn
				? `\n      <td class="col-branch">${escapeHtml(row.branchLabel ?? "")}</td>`
				: "";
			return `
    <tr>
      <td class="col-num">${i + 1}</td>
      <td class="col-time">${escapeHtml(row.timeLabel)}</td>${branchCell}
      <td class="col-student">${escapeHtml(row.studentName)}</td>
      <td class="col-sign"></td>
      <td class="col-notes">${escapeHtml(row.notesLabel)}</td>
    </tr>`;
		})
		.join("");
}

export function buildClassSchedulePrintHtml(
	labels: ClassSchedulePrintLabels,
	rows: ClassSchedulePrintRow[],
	lang: string,
	options?: ClassSchedulePrintOptions,
): string {
	const showBranchColumn = Boolean(options?.showBranchColumn && labels.colBranch);
	const colCount = showBranchColumn ? 6 : 5;
	const tableBody =
		rows.length > 0
			? buildMainTableRows(rows, showBranchColumn)
			: `<tr><td colspan="${colCount}" class="col-empty">&nbsp;</td></tr>`;

	const branchHeader = showBranchColumn
		? `\n          <th class="col-branch">${escapeHtml(labels.colBranch!)}</th>`
		: "";

	const pageCss = showBranchColumn
		? `@page { size: A4 landscape; margin: 10mm 8mm; }`
		: `@page { size: A4 portrait; margin: 14mm 12mm; }`;

	const scheduleLayoutCss = showBranchColumn
		? `
    body { font-size: 10pt; }
    .doc-brand { margin: 0 0 14px; padding-bottom: 10px; }
    .doc-brand h1 { font-size: 13pt; }
    .section { margin-bottom: 14px; }
    td, th { padding: 5px 4px; }
    .schedule-table thead th {
      font-size: 9pt;
      padding: 6px 3px;
      line-height: 1.2;
    }
    .schedule-table tbody td {
      font-size: 9pt;
      line-height: 1.25;
      overflow: hidden;
    }
    .col-num { width: 4%; text-align: center; }
    .col-time {
      width: 12%;
      text-align: center;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
      font-size: 8.5pt;
      letter-spacing: -0.01em;
      padding-left: 2px;
      padding-right: 2px;
    }
    .col-branch {
      width: 18%;
      text-align: center;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-size: 8.5pt;
      line-height: 1.2;
    }
    .col-student {
      width: 26%;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .col-sign { width: 20%; }
    .col-notes {
      width: 20%;
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: break-word;
      font-size: 8.5pt;
    }`
		: `
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
    .col-notes { width: 23%; }`;

	return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.documentTitle)}</title>
  <style>
    ${pageCss}
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
      width: ${showBranchColumn ? "42%" : "54%"};
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
    }${scheduleLayoutCss}
    .col-empty { height: 28px; }
    .footer-block {
      width: ${showBranchColumn ? "42%" : "54%"};
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
          <th class="col-time">${escapeHtml(labels.colTime)}</th>${branchHeader}
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
