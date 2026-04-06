import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import DataTableToolbar from "src/components/DataTableToolbar";
import { useLang } from "src/lib/i18n";
import type { TranslationKey } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { ShoppingBag, BookOpen, Video } from "lucide-react";
import { Link } from "wouter";
import { CountUpText, Reveal } from "src/lib/motion";
import { useToast } from "src/lib/toast";
import { useMemo, useState } from "react";

type PackagePurchase = {
  id: string;
  nameKey: TranslationKey;
  date: string;
  price: string;
  status: string;
  lessonsTotal: number;
  lessonsUsed: number;
  type: "package";
};

type TheoryPurchase = {
  id: string;
  nameKey: TranslationKey;
  date: string;
  price: string;
  status: string;
  type: "theory";
};

const purchases: PackagePurchase[] = [
  {
    id: "PKG-001",
    nameKey: "demoPurchaseStandardName",
    date: "2026-03-01",
    price: "55,000 ֏",
    status: "active",
    lessonsTotal: 18,
    lessonsUsed: 4,
    type: "package",
  },
];

const theoryPurchases: TheoryPurchase[] = [
  {
    id: "TH-001",
    nameKey: "demoTheoryCourseName",
    date: "2026-03-10",
    price: "8,000 ֏",
    status: "active",
    type: "theory",
  },
];

export default function DashboardPurchases() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "package" | "theory">("all");

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return purchases.filter((p) => {
      const label = t(p.nameKey).toLowerCase();
      const hay = [p.id, label, p.date, p.price, p.status].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [search, t]);

  const filteredTheory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return theoryPurchases.filter((p) => {
      const label = t(p.nameKey).toLowerCase();
      const hay = [p.id, label, p.date, p.price, p.status].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [search, t]);

  const showPackages = typeFilter === "all" || typeFilter === "package";
  const showTheory = typeFilter === "all" || typeFilter === "theory";

  return (
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader icon={ShoppingBag} title={t("purchases")} subtitle={t("dashboardPurchasesPageSubtitle")} />
      </Reveal>

      <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} className="rounded-lg border border-border bg-card mb-6">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as "all" | "package" | "theory")}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground min-w-[10rem]"
          aria-label={t("filterByType")}
        >
          <option value="all">{t("purchasesFilterAll")}</option>
          <option value="package">{t("purchasesFilterPackage")}</option>
          <option value="theory">{t("purchasesFilterTheory")}</option>
        </select>
      </DataTableToolbar>

      {showPackages ? (
      <div className="mb-8">
        <h3 className="font-semibold text-foreground mb-3">{t("purchasesActivePackage")}</h3>
        {filteredPackages.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("tableNoMatches")}</p>
        ) : null}
        {filteredPackages.map((p, i) => (
          <Reveal key={i} delay={i * 0.06}>
            <Card className="p-6 border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{t(p.nameKey)}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t("purchasesPurchasedPrefix")} {p.date} · {p.price}
                    </p>
                    <Badge className="mt-2 bg-emerald-100 text-emerald-700 text-xs">{t("active")}</Badge>
                  </div>
                </div>
                <div className="sm:text-right">
                  <p className="text-sm text-muted-foreground mb-1">{t("purchasesLessonsUsed")}</p>
                  <p className="text-2xl font-bold text-foreground">
                    <CountUpText value={p.lessonsUsed} /> <span className="text-muted-foreground text-base font-normal">/ {p.lessonsTotal}</span>
                  </p>
                </div>
              </div>

              <div className="mt-5">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{t("purchasesProgress")}</span>
                  <span>{Math.round((p.lessonsUsed / p.lessonsTotal) * 100)}%</span>
                </div>
                <div className="h-2 bg-accent rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(p.lessonsUsed / p.lessonsTotal) * 100}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 flex gap-3">
                <Link href="/dashboard/bookings">
                  <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {t("bookNow")}
                  </Button>
                </Link>
                <Link href="/dashboard/payments">
                  <Button size="sm" variant="outline" className="border-input">
                    {t("purchasesViewDetails")}
                  </Button>
                </Link>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
      ) : null}

      {showTheory ? (
      <div className="mb-8">
        <h3 className="font-semibold text-foreground mb-3">{t("purchasesTheoryCourses")}</h3>
        {filteredTheory.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("tableNoMatches")}</p>
        ) : null}
        {filteredTheory.map((p, i) => (
          <Reveal key={i} delay={i * 0.06 + 0.08}>
            <Card className="p-6 border-border">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-foreground">{t(p.nameKey)}</h4>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {t("purchasesEnrolledPrefix")} {p.date} · {p.price}
                    </p>
                    <Badge className="mt-2 bg-emerald-100 text-emerald-700 text-xs">{t("active")}</Badge>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                    onClick={() => {
                      window.open("https://meet.google.com", "_blank", "noopener,noreferrer");
                      showToast(t("openingMeetingLinkToast"), "info");
                    }}
                  >
                    <Video className="w-3.5 h-3.5" />
                    {t("meetLink")}
                  </Button>
                  <Link href="/dashboard/bookings">
                    <Button size="sm" variant="outline" className="border-input">
                      {t("viewSchedule")}
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </Reveal>
        ))}
      </div>
      ) : null}

      <Reveal delay={0.1}>
        <Card className="p-6 bg-gradient-to-r from-primary to-primary/80 border-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-primary-foreground text-lg">{t("purchasesUpgradeTitle")}</h3>
              <p className="text-primary-foreground/80 text-sm mt-1">{t("purchasesUpgradeSub")}</p>
            </div>
            <Link href="/packages">
              <Button className="bg-background text-primary hover:bg-accent shrink-0">{t("purchasesViewPackages")}</Button>
            </Link>
          </div>
        </Card>
      </Reveal>
    </DashboardLayout>
  );
}
