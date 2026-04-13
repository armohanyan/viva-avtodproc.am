import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import type { TranslationKey } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import DataTableToolbar from "src/components/DataTableToolbar";
import { CreditCard, Wallet } from "lucide-react";
import { Reveal } from "src/lib/motion";
import { useMemo, useState } from "react";
import { Link } from "wouter";

type PaymentCategory = "package" | "theory" | "practical";

type PaymentRow = {
  id: string;
  descKey: TranslationKey;
  date: string;
  amount: string;
  type: string;
  status: string;
  category: PaymentCategory;
};

const payments: PaymentRow[] = [
  { id: "PAY-002", descKey: "paymentDescStandardPackage", date: "2026-03-01", amount: "55,000 ֏", type: "debit", status: "completed", category: "package" },
  { id: "PAY-001", descKey: "paymentDescExtraLesson", date: "2026-03-15", amount: "12,000 ֏", type: "debit", status: "completed", category: "practical" },
];

function categoryBadgeClass(category: PaymentCategory): string {
  switch (category) {
    case "package":
      return "bg-primary/15 text-primary border-0";
    case "practical":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-100 border-0";
    case "theory":
      return "bg-violet-100 text-violet-900 dark:bg-violet-950/50 dark:text-violet-100 border-0";
  }
}

export default function DashboardPayments() {
  const { t } = useLang();
  const [search, setSearch] = useState("");

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();
    return payments.filter((p) => {
      const label = t(p.descKey).toLowerCase();
      const cat =
        p.category === "package"
          ? t("paymentCategoryPackage").toLowerCase()
          : p.category === "practical"
            ? t("paymentCategoryPractical").toLowerCase()
            : t("paymentCategoryTheory").toLowerCase();
      const hay = [p.id, label, p.date, p.amount, p.type, p.status, cat].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [search, t]);

  return (
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader
          icon={Wallet}
          title={t("payments")}
          subtitle={t("dashboardPaymentsPageSubtitle")}
          actions={
            <Link href="/dashboard/purchases">
              <Button type="button" variant="outline" size="sm" className="border-input">
                {t("purchases")}
              </Button>
            </Link>
          }
        />
      </Reveal>

      <Reveal delay={0.06}>
        <Card className="border-border overflow-hidden">
          <div className="p-5 border-b border-border space-y-1">
            <h3 className="font-semibold text-foreground">{t("transactionHistoryTitle")}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{t("paymentsHistoryIntro")}</p>
          </div>
          <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} />
          <div className="divide-y divide-border">
            {filteredPayments.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-muted-foreground">{t("tableNoMatches")}</p>
            ) : null}
            {filteredPayments.map((p) => (
              <Reveal key={p.id} delay={0.06}>
                <div className="flex items-center justify-between px-5 py-4 hover:bg-primary/5 transition-colors gap-4 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 gap-y-1">
                        <p className="text-sm font-medium text-foreground">{t(p.descKey)}</p>
                        <Badge className={`text-[10px] px-2 py-0 font-medium ${categoryBadgeClass(p.category)}`}>
                          {p.category === "package"
                            ? t("paymentCategoryPackage")
                            : p.category === "practical"
                              ? t("paymentCategoryPractical")
                              : t("paymentCategoryTheory")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.id} · {p.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 w-full sm:w-auto">
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
