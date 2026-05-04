import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import type { TranslationKey } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import DataTableToolbar from "src/components/DataTableToolbar";
import { CreditCard, Wallet } from "lucide-react";
import { Reveal } from "src/lib/motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "src/modules/accounts";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { formatAmd } from "src/utils/currency.utils";

type FinanceTx = {
  id: number;
  createdAt: string;
  description: string;
  grossAmd: number;
  feeAmd: number;
  status: string;
  method: string;
};

function financeStatusKey(status: string): TranslationKey {
  switch (status) {
    case "completed":
      return "financeStatusCompleted";
    case "pending":
      return "financeStatusPending";
    case "failed":
      return "financeStatusFailed";
    case "refunded":
      return "financeStatusRefunded";
    default:
      return "financeStatusPending";
  }
}

export default function DashboardPayments() {
  const { t } = useLang();
  const { user } = useAccount();
  const [rows, setRows] = useState<FinanceTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    if (!user?.id || user.accountType !== "student") {
      setRows([]);
      setLoading(false);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const q = new URLSearchParams({ studentUserId: String(user.id) });
      const data = await vivaApiJson<FinanceTx[]>(`/finance/student-transactions?${q.toString()}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setRows([]);
      setLoadError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.accountType]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((p) => {
      const hay = [String(p.id), p.description, p.status, p.method, formatAmd(p.grossAmd), p.createdAt.slice(0, 10)]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search]);

  return (
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader icon={Wallet} title={t("payments")} />
      </Reveal>

      {loadError ? (
        <p className="text-sm text-destructive mb-4" role="alert">
          {loadError}
        </p>
      ) : null}

      <Reveal delay={0.06}>
        <Card className="border-border overflow-hidden">
          <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
          <div className="divide-y divide-border">
            {loading ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("loading")}</p>
            ) : filtered.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("tableNoMatches")}</p>
            ) : (
              filtered.map((p) => (
                <Reveal key={p.id} delay={0.06}>
                  <div className="flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors gap-4 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shrink-0">
                        <CreditCard className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 gap-y-1">
                          <p className="text-sm font-medium text-foreground">{p.description}</p>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 font-medium border-0">
                            {p.method}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          #{p.id} · {p.createdAt.slice(0, 10)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 w-full sm:w-auto">
                      <p className="text-sm font-semibold text-foreground">−{formatAmd(p.grossAmd)}</p>
                      <Badge className="mt-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100 text-xs">
                        {t(financeStatusKey(p.status))}
                      </Badge>
                    </div>
                  </div>
                </Reveal>
              ))
            )}
          </div>
        </Card>
      </Reveal>
    </DashboardLayout>
  );
}
