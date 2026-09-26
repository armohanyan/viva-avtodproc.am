import DirectorLayout from "src/modules/director/DirectorLayout";
import DirectorAddRecordButton from "src/modules/director/components/DirectorAddRecordButton";
import DirectorRecordFormDialog from "src/modules/director/components/DirectorRecordFormDialog";
import DirectorRecordActions from "src/modules/director/components/DirectorRecordActions";
import DirectorDataTable from "src/modules/director/components/DirectorDataTable";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  DirectorField,
  DirectorInput,
  DirectorSelect,
  DirectorTextarea,
} from "src/modules/director/components/DirectorUi";
import {
  createDirectorStaffEmployee,
  deleteDirectorStaffEmployee,
  fetchDirectorStaffEmployees,
  updateDirectorStaffEmployee,
} from "src/modules/director/director.api";
import { todayIso } from "src/modules/director/director.consts";
import type { DirectorStaffEmployee, DirectorStaffEmployeePosition } from "src/modules/director/director.types";
import {
  directorDate,
  directorOptionalComment,
  directorText,
} from "src/modules/director/directorFormValues";
import { useDirectorTable } from "src/modules/director/useDirectorTable";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useToast } from "src/lib/toast";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { Instructor } from "src/data/instructors";
import { useBranches } from "src/modules/branches";
import { formatDirectorInstructorLabel } from "src/modules/director/directorInstructorLabels";

const POSITION_LABEL: Record<DirectorStaffEmployeePosition, string> = {
  instructor: "Հրահանգիչ",
  theory_teacher: "Տեսության դասախոս",
  instructor_and_theory: "Հրահանգիչ և տեսության դասախոս",
  director: "Տնօրեն",
  admin: "Ադմին",
  cleaner: "Մաքրուհի",
  other: "Այլ",
};

export default function DirectorEmployeesPage() {
  const { showToast } = useToast();
  const { branches } = useBranches();
  const [rows, setRows] = useState<DirectorStaffEmployee[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    userId: "",
    position: "instructor" as DirectorStaffEmployeePosition,
    jobTitle: "",
    startDateIso: todayIso(),
    phone: "",
    notes: "",
    isActive: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDirectorStaffEmployees();
      setRows(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setRows([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void vivaApiJson<Instructor[]>("/instructors")
      .then((d) => setInstructors(Array.isArray(d) ? d : []))
      .catch(() => setInstructors([]));
    void vivaApiJson<{ id: string | number; name: string }[]>(
      "/accounts?roles=admin,super_admin,instructor",
    )
      .then((d) => {
        const list = Array.isArray(d) ? d : [];
        setAccounts(
          list
            .map((a) => ({ id: Number(a.id), name: a.name?.trim() || `User #${a.id}` }))
            .filter((a) => Number.isFinite(a.id) && a.id > 0),
        );
      })
      .catch(() => setAccounts([]));
  }, []);

  const accountOptions = useMemo(() => {
    const map = new Map<number, string>();
    for (const a of accounts) map.set(a.id, a.name);
    for (const i of instructors) {
      map.set(i.id, formatDirectorInstructorLabel(i, branches));
    }
    return [...map.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "hy"));
  }, [accounts, instructors, branches]);

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "",
      userId: "",
      position: "instructor",
      jobTitle: "",
      startDateIso: todayIso(),
      phone: "",
      notes: "",
      isActive: true,
    });
  };

  const openCreate = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEdit = (row: DirectorStaffEmployee) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      userId: row.userId != null ? String(row.userId) : "",
      position: row.position,
      jobTitle: row.jobTitle,
      startDateIso: row.startDateIso,
      phone: row.phone ?? "",
      notes: row.notes ?? "",
      isActive: row.isActive,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    resetForm();
    setFormOpen(false);
  };

  const submit = async () => {
    const name = directorText(form.name);
    if (!name) {
      showToast("Անունը պարտադիր է", "error");
      return;
    }
    const body = {
      name,
      userId: form.userId.trim() ? Number(form.userId) : null,
      position: form.position,
      jobTitle: form.jobTitle.trim() || POSITION_LABEL[form.position],
      startDateIso: directorDate(form.startDateIso),
      phone: form.phone.trim() || null,
      notes: directorOptionalComment(form.notes),
      isActive: form.isActive,
    };
    try {
      if (editingId != null) {
        await updateDirectorStaffEmployee(editingId, body);
        showToast("Պահված է", "success");
      } else {
        await createDirectorStaffEmployee(body);
        showToast("Ավելացված է", "success");
      }
      closeForm();
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const tableColumns = useMemo(
    () => [
      {
        id: "name",
        header: "Աշխատակից",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorStaffEmployee) => r.name,
        filterValue: (r: DirectorStaffEmployee) => r.name,
        searchValue: (r: DirectorStaffEmployee) => `${r.name} ${r.jobTitle} ${r.phone ?? ""}`,
        render: (r: DirectorStaffEmployee) => (
          <span>
            {r.name}
            {!r.isActive ? (
              <span className="block text-xs text-muted-foreground">Ապաակտիվ</span>
            ) : null}
          </span>
        ),
      },
      {
        id: "position",
        header: "Պաշտոն",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorStaffEmployee) => r.position,
        filterValue: (r: DirectorStaffEmployee) => POSITION_LABEL[r.position],
        searchValue: (r: DirectorStaffEmployee) =>
          `${POSITION_LABEL[r.position]} ${r.jobTitle}`,
        render: (r: DirectorStaffEmployee) => (
          <span>
            {POSITION_LABEL[r.position]}
            {r.jobTitle && r.jobTitle !== POSITION_LABEL[r.position] ? (
              <span className="block text-xs text-muted-foreground">{r.jobTitle}</span>
            ) : null}
          </span>
        ),
      },
      {
        id: "account",
        header: "Հաշիվ",
        sortable: true,
        filterable: true,
        sortValue: (r: DirectorStaffEmployee) => r.accountName ?? "",
        filterValue: (r: DirectorStaffEmployee) =>
          r.userId != null ? r.accountName ?? "Կապված" : "Առանց հաշվի",
        searchValue: (r: DirectorStaffEmployee) =>
          r.userId != null ? r.accountName ?? String(r.userId) : "առանց հաշվի",
        render: (r: DirectorStaffEmployee) =>
          r.userId != null ? (
            r.accountName ?? `#${r.userId}`
          ) : (
            <span className="text-muted-foreground">Առանց հաշվի</span>
          ),
      },
      {
        id: "start",
        header: "Սկիզբ",
        sortable: true,
        sortValue: (r: DirectorStaffEmployee) => r.startDateIso,
        searchValue: (r: DirectorStaffEmployee) => r.startDateIso,
        render: (r: DirectorStaffEmployee) => r.startDateIso,
      },
      {
        id: "actions",
        header: "",
        align: "end" as const,
        render: (r: DirectorStaffEmployee) => (
          <DirectorRecordActions
            onEdit={() => openEdit(r)}
            onDelete={() =>
              void deleteDirectorStaffEmployee(r.id)
                .then(load)
                .catch((e) => showToast(getApiErrorMessage(e), "error"))
            }
          />
        ),
      },
    ],
    [load, showToast],
  );

  const table = useDirectorTable({ rows, columns: tableColumns });

  return (
    <DirectorLayout>
      <PanelPageHeader icon={Users} title="Աշխատակիցներ" />
      <p className="text-xs text-muted-foreground mb-4 -mt-2">
        Այստեղ կարող եք ավելացնել աշխատակից՝ համակարգի հաշվով կամ առանց հաշվի։ Աշխատավարձի դրույքները
        կարգավորվում են «Աշխատավարձ → Դրույքաչափեր» բաժնում։
      </p>
      {loading ? (
        <div className="rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
          Բեռնվում է…
        </div>
      ) : (
        <DirectorDataTable
          table={table}
          columns={tableColumns}
          rowKey={(r) => r.id}
          searchPlaceholder="Որոնել աշխատակցով…"
          toolbarActions={<DirectorAddRecordButton onClick={openCreate} />}
        />
      )}
      <DirectorRecordFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        title={editingId != null ? "Խմբագրել աշխատակցի" : "Նոր աշխատակից"}
        editing={editingId != null}
        createLabel="Պահել"
        onSubmit={() => void submit()}
        onCancel={closeForm}
      >
        <DirectorField label="Անուն Ազգանուն">
          <DirectorInput
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </DirectorField>
        <DirectorField label="Պաշտոն">
          <DirectorSelect
            value={form.position}
            onChange={(e) => {
              const position = e.target.value as DirectorStaffEmployeePosition;
              setForm((f) => ({
                ...f,
                position,
                jobTitle: f.jobTitle || POSITION_LABEL[position],
              }));
            }}
          >
            {(Object.keys(POSITION_LABEL) as DirectorStaffEmployeePosition[]).map((p) => (
              <option key={p} value={p}>
                {POSITION_LABEL[p]}
              </option>
            ))}
          </DirectorSelect>
        </DirectorField>
        <DirectorField label="Պաշտոնի անվանում (ցուցադրման)">
          <DirectorInput
            value={form.jobTitle}
            onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
            placeholder={POSITION_LABEL[form.position]}
          />
        </DirectorField>
        <DirectorField label="Աշխատանքի սկիզբ">
          <DirectorInput
            type="date"
            value={form.startDateIso}
            onChange={(e) => setForm((f) => ({ ...f, startDateIso: e.target.value }))}
          />
        </DirectorField>
        <DirectorField label="Համակարգի հաշիվ (ոչ պարտադիր)">
          <DirectorSelect
            value={form.userId}
            onChange={(e) => {
              const userId = e.target.value;
              const acc = accountOptions.find((a) => String(a.id) === userId);
              setForm((f) => ({
                ...f,
                userId,
                name: f.name.trim() || acc?.name || f.name,
              }));
            }}
          >
            <option value="">Առանց հաշվի (միայն անունով)</option>
            {accountOptions.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name}
              </option>
            ))}
          </DirectorSelect>
        </DirectorField>
        <DirectorField label="Հեռախոս">
          <DirectorInput
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          />
        </DirectorField>
        <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            className="h-4 w-4 rounded border-input accent-primary"
          />
          Ակտիվ է
        </label>
        <DirectorField label="Նշումներ">
          <DirectorTextarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </DirectorField>
        <p className="text-xs text-muted-foreground">
          Դրույքաչափը և աշխատավարձի տեսակը ավելացրեք «Աշխատավարձ → Դրույքաչափեր» էջում։
        </p>
      </DirectorRecordFormDialog>
    </DirectorLayout>
  );
}
