import { useCallback, useEffect, useState } from "react";
import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Card } from "src/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { useLang } from "src/lib/i18n";
import { localeForLang } from "src/lib/adminFormat";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";

type BookedCallStatus = "pending" | "contacted" | "cancelled";

type BookedCallRow = {
  id: string;
  name: string | null;
  phone: string;
  preferredTimeSlot: string;
  notes: string | null;
  status: BookedCallStatus;
  createdAt: string;
  updatedAt: string;
};

function formatDateTime(iso: string, lang: ReturnType<typeof useLang>["lang"]): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(localeForLang(lang), { dateStyle: "short", timeStyle: "short" });
}

export default function AdminBookedCalls(): JSX.Element {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [rows, setRows] = useState<BookedCallRow[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await vivaApiJson<BookedCallRow[]>("/booked-calls");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const onStatusChange = useCallback(
    async (id: string, status: BookedCallStatus) => {
      setUpdatingId(id);
      try {
        const updated = await vivaApiJson<BookedCallRow>(`/booked-calls/${id}`, {
          method: "PATCH",
          body: { status },
        });
        setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      } catch (e) {
        showToast(getApiErrorMessage(e), "error");
      } finally {
        setUpdatingId(null);
      }
    },
    [showToast],
  );

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <PanelPageHeader title={t("adminBookedCalls")} />
        <Card className="overflow-hidden p-0">
          {rows.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">{t("adminBookedCallsEmpty")}</p>
          ) : (
            <AdminTableScroll>
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("bookedCallColCreated")}</th>
                    <th className="px-3 py-2 font-medium">{t("bookedCallColPhone")}</th>
                    <th className="px-3 py-2 font-medium">{t("bookedCallColName")}</th>
                    <th className="px-3 py-2 font-medium">{t("bookedCallColSlot")}</th>
                    <th className="px-3 py-2 font-medium">{t("bookedCallColNotes")}</th>
                    <th className="px-3 py-2 font-medium">{t("bookedCallColStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                        {formatDateTime(r.createdAt, lang)}
                      </td>
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{r.phone}</td>
                      <td className="px-3 py-2">{r.name ?? "—"}</td>
                      <td className="max-w-[220px] px-3 py-2 whitespace-pre-wrap">{r.preferredTimeSlot}</td>
                      <td className="max-w-[180px] px-3 py-2 whitespace-pre-wrap text-muted-foreground">
                        {r.notes ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={r.status}
                          onValueChange={(v) => void onStatusChange(r.id, v as BookedCallStatus)}
                          disabled={updatingId === r.id}
                        >
                          <SelectTrigger size="sm" className="w-[min(100%,10rem)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">{t("bookedCallStatusPending")}</SelectItem>
                            <SelectItem value="contacted">{t("bookedCallStatusContacted")}</SelectItem>
                            <SelectItem value="cancelled">{t("bookedCallStatusCancelled")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTableScroll>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
