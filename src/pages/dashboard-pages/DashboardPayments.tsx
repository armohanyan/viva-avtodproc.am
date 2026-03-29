import DashboardLayout from "src/components/DashboardLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { CreditCard, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const payments = [
  { id: "PAY-003", desc: "Standard Package", date: "2026-03-01", amount: "55,000 ֏", type: "debit", status: "completed" },
  { id: "PAY-002", desc: "Theory Course Cohort 12", date: "2026-03-10", amount: "8,000 ֏", type: "debit", status: "completed" },
  { id: "PAY-001", desc: "Extra Lesson (1x)", date: "2026-03-15", amount: "4,000 ֏", type: "debit", status: "completed" },
];

export default function DashboardPayments() {
  const { t } = useLang();

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold text-slate-900 mb-6">{t("payments")}</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Spent", value: "67,000 ֏", icon: CreditCard, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "This Month", value: "67,000 ֏", icon: ArrowUpRight, color: "text-red-500", bg: "bg-red-50" },
          { label: "Saved vs À la carte", value: "~12,000 ֏", icon: ArrowDownLeft, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((s, i) => (
          <Card key={i} className="p-5 border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Transactions */}
      <Card className="border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">Transaction History</h3>
        </div>
        <div className="divide-y divide-slate-50">
          {payments.map((p, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                  <CreditCard className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{p.desc}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{p.id} · {p.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-red-500">−{p.amount}</p>
                <Badge className="mt-1 bg-emerald-100 text-emerald-700 text-xs">Paid</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </DashboardLayout>
  );
}
