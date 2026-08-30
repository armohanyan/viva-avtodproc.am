import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { AdminReportsBundle } from "./adminReports.types";
import { bookingTypeLabel } from "./adminReports.types";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";

function addSectionTitle(doc: jsPDF, y: number, title: string): number {
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, y);
  return y + 6;
}

function addKeyValues(doc: jsPDF, y: number, rows: [string, string][]): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  for (const [label, value] of rows) {
    doc.text(`${label}: ${value}`, 14, y);
    y += 5;
  }
  return y + 4;
}

function addTable(
  doc: jsPDF,
  y: number,
  head: string[],
  body: string[][],
): number {
  if (body.length === 0) return y;
  autoTable(doc, {
    startY: y,
    head: [head],
    body,
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [244, 134, 51] },
    margin: { left: 14, right: 14 },
  });
  return (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;
}

export function downloadAdminReportsPdf(data: AdminReportsBundle, branchLabel: string): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const { financial, leads, director } = data;
  const { meta, summary, optional, instructorLessons, newStudents, refunds } = financial;

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Viva Avtodproc — Հաշվետվություն", 14, 18);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`ժամանակահատված: ${meta.startDate} — ${meta.endDate}`, 14, 26);
  doc.text(`Մասնաճյուղ: ${branchLabel}`, 14, 31);
  doc.text(`Ստեղծվել է: ${new Date().toLocaleString("hy-AM")}`, 14, 36);

  let y = 44;

  y = addSectionTitle(doc, y, "Ֆինանսական ամփոփ");
  y = addKeyValues(doc, y, [
    ["Ընդհանուր եկամուտ", formatAmd(summary.totalIncomeAmd)],
    ["Զուտ եկամուտ", formatAmd(summary.netRevenueAmd)],
    ["Վճարված", formatAmd(summary.totalPaidAmountAmd)],
    ["Պարտք", formatAmd(summary.totalUnpaidDebtAmd)],
    ["Վերադարձներ", formatAmd(summary.totalRefundAmountAmd)],
    ...(optional
      ? [
          ["Ծախսեր", formatAmd(optional.expensesTotalAmd)] as [string, string],
          ["Զուտ շահույթ", formatAmd(optional.netProfitAmd)] as [string, string],
          ["Օնլայն", formatAmd(optional.paymentsOnlineAmd)] as [string, string],
          ["Ձեռքով", formatAmd(optional.paymentsManualAmd)] as [string, string],
        ]
      : []),
  ]);

  if (y > 240) {
    doc.addPage();
    y = 20;
  }

  y = addSectionTitle(doc, y, "Ուսանողներ և գրանցումներ");
  y = addKeyValues(doc, y, [
    ["Նոր ուսանողներ", String(summary.newStudentsCount)],
    ["Նոր գրանցումներ", String(summary.bookingsCreatedCount)],
    ["Ավարտված դասեր", String(summary.completedLessonsCount)],
    ["Չեղարկված", String(summary.cancelledLessonsCount)],
    ["Սպասող", String(summary.pendingUpcomingBookingsCount)],
  ]);

  y = addTable(
    doc,
    y,
    ["Մասնաճյուղ", "Ուսանող"],
    newStudents.slice(0, 15).map((s) => [s.branchName, s.name]),
  );

  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  y = addSectionTitle(doc, y, "Հրահանգիչներ");
  y = addTable(
    doc,
    y,
    ["Հրահանգիչ", "Ժամ", "Ավարտված", "Չեղարկ"],
    instructorLessons.slice(0, 12).map((r) => [
      r.instructorName,
      String(r.totalHours),
      String(r.completedCount),
      String(r.cancelledCount),
    ]),
  );

  if (optional?.topBookingTypes.length) {
    y = addTable(
      doc,
      y,
      ["Տեսակ", "Քանակ"],
      optional.topBookingTypes.map((t) => [bookingTypeLabel(t.type), String(t.count)]),
    );
  }

  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  y = addSectionTitle(doc, y, "Դիմումներ");
  y = addKeyValues(doc, y, [
    ["Կոնտակտային հարցումներ", String(leads.contactRequests)],
    ["Հետզանգեր", String(leads.bookedCalls)],
    ["Վերադարձներ (քանակ)", String(refunds.length)],
  ]);

  if (director) {
    if (y > 220) {
      doc.addPage();
      y = 20;
    }
    y = addSectionTitle(doc, y, "Տնօրենի ամփոփ");
    y = addKeyValues(doc, y, [
      ["Ընդհանուր հասույթ", formatAmd(director.totalRevenue)],
      ["Մաքուր շահույթ", formatAmd(director.netProfit)],
      ["Վառելիք", formatAmd(director.fuel)],
      ["Աշխատավարձ", formatAmd(director.salaryTotal)],
    ]);
  }

  doc.save(`viva-report-${meta.startDate}_${meta.endDate}.pdf`);
}
