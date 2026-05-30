import { useCallback, useMemo, useState } from "react";
import { Car } from "lucide-react";
import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import AdminInstructorAvailabilityTable from "src/modules/admin/booking/AdminInstructorAvailabilityTable";
import AdminInstructorDaySlotsModal from "src/modules/admin/booking/AdminInstructorDaySlotsModal";
import QuickPracticalBookingModal from "src/modules/admin/driving/QuickPracticalBookingModal";
import { useInstructors } from "src/modules/instructors/useInstructors";
import { useBranches } from "src/modules/branches";
import { useAdminStudentsMini, type AdminStudentMini } from "src/modules/admin/useAdminStudents";
import { useLang } from "src/lib/i18n";
import type { Instructor } from "src/data/instructors";

type CellTarget = {
  instructor: Instructor;
  branchId: string;
  dateIso: string;
};

type SlotSelection = {
  instructor: Instructor;
  branchId: string;
  entries: { dateIso: string; time: string }[];
};

export default function AdminDriving() {
  const { t } = useLang();
  const { instructors, loading } = useInstructors();
  const { branches } = useBranches();
  const { students, refresh: refreshStudents } = useAdminStudentsMini({ enrollmentStatus: "all" });
  const [slotModalTarget, setSlotModalTarget] = useState<CellTarget | null>(null);
  const [pendingSelection, setPendingSelection] = useState<SlotSelection | null>(null);
  /** Bumped after a booking is created so the grid reloads busy counts. */
  const [refreshKey, setRefreshKey] = useState(0);

  const activePracticalInstructors = useMemo(
    () => instructors.filter((i) => i.status === "active" && i.teachesPractical),
    [instructors],
  );

  const handleStudentCreated = useCallback(
    (_: AdminStudentMini) => {
      void refreshStudents();
    },
    [refreshStudents],
  );

  const handleBookingCreated = useCallback(() => {
    setPendingSelection(null);
    setRefreshKey((n) => n + 1);
  }, []);

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Car}
        title={t("adminDrivingTitle")}
        subtitle={t("adminDrivingSubtitle")}
      />

      <div className="rounded-xl border border-border bg-card p-4">
        {activePracticalInstructors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {loading ? t("loading") : t("adminDrivingEmptyInstructors")}
          </p>
        ) : (
          <AdminInstructorAvailabilityTable
            key={refreshKey}
            instructors={activePracticalInstructors}
            bookingBranchId=""
            studentName=""
            selectedEntries={[]}
            onEntriesChange={() => {}}
            onInstructorPicked={() => {}}
            slotSource="practical"
            onCellClick={({ instructor, branchId, dateIso }) => {
              setSlotModalTarget({ instructor, branchId, dateIso });
            }}
            t={t}
          />
        )}
      </div>

      {slotModalTarget ? (
        <AdminInstructorDaySlotsModal
          open
          onOpenChange={(open) => {
            if (!open) setSlotModalTarget(null);
          }}
          instructorId={slotModalTarget.instructor.id}
          instructorName={slotModalTarget.instructor.name}
          branchId={slotModalTarget.branchId}
          dateIso={slotModalTarget.dateIso}
          slotSource="practical"
          initialSelected={
            pendingSelection?.instructor.id === slotModalTarget.instructor.id
              ? pendingSelection.entries
              : []
          }
          t={t}
          onConfirm={(entries) => {
            if (entries.length === 0) {
              setSlotModalTarget(null);
              return;
            }
            setPendingSelection({
              instructor: slotModalTarget.instructor,
              branchId: slotModalTarget.branchId,
              entries,
            });
            setSlotModalTarget(null);
          }}
        />
      ) : null}

      {pendingSelection ? (
        <QuickPracticalBookingModal
          open
          onOpenChange={(open) => {
            if (!open) setPendingSelection(null);
          }}
          instructor={pendingSelection.instructor}
          branchId={pendingSelection.branchId}
          branches={branches}
          slotEntries={pendingSelection.entries}
          students={students}
          onStudentCreated={handleStudentCreated}
          onChangeSlots={() => {
            const first = pendingSelection.entries[0];
            if (!first) {
              setPendingSelection(null);
              return;
            }
            setSlotModalTarget({
              instructor: pendingSelection.instructor,
              branchId: pendingSelection.branchId,
              dateIso: first.dateIso,
            });
          }}
          onCreated={handleBookingCreated}
        />
      ) : null}
    </AdminLayout>
  );
}
