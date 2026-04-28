import { useCallback, useEffect, useMemo, useState } from "react";
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

type ContactRequestStatus = "active" | "archived";
type ContactRequestsFilter = "all" | ContactRequestStatus;

type ContactRequestRow = {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  status: ContactRequestStatus;
  createdAt: string;
};

function formatDateTime(iso: string, lang: ReturnType<typeof useLang>["lang"]): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(localeForLang(lang), { dateStyle: "short", timeStyle: "short" });
}

export default function AdminContactRequests(): JSX.Element {
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [rows, setRows] = useState<ContactRequestRow[]>([]);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContactRequestsFilter>("all");

  const load = useCallback(async () => {
    try {
      const data = await vivaApiJson<ContactRequestRow[]>("/contact-requests");
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  }, [showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const onStatusChange = useCallback(
    async (id: number, status: ContactRequestStatus) => {
      setUpdatingId(id);
      try {
        const updated = await vivaApiJson<ContactRequestRow>(`/contact-requests/${id}`, {
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

  const sortedRows = useMemo(() => {
    const filtered = statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter);
    const active = filtered.filter((r) => r.status === "active");
    const archived = filtered.filter((r) => r.status === "archived");
    return [...active, ...archived];
  }, [rows, statusFilter]);

  return (
    <AdminLayout>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <PanelPageHeader title={t("adminContactRequests")} />
        <div className="flex items-center justify-end">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ContactRequestsFilter)}>
            <SelectTrigger className="w-[12rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("contactRequestFilterAll")}</SelectItem>
              <SelectItem value="active">{t("contactRequestStatusActive")}</SelectItem>
              <SelectItem value="archived">{t("contactRequestStatusArchived")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Card className="overflow-hidden p-0">
          {sortedRows.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">{t("adminContactRequestsEmpty")}</p>
          ) : (
            <AdminTableScroll>
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t("contactRequestColCreated")}</th>
                    <th className="px-3 py-2 font-medium">{t("contactRequestColName")}</th>
                    <th className="px-3 py-2 font-medium">{t("contactRequestColEmail")}</th>
                    <th className="px-3 py-2 font-medium">{t("contactRequestColPhone")}</th>
                    <th className="px-3 py-2 font-medium">{t("contactRequestColSubject")}</th>
                    <th className="px-3 py-2 font-medium">{t("contactRequestColMessage")}</th>
                    <th className="px-3 py-2 font-medium">{t("contactRequestColStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((r) => (
                    <tr key={r.id} className="border-b last:border-0">
                      <td className="text-muted-foreground px-3 py-2 whitespace-nowrap">
                        {formatDateTime(r.createdAt, lang)}
                      </td>
                      <td className="px-3 py-2">{[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-3 py-2">{r.email}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.phone ?? "—"}</td>
                      <td className="max-w-[180px] px-3 py-2 whitespace-pre-wrap">{r.subject ?? "—"}</td>
                      <td className="max-w-[240px] px-3 py-2 whitespace-pre-wrap text-muted-foreground">{r.message}</td>
                      <td className="px-3 py-2">
                        <Select
                          value={r.status}
                          onValueChange={(v) => void onStatusChange(r.id, v as ContactRequestStatus)}
                          disabled={updatingId === r.id}
                        >
                          <SelectTrigger size="sm" className="w-[min(100%,10rem)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">{t("contactRequestStatusActive")}</SelectItem>
                            <SelectItem value="archived">{t("contactRequestStatusArchived")}</SelectItem>
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
