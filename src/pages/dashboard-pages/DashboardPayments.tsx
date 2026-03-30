import DashboardLayout from "src/components/DashboardLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { CreditCard, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { CountUpText, Reveal } from "src/lib/motion";

const payments = [
  { id: "PAY-003", desc: "Standard Package", date: "2026-03-01", amount: "55,000 ֏", type: "debit", status: "completed" },
  { id: "PAY-002", desc: "Theory Course Cohort 12", date: "2026-03-10", amount: "8,000 ֏", type: "debit", status: "completed" },
  { id: "PAY-001", desc: "Extra Lesson (1x)", date: "2026-03-15", amount: "4,000 ֏", type: "debit", status: "completed" },
];

export default function DashboardPayments() {
  const { t } = useLang();

  return (
    <DashboardLayout>
      <Reveal>
        <h2 className="text-2xl font-bold text-foreground mb-6">{t("payments")}</h2>
      </Reveal>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Spent", value: "67,000 ֏", icon: CreditCard, color: "text-primary", bg: "bg-primary/10" },
          { label: "This Month", value: "67,000 ֏", icon: ArrowUpRight, color: "text-red-500", bg: "bg-red-50" },
          { label: "Saved vs À la carte", value: "~12,000 ֏", icon: ArrowDownLeft, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <Card className="p-5 border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
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

      {/* Transactions */}
      <Reveal delay={0.12}>
        <Card className="border-border">
          <div className="p-5 border-b border-border">
            <h3 className="font-semibold text-foreground">{t("transactionHistoryTitle")}</h3>
          </div>
          <div className="divide-y divide-border">
            {payments.map((p, i) => (
              <Reveal key={i} delay={0.06}>
                <div className="flex items-center justify-between px-5 py-4 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shrink-0">
                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.desc}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.id} · {p.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-red-500">−{p.amount}</p>
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
