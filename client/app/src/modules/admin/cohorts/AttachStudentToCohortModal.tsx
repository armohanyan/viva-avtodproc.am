import { useEffect, useId, useMemo, useState } from "react";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import AdminStudentPicker from "src/components/admin/AdminStudentPicker";
import AdminBookingPaymentSection from "src/components/admin/AdminBookingPaymentSection";
import { useLang, type TranslationKey } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { formatAmd } from "src/pages/admin/finance/adminFinanceShared";
import {
  adminPaymentApiPayload,
  defaultAdminBookingPayment,
  paidAmountFromState,
  validateAdminBookingPayment,
  type AdminBookingPaymentState,
} from "src/modules/admin/booking/adminBookingPayment";
import { theoryGroupSlotPlanFromCohort } from "src/modules/admin/booking/theoryGroupSlotPlan";
import type { TheoryCohortOption } from "src/modules/admin/booking/types";
import type { AdminStudentMini } from "src/modules/admin/useAdminStudents";
import { useAdminStudentsMini } from "src/modules/admin/useAdminStudents";
import { useInstructors } from "src/modules/instructors/useInstructors";

export type AttachStudentCohort = {
  id: string;
  name: string;
  startDateIso: string;
  branchId: string;
  instructorName: string;
  status: string;
  sessionStartTime: string | null;
  sessionEndTime: string | null;
  priceAmd: number | null;
};

type Props = {
  cohort: AttachStudentCohort | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAttached: () => void;
};

function financeStatusFromBookingStatus(status: string): "completed" | "pending" | "failed" | "refunded" {
  const s = String(status ?? "").trim().toLowerCase();
  if (s === "confirmed") return "completed";
  if (s === "refunded") return "refunded";
  if (s === "cancelled" || s === "canceled") return "failed";
  return "pending";
}

function toTheoryCohortOption(c: AttachStudentCohort): TheoryCohortOption {
  return {
    id: c.id,
    name: c.name,
    startDateIso: c.startDateIso,
    branchId: c.branchId,
    instructorName: c.instructorName,
    status: c.status,
    sessionStartTime: c.sessionStartTime,
    sessionEndTime: c.sessionEndTime,
    priceAmd: c.priceAmd,
  };
}

function totalAmdForCohort(
  cohort: AttachStudentCohort,
  instructors: readonly { name: string; hourlyPrice: number }[],
): number {
  if (cohort.priceAmd != null && Number.isFinite(cohort.priceAmd) && cohort.priceAmd >= 0) {
    return Math.round(cohort.priceAmd);
  }
  const plan = theoryGroupSlotPlanFromCohort(toTheoryCohortOption(cohort));
  const hours = plan?.times.length ?? 0;
  const ins = instructors.find((i) => i.name === cohort.instructorName);
  const hourly = ins && Number.isFinite(ins.hourlyPrice) ? ins.hourlyPrice : 0;
  return Math.max(0, Math.round(hourly * hours));
}

export default function AttachStudentToCohortModal({ cohort, open, onOpenChange, onAttached }: Props) {
  const formId = useId();
  const { t } = useLang();
  const { showToast } = useToast();
  const { instructors } = useInstructors();
  const { students, refresh: refreshStudents } = useAdminStudentsMini({
    enrollmentStatus: "active",
    enabled: open,
  });

  const [studentId, setStudentId] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<AdminStudentMini | null>(null);
  const [status, setStatus] = useState("pending");
  const [modalTab, setModalTab] = useState<"booking" | "payment">("booking");
  const [payment, setPayment] = useState<AdminBookingPaymentState>(() => defaultAdminBookingPayment());
  const [paymentErrorKey, setPaymentErrorKey] = useState<TranslationKey | null>(null);
  const [studentInvalid, setStudentInvalid] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [extraStudents, setExtraStudents] = useState<AdminStudentMini[]>([]);

  const studentsForPicker = useMemo(() => {
    const byId = new Map<string, AdminStudentMini>();
    for (const s of students) byId.set(String(s.id), s);
    for (const s of extraStudents) byId.set(String(s.id), s);
    return [...byId.values()];
  }, [students, extraStudents]);

  const theoryOption = useMemo(() => (cohort ? toTheoryCohortOption(cohort) : null), [cohort]);
  const slotPlan = useMemo(
    () => (theoryOption ? theoryGroupSlotPlanFromCohort(theoryOption) : null),
    [theoryOption],
  );
  const totalPriceAmd = useMemo(
    () => (cohort ? totalAmdForCohort(cohort, instructors) : 0),
    [cohort, instructors],
  );

  useEffect(() => {
    if (!open) return;
    setStudentId("");
    setSelectedStudent(null);
    setStatus("pending");
    setModalTab("booking");
    setPayment(defaultAdminBookingPayment());
    setPaymentErrorKey(null);
    setStudentInvalid(false);
    setSubmitting(false);
    setExtraStudents([]);
  }, [open, cohort?.id]);

  const close = () => onOpenChange(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cohort) return;

    if (!studentId.trim()) {
      setStudentInvalid(true);
      setModalTab("booking");
      showToast(t("adminBookingValSelectStudent"), "error");
      return;
    }
    setStudentInvalid(false);

    if (!slotPlan || slotPlan.times.length === 0) {
      setModalTab("booking");
      showToast(t("adminBookingValTheoryGroupSchedule"), "error");
      return;
    }

    const payErr = validateAdminBookingPayment(payment, totalPriceAmd);
    if (payErr) {
      setModalTab("payment");
      setPaymentErrorKey(payErr);
      showToast(t(payErr), "error");
      return;
    }
    setPaymentErrorKey(null);

    const paid = paidAmountFromState(payment);
    const paymentBody = adminPaymentApiPayload(payment, totalPriceAmd);

    setSubmitting(true);
    try {
      const created = await vivaApiJson<{ id: number }>("/bookings", {
        method: "POST",
        body: {
          studentId: Number(studentId),
          branchId: Number(cohort.branchId),
          status,
          type: "theory",
          dateIso: slotPlan.dateIso,
          slots: slotPlan.times,
          theoryCohortId: Number(cohort.id),
          ...paymentBody,
        },
      });
      const bookingIdNum = Number(created.id);
      if (paid > 0 && Number.isFinite(bookingIdNum) && bookingIdNum > 0) {
        const stu =
          selectedStudent && String(selectedStudent.id) === String(studentId)
            ? selectedStudent
            : studentsForPicker.find((s) => String(s.id) === String(studentId));
        const customer = (stu?.name ?? "").trim() || `Student #${studentId}`;
        await vivaApiJson("/finance/transactions", {
          method: "POST",
          body: {
            createdAt: new Date(payment.datetimeLocal).toISOString(),
            customer,
            email: (stu?.email ?? "").trim(),
            branchId: Number(cohort.branchId),
            method: payment.method,
            grossAmd: paid,
            status: financeStatusFromBookingStatus(status),
            source: "manual",
            bookingId: bookingIdNum,
          },
        });
      }

      showToast(t("bookingCreatedToast"), "success");
      onAttached();
      close();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={(o) => !o && close()}
      title={t("cohortAttachStudentTitle")}
      contentClassName="max-w-2xl w-[min(96vw,42rem)] h-[min(92vh,880px)] max-h-[min(92vh,880px)]"
      footer={
        cohort ? (
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={close} disabled={submitting}>
              {t("cancel")}
            </Button>
            <Button
              type="submit"
              form={formId}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={submitting}
            >
              {t("cohortAttachStudentSubmit")}
            </Button>
          </div>
        ) : null
      }
    >
      {cohort ? (
        <form id={formId} onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm">
            <p className="font-medium text-foreground">{cohort.name}</p>
            <p className="mt-0.5 text-muted-foreground">
              {cohort.instructorName}
              {totalPriceAmd > 0 ? ` · ${formatAmd(totalPriceAmd)}` : ""}
            </p>
          </div>

          <Tabs value={modalTab} onValueChange={(v) => setModalTab(v as "booking" | "payment")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="booking">{t("adminBookingModalTabBooking")}</TabsTrigger>
              <TabsTrigger value="payment">{t("adminBookingModalTabPayment")}</TabsTrigger>
            </TabsList>

            <TabsContent value="booking" forceMount className="mt-4 space-y-3 data-[state=inactive]:hidden">
              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">
                  {t("bookingColStudent")}
                </label>
                <AdminStudentPicker
                  students={studentsForPicker}
                  value={studentId}
                  onChange={(s) => {
                    setStudentId(s ? String(s.id) : "");
                    setSelectedStudent(s);
                    if (s) setStudentInvalid(false);
                  }}
                  branchIdForNewStudent={cohort.branchId}
                  invalid={studentInvalid}
                  onStudentCreated={(s) => {
                    setExtraStudents((prev) => [...prev.filter((x) => String(x.id) !== String(s.id)), s]);
                    void refreshStudents();
                    setStudentId(String(s.id));
                    setSelectedStudent(s);
                    setStudentInvalid(false);
                  }}
                />
                {studentInvalid ? (
                  <p className="mt-1 text-xs text-red-600">{t("adminBookingValSelectStudent")}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-muted-foreground">{t("status")}</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="confirmed">{t("confirmed")}</option>
                  <option value="pending">{t("pending")}</option>
                  <option value="cancelled">{t("cancelled")}</option>
                  <option value="refunded">{t("refunded")}</option>
                </select>
              </div>

              {!slotPlan ? (
                <p className="text-xs text-red-600">{t("adminBookingValTheoryGroupSchedule")}</p>
              ) : null}
            </TabsContent>

            <TabsContent value="payment" forceMount className="mt-4 data-[state=inactive]:hidden">
              <AdminBookingPaymentSection
                totalPriceAmd={totalPriceAmd}
                value={payment}
                onChange={setPayment}
                errorKey={paymentErrorKey}
                giftEnabled={false}
              />
            </TabsContent>
          </Tabs>
        </form>
      ) : null}
    </AppModal>
  );
}
