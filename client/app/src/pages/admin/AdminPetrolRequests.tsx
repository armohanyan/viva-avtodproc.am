import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import PanelPageHeader from "src/components/PanelPageHeader";
import PetrolRequestStatusBadge, { type PetrolRequestStatus } from "src/components/PetrolRequestStatusBadge";
import TableSkeletonRows from "src/components/TableSkeletonRows";
import { AppModal } from "src/components/AppModal";
import { Button } from "src/components/ui/button";
import { Card } from "src/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { formatAmd } from "src/utils/currency.utils";
import { Check, Fuel, ImageIcon, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

type FuelExpenseRequest = {
  id: number;
  instructorUserId: number;
  instructorName: string;
  carId: number;
  carLabel: string;
  date: string;
  time: string | null;
  petrolType: string;
  petrolTypeLabel: string;
  price: number;
  photoUrl: string;
  description: string | null;
  status: PetrolRequestStatus;
  decisionNote: string | null;
  decidedByName: string | null;
  decidedAtIso: string | null;
  createdAtIso: string;
};

type ViewTab = "pending" | "all";

export default function AdminPetrolRequests() {
  const { t } = useLang();
  const { showToast } = useToast();
  const rejectFormId = useId();

  const [items, setItems] = useState<FuelExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ViewTab>("pending");
  const [search, setSearch] = useState("");

  const [approveRow, setApproveRow] = useState<FuelExpenseRequest | null>(null);
  const [rejectRow, setRejectRow] = useState<FuelExpenseRequest | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [deciding, setDeciding] = useState(false);

  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vivaApiJson<{ items: FuelExpenseRequest[] }>("/admin/petrol-expense-requests");
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setItems([]);
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = useMemo(() => items.filter((i) => i.status === "pending").length, [items]);

  const visible = useMemo(() => {
    const byTab = tab === "pending" ? items.filter((i) => i.status === "pending") : items;
    const q = search.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((row) =>
      [row.instructorName, row.carLabel, row.petrolTypeLabel, row.date, String(row.price), row.description ?? "", row.decidedByName ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [items, tab, search]);

  const approve = async () => {
    if (!approveRow || deciding) return;
    setDeciding(true);
    try {
      await vivaApiJson(`/admin/petrol-expense-requests/${encodeURIComponent(approveRow.id)}/approve`, {
        method: "POST",
        body: {},
      });
      showToast(t("adminPetrolRequestsApprovedToast"), "success");
      setApproveRow(null);
      await load();
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    } finally {
      setDeciding(false);
    }
  };

  const reject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectRow || deciding) return;
    setDeciding(true);
    try {
      await vivaApiJson(`/admin/petrol-expense-requests/${encodeURIComponent(rejectRow.id)}/reject`, {
        method: "POST",
        body: { note: rejectNote.trim() || null },
      });
      showToast(t("adminPetrolRequestsRejectedToast"), "success");
      setRejectRow(null);
      setRejectNote("");
      await load();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setDeciding(false);
    }
  };

  return (
    <AdminLayout>
      <PanelPageHeader icon={Fuel} title={t("adminPetrolRequestsTitle")} subtitle={t("adminPetrolRequestsSubtitle")} />

      <Tabs value={tab} onValueChange={(v) => setTab(v as ViewTab)} className="mb-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pending">
            {t("adminPetrolRequestsPendingTab")}
            {pendingCount > 0 ? ` (${pendingCount})` : ""}
          </TabsTrigger>
          <TabsTrigger value="all">{t("adminPetrolRequestsHistoryTab")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card className="border-border overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[64rem]">
            <thead className="bg-muted/40">
              <tr>
                {[
                  t("adminPetrolColDate"),
                  t("adminPetrolColInstructor"),
                  t("adminPetrolColCar"),
                  t("adminPetrolColType"),
                  t("adminPetrolColPrice"),
                  t("instructorFuelColPhoto"),
                  t("adminPetrolColNote"),
                  t("theoryPersonalRequestColStatus"),
                  t("adminPetrolColActions"),
                ].map((h, i) => (
                  <th
                    key={i}
                    className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <TableSkeletonRows cols={9} cellClassName="px-4 py-3" />
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    {t("adminPetrolRequestsEmpty")}
                  </td>
                </tr>
              ) : (
                visible.map((row) => (
                  <tr key={row.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {row.date}
                      {row.time ? <span className="text-muted-foreground"> {row.time}</span> : null}
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{row.instructorName}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.carLabel}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{row.petrolTypeLabel}</td>
                    <td className="px-4 py-3 font-medium tabular-nums whitespace-nowrap">{formatAmd(row.price)}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setViewPhoto(row.photoUrl)}
                        className="inline-flex items-center gap-1.5 text-primary underline underline-offset-2 hover:text-primary/80 cursor-pointer"
                      >
                        <ImageIcon className="w-4 h-4" />
                        {t("instructorFuelColPhoto")}
                      </button>
                    </td>
                    <td className="px-4 py-3 max-w-[14rem]">
                      <span className="block truncate" title={row.description ?? undefined}>
                        {row.description ?? "—"}
                      </span>
                      {row.decisionNote ? (
                        <span className="block truncate text-xs text-muted-foreground" title={row.decisionNote}>
                          {row.decisionNote}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <PetrolRequestStatusBadge status={row.status} />
                        {row.decidedByName ? (
                          <span className="text-xs text-muted-foreground">
                            {row.decidedByName}
                            {row.decidedAtIso ? ` · ${row.decidedAtIso.slice(0, 10)}` : ""}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.status === "pending" ? (
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-1.5" onClick={() => setApproveRow(row)}>
                            <Check className="w-4 h-4" />
                            {t("adminPetrolRequestsApprove")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                            onClick={() => {
                              setRejectRow(row);
                              setRejectNote("");
                            }}
                          >
                            <X className="w-4 h-4" />
                            {t("adminPetrolRequestsReject")}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
        <div className="px-4 py-3 border-t border-border text-xs text-muted-foreground">
          {t("panelShowingLabel")} {visible.length} / {items.length}
        </div>
      </Card>

      <ConfirmDialog
        open={!!approveRow}
        onClose={() => !deciding && setApproveRow(null)}
        onConfirm={approve}
        title={t("adminPetrolRequestsApproveTitle")}
        description={
          approveRow
            ? `${approveRow.instructorName} · ${approveRow.carLabel} · ${formatAmd(approveRow.price)} — ${t("adminPetrolRequestsApproveDesc")}`
            : t("adminPetrolRequestsApproveDesc")
        }
        confirmLabel={t("adminPetrolRequestsApprove")}
      />

      <AppModal
        open={!!rejectRow}
        onOpenChange={(o) => {
          if (!o && !deciding) {
            setRejectRow(null);
            setRejectNote("");
          }
        }}
        title={t("adminPetrolRequestsRejectTitle")}
        description={rejectRow ? `${rejectRow.instructorName} · ${rejectRow.carLabel} · ${formatAmd(rejectRow.price)}` : undefined}
        contentClassName="max-w-lg"
        footer={
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={deciding}
              onClick={() => {
                setRejectRow(null);
                setRejectNote("");
              }}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" form={rejectFormId} disabled={deciding} variant="destructive" className="flex-1">
              {t("adminPetrolRequestsReject")}
            </Button>
          </div>
        }
      >
        <form id={rejectFormId} onSubmit={reject} className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("adminPetrolRequestsRejectDesc")}</p>
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor={`${rejectFormId}-note`}>
              {t("adminPetrolRequestsDecisionNoteLabel")}
            </label>
            <textarea
              id={`${rejectFormId}-note`}
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm min-h-[4.5rem]"
            />
          </div>
        </form>
      </AppModal>

      <AppModal
        open={!!viewPhoto}
        onOpenChange={(o) => !o && setViewPhoto(null)}
        title={t("instructorFuelColPhoto")}
        contentClassName="max-w-2xl"
      >
        {viewPhoto ? (
          <img src={sameOriginStaffUploadUrl(viewPhoto) ?? viewPhoto} alt="" className="w-full rounded-lg object-contain" />
        ) : null}
      </AppModal>
    </AdminLayout>
  );
}
