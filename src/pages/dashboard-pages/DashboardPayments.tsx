import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import type { TranslationKey } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import DataTableToolbar from "src/components/DataTableToolbar";
import { CreditCard, ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import { CountUpText, Reveal } from "src/lib/motion";
import { useMemo, useState } from "react";

type PaymentRow = {
  id: string;
  descKey: TranslationKey;
  date: string;
  amount: string;
  type: string;
  status: string;
};

const payments: PaymentRow[] = [
  { id: "PAY-003", descKey: "paymentDescStandardPackage", date: "2026-03-01", amount: "55,000 ֏", type: "debit", status: "completed" },
  { id: "PAY-002", descKey: "paymentDescTheoryCohort", date: "2026-03-10", amount: "8,000 ֏", type: "debit", status: "completed" },
  { id: "PAY-001", descKey: "paymentDescExtraLesson", date: "2026-03-15", amount: "4,000 ֏", type: "debit", status: "completed" },
];

export default function DashboardPayments() {
  const { t } = useLang();
  const [search, setSearch] = useState("");

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      const label = t(p.descKey).toLowerCase();
      const hay = [p.id, label, p.date, p.amount, p.type, p.status].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [search, t]);

  const summary = [
    { labelKey: "paymentsTotalSpent" as const, value: "67,000 ֏", icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
    { labelKey: "paymentsThisMonth" as const, value: "67,000 ֏", icon: ArrowUpRight, color: "text-primary", bg: "bg-primary/10" },
    { labelKey: "paymentsSavedVersusAlacarte" as const, value: "~12,000 ֏", icon: ArrowDownLeft, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader icon={Wallet} title={t("payments")} subtitle={t("dashboardPaymentsPageSubtitle")} />
      </Reveal>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {summary.map((s, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <Card className="p-5 border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t(s.labelKey)}</p>
                  <p className="text-xl font-bold text-foreground">
                    {/^\s*\d/.test(s.value) ? <CountUpText value={s.value} /> : s.value}
                  </p>
                </div>
                <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.12}>
        <Card className="border-border overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground">{t("transactionHistoryTitle")}</h3>
          </div>
          <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
          <div className="divide-y divide-border">
            {filteredPayments.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("tableNoMatches")}</p>
            ) : null}
            {filteredPayments.map((p, i) => (
              <Reveal key={p.id} delay={0.06}>
                <div className="flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{t(p.descKey)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.id} · {p.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">−{p.amount}</p>
                    <Badge className="mt-1 bg-emerald-100 text-emerald-700 text-xs">{t("paidLabel")}</Badge>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Card>
      </Reveal>
    </DashboardLayout>
  );
}
