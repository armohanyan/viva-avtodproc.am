export type ClassSchedulePrintRow = {
	date: string;
	dateLabel: string;
	timeLabel: string;
	studentName: string;
	studentPhone: string;
	instructorName: string;
	lessonTypeLabel: string;
	branchName: string;
	statusLabel: string;
	paymentLabel: string;
	bookingTypeLabel: string;
	lessonHeldLabel: string;
	notesLabel: string;
};

export type ClassSchedulePrintLabels = {
	documentTitle: string;
	heading: string;
	period: string;
	generatedLabel: string;
	totalLabel: string;
	colNo: string;
	colDate: string;
	colTime: string;
	colStudent: string;
	colPhone: string;
	colInstructor: string;
	colLessonType: string;
	colBranch: string;
	colStatus: string;
	colPayment: string;
	colBookingType: string;
	colLessonHeld: string;
	colNotes: string;
};

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function buildTableRows(rows: ClassSchedulePrintRow[]): string {
	return rows
		.map(
			(row, i) => `
    <tr>
      <td class="num">${i + 1}</td>
      <td class="date">${escapeHtml(row.dateLabel)}</td>
      <td class="time">${escapeHtml(row.timeLabel)}</td>
      <td>${escapeHtml(row.studentName)}</td>
      <td class="phone">${escapeHtml(row.studentPhone)}</td>
      <td>${escapeHtml(row.instructorName)}</td>
      <td>${escapeHtml(row.lessonTypeLabel)}</td>
      <td>${escapeHtml(row.branchName)}</td>
      <td>${escapeHtml(row.statusLabel)}</td>
      <td>${escapeHtml(row.paymentLabel)}</td>
      <td>${escapeHtml(row.bookingTypeLabel)}</td>
      <td class="lesson-held">${escapeHtml(row.lessonHeldLabel)}</td>
      <td class="notes">${escapeHtml(row.notesLabel)}</td>
    </tr>`,
		)
		.join("");
}

export function buildClassSchedulePrintHtml(
	labels: ClassSchedulePrintLabels,
	rows: ClassSchedulePrintRow[],
	total: number,
	generatedAt: string,
	lang: string,
): string {
	const tableBody = rows.length > 0 ? buildTableRows(rows) : `<tr><td colspan="13" class="empty">${escapeHtml(labels.totalLabel)}: 0</td></tr>`;

	return `<!DOCTYPE html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.documentTitle)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm 10mm; }
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", "Noto Sans Armenian", system-ui, sans-serif;
      font-size: 10pt;
      line-height: 1.35;
      color: #111;
      margin: 0;
      padding: 0;
    }
    .sheet { max-width: 100%; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 2px solid #1a1a1a;
    }
    .header h1 {
      margin: 0 0 4px;
      font-size: 16pt;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .header .period {
      margin: 0;
      font-size: 11pt;
      color: #333;
    }
    .meta {
      text-align: right;
      font-size: 9pt;
      color: #444;
      white-space: nowrap;
    }
    .meta p { margin: 0 0 4px; }
    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }
    thead th {
      background: #f0f0f0;
      border: 1px solid #999;
      padding: 6px 5px;
      font-size: 8.5pt;
      font-weight: 700;
      text-align: left;
      vertical-align: bottom;
      word-wrap: break-word;
    }
    tbody td {
      border: 1px solid #bbb;
      padding: 5px 5px;
      vertical-align: top;
      font-size: 9pt;
      word-wrap: break-word;
    }
    tbody tr:nth-child(even) td { background: #fafafa; }
    .num { width: 3%; text-align: center; }
    .date { width: 8%; }
    .time { width: 7%; white-space: nowrap; }
    .phone { width: 9%; font-size: 8.5pt; }
    .lesson-held { width: 9%; text-align: center; font-weight: 600; }
    .notes { width: 14%; min-height: 1.4em; }
    td.empty { text-align: center; padding: 24px; color: #666; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <header class="header">
      <div>
        <h1>${escapeHtml(labels.heading)}</h1>
        <p class="period">${escapeHtml(labels.period)}</p>
      </div>
      <div class="meta">
        <p>${escapeHtml(labels.generatedLabel)} ${escapeHtml(generatedAt)}</p>
        <p>${escapeHtml(labels.totalLabel)}: ${total}</p>
      </div>
    </header>
    <table>
      <thead>
        <tr>
          <th class="num">${escapeHtml(labels.colNo)}</th>
          <th>${escapeHtml(labels.colDate)}</th>
          <th>${escapeHtml(labels.colTime)}</th>
          <th>${escapeHtml(labels.colStudent)}</th>
          <th>${escapeHtml(labels.colPhone)}</th>
          <th>${escapeHtml(labels.colInstructor)}</th>
          <th>${escapeHtml(labels.colLessonType)}</th>
          <th>${escapeHtml(labels.colBranch)}</th>
          <th>${escapeHtml(labels.colStatus)}</th>
          <th>${escapeHtml(labels.colPayment)}</th>
          <th>${escapeHtml(labels.colBookingType)}</th>
          <th>${escapeHtml(labels.colLessonHeld)}</th>
          <th>${escapeHtml(labels.colNotes)}</th>
        </tr>
      </thead>
      <tbody>
        ${tableBody}
      </tbody>
    </table>
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
