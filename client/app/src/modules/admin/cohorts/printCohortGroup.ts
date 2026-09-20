import { formatClassSchedulePrintTime, printClassScheduleDocument } from "src/modules/admin/classSchedule/printClassSchedule";

export type CohortPrintLesson = {
	lessonIndex: number;
	dateLabel: string;
	startTime: string;
	endTime: string;
	statusLabel: string;
};

export type CohortPrintStudent = {
	name: string;
	phone: string;
	phone2: string;
};

export type CohortPrintTeacher = {
	name: string;
	phone: string;
};

export type CohortPrintLabels = {
	documentTitle: string;
	schoolName: string;
	sectionGroup: string;
	sectionTeacher: string;
	sectionLessons: string;
	sectionStudents: string;
	labelGroupName: string;
	labelBranch: string;
	labelPeriod: string;
	labelStatus: string;
	labelEnrollment: string;
	labelSessionTime: string;
	labelPrice: string;
	labelTeacherName: string;
	labelTeacherPhone: string;
	colNo: string;
	colLesson: string;
	colDate: string;
	colTime: string;
	colStatus: string;
	colStudent: string;
	colPhone: string;
	colPhone2: string;
	emptyLessons: string;
	emptyStudents: string;
	generatedAt: string;
};

export type CohortPrintData = {
	groupName: string;
	branchName: string;
	periodLabel: string;
	statusLabel: string;
	enrollmentLabel: string;
	sessionTimeLabel: string;
	priceLabel: string;
	teachers: CohortPrintTeacher[];
	lessons: CohortPrintLesson[];
	students: CohortPrintStudent[];
	generatedAtLabel: string;
};

function escapeHtml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function metaRow(label: string, value: string): string {
	return `
        <tr>
          <td class="meta-label">${escapeHtml(label)}</td>
          <td class="meta-value">${escapeHtml(value)}</td>
        </tr>`;
}

function buildLessonsTable(labels: CohortPrintLabels, lessons: CohortPrintLesson[]): string {
	if (lessons.length === 0) {
		return `<tr><td colspan="5" class="empty-cell">${escapeHtml(labels.emptyLessons)}</td></tr>`;
	}
	return lessons
		.map((lesson) => {
			const timeLabel = formatClassSchedulePrintTime(lesson.startTime, lesson.endTime);
			return `
    <tr>
      <td class="col-num">${lesson.lessonIndex}</td>
      <td class="col-lesson">${escapeHtml(labels.colLesson)} ${lesson.lessonIndex}</td>
      <td class="col-date">${escapeHtml(lesson.dateLabel)}</td>
      <td class="col-time">${escapeHtml(timeLabel)}</td>
      <td class="col-status">${escapeHtml(lesson.statusLabel)}</td>
    </tr>`;
		})
		.join("");
}

function buildStudentsTable(labels: CohortPrintLabels, students: CohortPrintStudent[]): string {
	if (students.length === 0) {
		return `<tr><td colspan="4" class="empty-cell">${escapeHtml(labels.emptyStudents)}</td></tr>`;
	}
	return students
		.map((student, i) => {
			return `
    <tr>
      <td class="col-num">${i + 1}</td>
      <td class="col-student">${escapeHtml(student.name)}</td>
      <td class="col-phone">${escapeHtml(student.phone)}</td>
      <td class="col-phone">${escapeHtml(student.phone2)}</td>
    </tr>`;
		})
		.join("");
}

function buildTeachersBlock(labels: CohortPrintLabels, teachers: CohortPrintTeacher[]): string {
	if (teachers.length === 0) {
		return `
    <table class="meta-block">
      <tbody>
		${metaRow(labels.labelTeacherName, "-")}
        ${metaRow(labels.labelTeacherPhone, "-")}
      </tbody>
    </table>`;
	}

	return teachers
		.map((teacher) => {
			return `
    <table class="meta-block teacher-block">
      <tbody>
        ${metaRow(labels.labelTeacherName, teacher.name || "-")}
        ${metaRow(labels.labelTeacherPhone, teacher.phone || "-")}
      </tbody>
    </table>`;
		})
		.join("");
}

export function buildCohortGroupPrintHtml(
	labels: CohortPrintLabels,
	data: CohortPrintData,
	lang: string,
): string {
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
      line-height: 1.35;
      color: #000;
      background: #fff;
      margin: 0;
      padding: 0;
    }
    .sheet { width: 100%; }
    .doc-brand {
      text-align: center;
      margin: 0 0 10px;
      padding-bottom: 10px;
      border-bottom: 2px solid #000;
    }
    .doc-brand h1 {
      margin: 0;
      font-size: 15pt;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .doc-subtitle {
      margin: 6px 0 0;
      font-size: 12pt;
      font-weight: 600;
    }
    .section { margin-bottom: 16px; }
    .section-title {
      margin: 0 0 8px;
      font-size: 12pt;
      font-weight: 700;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
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
    .meta-block { width: 70%; }
    .meta-block .meta-label {
      width: 36%;
      font-weight: 700;
      white-space: nowrap;
    }
    .meta-block .meta-value { min-height: 24px; }
    .teacher-block { margin-bottom: 8px; }
    .teacher-block:last-child { margin-bottom: 0; }
    .data-table thead th {
      text-align: center;
      font-weight: 700;
      font-size: 10.5pt;
      padding: 7px 6px;
    }
    .data-table tbody td {
      font-size: 10.5pt;
      line-height: 1.3;
    }
    .col-num { width: 8%; text-align: center; }
    .col-lesson { width: 18%; text-align: center; }
    .col-date { width: 22%; text-align: center; white-space: nowrap; }
    .col-time {
      width: 22%;
      text-align: center;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .col-status { width: 30%; text-align: center; }
    .col-student { width: 40%; }
    .col-phone {
      width: 26%;
      text-align: center;
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }
    .empty-cell {
      text-align: center;
      color: #444;
      font-style: italic;
      padding: 14px 8px;
    }
    .doc-footer {
      margin-top: 18px;
      font-size: 9pt;
      color: #333;
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
      <p class="doc-subtitle">${escapeHtml(labels.documentTitle)}</p>
    </header>

    <section class="section">
      <h2 class="section-title">${escapeHtml(labels.sectionGroup)}</h2>
      <table class="meta-block" aria-label="group">
        <tbody>
          ${metaRow(labels.labelGroupName, data.groupName)}
          ${metaRow(labels.labelBranch, data.branchName)}
          ${metaRow(labels.labelPeriod, data.periodLabel)}
          ${metaRow(labels.labelSessionTime, data.sessionTimeLabel)}
          ${metaRow(labels.labelStatus, data.statusLabel)}
          ${metaRow(labels.labelEnrollment, data.enrollmentLabel)}
          ${metaRow(labels.labelPrice, data.priceLabel)}
        </tbody>
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">${escapeHtml(labels.sectionTeacher)}</h2>
      ${buildTeachersBlock(labels, data.teachers)}
    </section>

    <section class="section">
      <h2 class="section-title">${escapeHtml(labels.sectionLessons)}</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-num">${escapeHtml(labels.colNo)}</th>
            <th class="col-lesson">${escapeHtml(labels.colLesson)}</th>
            <th class="col-date">${escapeHtml(labels.colDate)}</th>
            <th class="col-time">${escapeHtml(labels.colTime)}</th>
            <th class="col-status">${escapeHtml(labels.colStatus)}</th>
          </tr>
        </thead>
        <tbody>
          ${buildLessonsTable(labels, data.lessons)}
        </tbody>
      </table>
    </section>

    <section class="section">
      <h2 class="section-title">${escapeHtml(labels.sectionStudents)}</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-num">${escapeHtml(labels.colNo)}</th>
            <th class="col-student">${escapeHtml(labels.colStudent)}</th>
            <th class="col-phone">${escapeHtml(labels.colPhone)}</th>
            <th class="col-phone">${escapeHtml(labels.colPhone2)}</th>
          </tr>
        </thead>
        <tbody>
          ${buildStudentsTable(labels, data.students)}
        </tbody>
      </table>
    </section>

    <p class="doc-footer">${escapeHtml(labels.generatedAt)}: ${escapeHtml(data.generatedAtLabel)}</p>
  </div>
</body>
</html>`;
}

export function printCohortGroupDocument(html: string): boolean {
	return printClassScheduleDocument(html);
}
