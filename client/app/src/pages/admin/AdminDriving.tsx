import { useCallback, useEffect, useMemo, useState } from "react";
import { Car } from "lucide-react";
import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import AdminInstructorAvailabilityTable from "src/modules/admin/booking/AdminInstructorAvailabilityTable";
import AdminInstructorDaySlotsModal from "src/modules/admin/booking/AdminInstructorDaySlotsModal";
import AdminDrivingDayModal from "src/modules/admin/driving/AdminDrivingDayModal";
import AdminDrivingFilters, {
  filterInstructorsBySearch,
} from "src/modules/admin/driving/AdminDrivingFilters";
import PracticalBookingDetailModal from "src/modules/admin/driving/PracticalBookingDetailModal";
import QuickPracticalBookingModal from "src/modules/admin/driving/QuickPracticalBookingModal";
import { useAdminBranchFilter } from "src/modules/admin/AdminBranchFilterProvider";
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
  /** Admin custom off-plan time (e.g. lunch hour); skips fixed schedule membership. */
  customSlot?: boolean;
  customSlotEndTime?: string;
};

export default function AdminDriving() {
  return (
    <AdminLayout>
      <AdminDrivingContent />
    </AdminLayout>
  );
}

function AdminDrivingContent() {
  const { t } = useLang();
  const { instructors, loading } = useInstructors();
  const { branches } = useBranches();
  const { branchId: adminBranchId } = useAdminBranchFilter();
  const { students, refresh: refreshStudents } = useAdminStudentsMini({ enrollmentStatus: "all" });
  const [search, setSearch] = useState("");
  const [branchFilterId, setBranchFilterId] = useState(() => adminBranchId ?? "");
  const [slotModalTarget, setSlotModalTarget] = useState<CellTarget | null>(null);
  const [pendingSelection, setPendingSelection] = useState<SlotSelection | null>(null);
  const [dayModalDateIso, setDayModalDateIso] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<{
    bookingId: number;
    dateIso: string;
    time: string;
  } | null>(null);
  /** Bumped after a booking is created/updated/deleted so grids reload. */
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setBranchFilterId(adminBranchId ?? "");
  }, [adminBranchId]);

  const activePracticalInstructors = useMemo(
    () => instructors.filter((i) => i.status === "active" && i.teachesPractical),
    [instructors],
  );

  const filteredInstructors = useMemo(
    () => filterInstructorsBySearch(activePracticalInstructors, search),
    [activePracticalInstructors, search],
  );

  const bumpRefresh = useCallback(() => {
    setRefreshKey((n) => n + 1);
  }, []);

  const handleStudentCreated = useCallback(
    (_: AdminStudentMini) => {
      void refreshStudents();
    },
    [refreshStudents],
  );

  const handleBookingCreated = useCallback(() => {
    setPendingSelection(null);
    bumpRefresh();
  }, [bumpRefresh]);

  const handleBookingChanged = useCallback(() => {
    bumpRefresh();
  }, [bumpRefresh]);

  const handleBookingDeleted = useCallback(() => {
    setDetailTarget(null);
    bumpRefresh();
  }, [bumpRefresh]);

  const emptyMessage = loading
    ? t("loading")
    : activePracticalInstructors.length === 0
      ? t("adminDrivingEmptyInstructors")
      : t("adminDrivingEmptyFiltered");

  return (
    <>
      <PanelPageHeader
        icon={Car}
        title={t("adminDrivingTitle")}
      />

      <AdminDrivingFilters
        search={search}
        onSearchChange={setSearch}
        branchId={branchFilterId}
        onBranchIdChange={setBranchFilterId}
        className="mb-4"
      />

      {filteredInstructors.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : (
        <AdminInstructorAvailabilityTable
          key={refreshKey}
          instructors={filteredInstructors}
          bookingBranchId={branchFilterId}
          ignoreGlobalBranchFilter
          studentName=""
          selectedEntries={[]}
          onEntriesChange={() => {}}
          onInstructorPicked={() => {}}
          slotSource="practical"
          onCellClick={({ instructor, branchId, dateIso }) => {
            setSlotModalTarget({ instructor, branchId, dateIso });
          }}
          onDateClick={(dateIso) => setDayModalDateIso(dateIso)}
          t={t}
        />
      )}

      {dayModalDateIso ? (
        <AdminDrivingDayModal
          open
          onOpenChange={(open) => {
            if (!open) setDayModalDateIso(null);
          }}
          dateIso={dayModalDateIso}
          instructors={activePracticalInstructors}
          initialSearch={search}
          initialBranchId={branchFilterId}
          reloadKey={refreshKey}
          onEmptyCellClick={({ instructor, branchId, dateIso, time, customSlot, customSlotEndTime }) => {
            setPendingSelection({
              instructor,
              branchId,
              entries: [{ dateIso, time }],
              customSlot: customSlot === true,
              customSlotEndTime,
            });
          }}
          onAddCustomSlotClick={({ instructor, branchId, dateIso }) => {
            setPendingSelection({
              instructor,
              branchId,
              entries: [{ dateIso, time: "14:00" }],
              customSlot: true,
            });
          }}
          onBookingCellClick={(target) => {
            setDetailTarget(target);
          }}
        />
      ) : null}

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
          customSlot={pendingSelection.customSlot === true}
          customSlotEndTime={pendingSelection.customSlotEndTime}
          onChangeSlots={() => {
            if (pendingSelection.customSlot) return;
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

      {detailTarget != null ? (
        <PracticalBookingDetailModal
          open
          onOpenChange={(open) => {
            if (!open) setDetailTarget(null);
          }}
          bookingId={detailTarget.bookingId}
          focusSlot={{ dateIso: detailTarget.dateIso, time: detailTarget.time }}
          instructors={activePracticalInstructors}
          branches={branches}
          onChanged={handleBookingChanged}
          onDeleted={handleBookingDeleted}
        />
      ) : null}
    </>
  );
}
