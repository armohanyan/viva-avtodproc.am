import { useEffect, useId, useMemo, useState } from "react";

import { Pencil } from "lucide-react";

import { AppModal } from "src/components/AppModal";

import { Button } from "src/components/ui/button";

import AdminStudentPicker from "src/components/admin/AdminStudentPicker";

import AdminBookingPaymentSection from "src/components/admin/AdminBookingPaymentSection";

import { cn } from "src/lib/utils";

import { useLang } from "src/lib/i18n";

import { useToast } from "src/lib/toast";

import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

import { parseAmdInput } from "src/pages/admin/finance/adminFinanceShared";

import {

  PRACTICAL_LESSON_TYPES,

  getLessonTypeLabel,

  type PracticalLessonType,

} from "src/modules/instructors/instructor-booking";

import type { AdminStudentMini } from "src/modules/admin/useAdminStudents";

import type { Instructor } from "src/data/instructors";

import type { Branch } from "src/modules/branches";

import {

  formatGridDateLabel,

  sortSlotEntriesChrono,

  sortTimesUnique,

} from "src/modules/admin/booking/adminAvailabilityGrid";

import {

  adminPaymentApiPayload,

  defaultAdminBookingPayment,

  paidAmountFromState,

  validateAdminBookingPayment,

  type AdminBookingPaymentState,

} from "src/modules/admin/booking/adminBookingPayment";



export type QuickPracticalBookingModalProps = {

  open: boolean;

  onOpenChange: (open: boolean) => void;

  instructor: Instructor;

  branchId: string;

  branches: readonly Branch[];

  slotEntries: readonly { dateIso: string; time: string }[];

  students: readonly AdminStudentMini[];

  onStudentCreated: (student: AdminStudentMini) => void;

  onChangeSlots: () => void;

  onCreated: () => void;

};



type Status = "confirmed" | "pending" | "cancelled" | "refunded";



function financeStatusFromBookingStatus(status: Status): "completed" | "pending" | "failed" | "refunded" {

  if (status === "confirmed") return "completed";

  if (status === "refunded") return "refunded";

  if (status === "cancelled") return "failed";

  return "pending";

}



function parseTotalPriceAmd(str: string, fallback: number): number {

  const parsed = parseAmdInput(str);

  if (!Number.isFinite(parsed) || parsed < 0) return Math.max(0, Math.round(fallback));

  return Math.max(0, Math.round(parsed));

}



export default function QuickPracticalBookingModal({

  open,

  onOpenChange,

  instructor,

  branchId: initialBranchId,

  branches,

  slotEntries,

  students,

  onStudentCreated,

  onChangeSlots,

  onCreated,

}: QuickPracticalBookingModalProps) {

  const formId = useId();

  const { t } = useLang();

  const { showToast } = useToast();

  const [studentId, setStudentId] = useState("");

  /** Kept in sync with the picker so finance customer does not depend on directory id type / refresh races. */
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentMini | null>(null);

  const [branchId, setBranchId] = useState(initialBranchId);

  const [lessonType, setLessonType] = useState<PracticalLessonType | "">("");

  const [status, setStatus] = useState<Status>("pending");

  const [totalPriceStr, setTotalPriceStr] = useState("");

  const [bookingPayment, setBookingPayment] = useState<AdminBookingPaymentState>(() =>

    defaultAdminBookingPayment(),

  );

  const [paymentErrorKey, setPaymentErrorKey] = useState<import("src/lib/i18n").TranslationKey | null>(null);

  const [submitting, setSubmitting] = useState(false);



  const sortedEntries = useMemo(() => sortSlotEntriesChrono(slotEntries), [slotEntries]);

  const suggestedTotalAmd = useMemo(

    () => Math.max(0, Math.round(Number(instructor.hourlyPrice) || 0) * sortedEntries.length),

    [instructor.hourlyPrice, sortedEntries.length],

  );

  const totalPriceAmd = useMemo(

    () => parseTotalPriceAmd(totalPriceStr, suggestedTotalAmd),

    [totalPriceStr, suggestedTotalAmd],

  );



  useEffect(() => {

    if (!open) return;

    setStudentId("");

    setSelectedStudent(null);

    setBranchId(initialBranchId);

    setLessonType("");

    setStatus("pending");

    setTotalPriceStr(String(suggestedTotalAmd));

    setBookingPayment(defaultAdminBookingPayment());

    setPaymentErrorKey(null);

  }, [open, initialBranchId]);



  useEffect(() => {

    if (!open) return;

    setTotalPriceStr(String(suggestedTotalAmd));

    setBookingPayment((prev) => {

      if (prev.status !== "paid") return prev;

      const total = Math.max(0, Math.round(suggestedTotalAmd));

      if (total <= 0) return prev;

      return { ...prev, paidStr: String(total) };

    });

  }, [open, suggestedTotalAmd]);



  const firstEntry = sortedEntries[0];

  const dateLabel = useMemo(() => {

    const dates = Array.from(new Set(sortedEntries.map((e) => e.dateIso)));

    if (dates.length === 0) return "";

    if (dates.length === 1) return formatGridDateLabel(dates[0]);

    return `${formatGridDateLabel(dates[0])} – ${formatGridDateLabel(dates[dates.length - 1])}`;

  }, [sortedEntries]);



  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault();

    if (submitting) return;

    if (!studentId) {

      showToast(t("adminBookingValSelectStudent"), "error");

      return;

    }

    if (!lessonType) {

      showToast(t("fillRequired"), "error");

      return;

    }

    if (!firstEntry) {

      showToast(t("adminBookingValSelectSlots"), "error");

      return;

    }

    const payErr = validateAdminBookingPayment(bookingPayment, totalPriceAmd);

    if (payErr) {

      setPaymentErrorKey(payErr);

      showToast(t(payErr), "error");

      return;

    }

    setPaymentErrorKey(null);



    const paymentBody = adminPaymentApiPayload(bookingPayment, totalPriceAmd);

    const paid =

      paymentBody.adminPaymentStatus === "paid"

        ? totalPriceAmd

        : paymentBody.paidAmountAmd ?? paidAmountFromState(bookingPayment);



    setSubmitting(true);

    try {

      const sameDayTimes = sortedEntries.filter((e) => e.dateIso === firstEntry.dateIso).map((e) => e.time);

      const times = sortTimesUnique(sameDayTimes.length > 0 ? sameDayTimes : [firstEntry.time]);

      const body = {

        studentId: Number(studentId),

        branchId: Number(branchId),

        status,

        type: "practical" as const,

        dateIso: firstEntry.dateIso,

        slots: times,

        instructorName: instructor.name,

        ...(Number.isFinite(Number(instructor.id)) ? { instructorUserId: Number(instructor.id) } : {}),

        ...(sortedEntries.length > 0

          ? { slotEntries: sortedEntries.map((e) => ({ dateIso: e.dateIso, time: e.time })) }

          : {}),

        totalPriceAmd,

        ...paymentBody,

      };

      const created = await vivaApiJson<{ id: number }>("/bookings", { method: "POST", body });

      const bookingIdNum = Number(created.id);



      if (paid > 0 && Number.isFinite(bookingIdNum) && bookingIdNum > 0) {

        const createdAtIso = new Date(bookingPayment.datetimeLocal).toISOString();

        const stu =
          selectedStudent && String(selectedStudent.id) === String(studentId)
            ? selectedStudent
            : students.find((s) => String(s.id) === String(studentId));

        const customer =
          (stu?.name ?? "").trim() || `Student #${studentId}`;

        await vivaApiJson("/finance/transactions", {

          method: "POST",

          body: {

            createdAt: createdAtIso,

            customer,

            email: (stu?.email ?? "").trim(),

            branchId: Number(branchId),

            method: bookingPayment.method,

            grossAmd: paid,

            status: financeStatusFromBookingStatus(status),

            source: "manual",

            bookingId: bookingIdNum,

          },

        });

      }



      showToast(t("bookingCreatedToast"), "success");

      onCreated();

      onOpenChange(false);

    } catch (err) {

      showToast(getApiErrorMessage(err), "error");

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <AppModal

      open={open}

      onOpenChange={(o) => {

        if (submitting) return;

        onOpenChange(o);

      }}

      title={t("adminDrivingQuickBookingTitle")}

      contentClassName="w-full max-w-[calc(100%-2rem)] sm:max-w-xl"

      footer={

        <div className="flex gap-3 w-full">

          <Button

            type="button"

            variant="outline"

            className="flex-1"

            onClick={() => onOpenChange(false)}

            disabled={submitting}

          >

            {t("cancel")}

          </Button>

          <Button

            type="submit"

            form={formId}

            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"

            disabled={submitting}

          >

            {submitting ? t("adminDrivingQuickBookingSubmitting") : t("adminDrivingQuickBookingSubmit")}

          </Button>

        </div>

      }

    >

      <form id={formId} onSubmit={handleSubmit} className="space-y-4">

        <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-1.5">

          <div className="flex items-center justify-between gap-2">

            <p className="text-xs font-medium text-muted-foreground">

              {t("adminDrivingQuickBookingInstructorLabel")}

            </p>

            <button

              type="button"

              onClick={() => {

                onOpenChange(false);

                onChangeSlots();

              }}

              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"

            >

              <Pencil className="h-3 w-3" />

              {t("adminDrivingQuickBookingChangeSlots")}

            </button>

          </div>

          <p className="text-sm font-semibold text-foreground">{instructor.name}</p>

          <div>

            <p className="text-xs font-medium text-muted-foreground mt-1">

              {t("adminDrivingQuickBookingSlotsLabel")}

              {dateLabel ? <span className="ml-1 tabular-nums text-foreground">· {dateLabel}</span> : null}

            </p>

            <ul className="mt-1 max-h-24 overflow-y-auto space-y-0.5 text-sm text-foreground">

              {sortedEntries.map((entry) => (

                <li key={`${entry.dateIso}|${entry.time}`} className="tabular-nums">

                  {formatGridDateLabel(entry.dateIso)} · {entry.time}

                </li>

              ))}

            </ul>

          </div>

        </div>



        <div>

          <label className="block text-sm font-medium text-muted-foreground mb-1">{t("bookingColStudent")}</label>

          <AdminStudentPicker

            students={students}

            value={studentId}

            onChange={(s) => {
              setSelectedStudent(s);
              setStudentId(s ? String(s.id) : "");
            }}

            branchIdForNewStudent={branchId}

            onStudentCreated={(s) => {
              setSelectedStudent(s);
              setStudentId(String(s.id));
              onStudentCreated(s);
            }}

          />

        </div>



        <div>

          <label className="block text-sm font-medium text-muted-foreground mb-1">

            {t("bookingStepLessonType")}

          </label>

          <select

            value={lessonType}

            onChange={(e) => setLessonType(e.target.value as PracticalLessonType | "")}

            className={cn(

              "w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring",

            )}

          >

            <option value="">{t("bookingSelectLessonTypePlaceholder")}</option>

            {PRACTICAL_LESSON_TYPES.map((value) => (

              <option key={value} value={value}>

                {getLessonTypeLabel(value)}

              </option>

            ))}

          </select>

        </div>



        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

          <div>

            <label className="block text-sm font-medium text-muted-foreground mb-1">

              {t("adminDrivingQuickBookingBranchLabel")}

            </label>

            <select

              value={branchId}

              onChange={(e) => setBranchId(e.target.value)}

              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"

            >

              {branches.map((br) => (

                <option key={br.id} value={br.id}>

                  {br.name}

                </option>

              ))}

            </select>

          </div>

          <div>

            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>

            <select

              value={status}

              onChange={(e) => setStatus(e.target.value as Status)}

              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"

            >

              <option value="confirmed">{t("confirmed")}</option>

              <option value="pending">{t("pending")}</option>

              <option value="cancelled">{t("cancelled")}</option>

              <option value="refunded">{t("refunded")}</option>

            </select>

          </div>

        </div>



        <AdminBookingPaymentSection

          totalPriceAmd={totalPriceAmd}

          totalPriceStr={totalPriceStr}

          onTotalPriceStrChange={setTotalPriceStr}

          totalPriceEditable

          value={bookingPayment}

          onChange={setBookingPayment}

          errorKey={paymentErrorKey}

        />

      </form>

    </AppModal>

  );

}

