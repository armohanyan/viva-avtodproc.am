import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import DataTableToolbar from "src/components/DataTableToolbar";
import { useLang } from "src/lib/i18n";
import type { TranslationKey } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { ShoppingBag, BookOpen, Car, LayoutGrid, CheckCircle2 } from "lucide-react";
import { Link } from "wouter";
import { CountUpText, Reveal } from "src/lib/motion";
import { useMemo, useState } from "react";
import { getCatalogPackage, useStudentEntitlements, type OwnedPackage } from "src/modules/dashboard/studentEntitlements";

function packageNameKey(tier: OwnedPackage["tier"]): TranslationKey {
  switch (tier) {
    case "basic":
      return "basic";
    case "standard":
      return "standard";
    case "premium":
      return "premium";
  }
}

export default function DashboardPurchases() {
  const { t } = useLang();
  const { ownedPackages, extraPracticalBlocks, hasTheoryFromPackage, primaryTheorySessions } = useStudentEntitlements();

  const [search, setSearch] = useState("");

  const summary = useMemo(() => {
    const pkgLeft = ownedPackages.reduce((acc, p) => acc + Math.max(0, p.practicalTotal - p.practicalUsed), 0);
    const pkgTotal = ownedPackages.reduce((acc, p) => acc + p.practicalTotal, 0);
    const pkgUsed = ownedPackages.reduce((acc, p) => acc + p.practicalUsed, 0);
    const exLeft = extraPracticalBlocks.reduce((acc, p) => acc + Math.max(0, p.practicalTotal - p.practicalUsed), 0);
    const exTotal = extraPracticalBlocks.reduce((acc, p) => acc + p.practicalTotal, 0);
    const exUsed = extraPracticalBlocks.reduce((acc, p) => acc + p.practicalUsed, 0);
    return { pkgLeft, pkgTotal, pkgUsed, exLeft, exTotal, exUsed };
  }, [ownedPackages, extraPracticalBlocks]);

  const filteredPackages = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ownedPackages.filter((p) => {
      const label = t(packageNameKey(p.tier)).toLowerCase();
      const hay = [p.purchaseId, label, p.purchasedAt].join(" ").toLowerCase();
      return !q || hay.includes(q);
    });
  }, [search, ownedPackages, t]);

  const renderPackageIncludes = (p: OwnedPackage) => {
    const cat = getCatalogPackage(p.tier);
    const theorySessions = cat?.theorySessions ?? p.theorySessions;
    return (
      <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
        <li className="flex gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <span>
            {theorySessions} {t("packageFeatTheorySessions")}
          </span>
        </li>
        <li className="flex gap-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
          <span>{t("purchasesIncludesDigitalNote")}</span>
        </li>
      </ul>
    );
  };

  return (
    <DashboardLayout>
      <Reveal>
        <PanelPageHeader
          icon={ShoppingBag}
          title={t("purchases")}
          subtitle={t("dashboardPurchasesPageSubtitle")}
          actions={
            <Link href="/dashboard/payments">
              <Button type="button" variant="outline" size="sm" className="border-input">
                {t("studentNavPaymentHistory")}
              </Button>
            </Link>
          }
        />
      </Reveal>

      <Reveal delay={0.04}>
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="w-4 h-4 text-primary shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">{t("studentServicesAtAGlance")}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{t("studentServicesPackageTitle")}</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                    <CountUpText value={summary.pkgLeft} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    {t("studentServicesPackageSub")} · {summary.pkgUsed} {t("studentServicesWordUsed")} / {summary.pkgTotal}{" "}
                    {t("lessons")}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{t("studentServicesExtraTitle")}</p>
                  <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">
                    <CountUpText value={summary.exLeft} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    {t("studentServicesExtraSub")}
                    {summary.exTotal > 0 ? (
                      <>
                        {" "}
                        · {summary.exUsed} {t("studentServicesWordUsed")} / {summary.exTotal} {t("lessons")}
                      </>
                    ) : null}
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-4 border-border">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{t("studentServicesTheoryTitle")}</p>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {hasTheoryFromPackage ? (
                      <span className="tabular-nums">
                        <CountUpText value={primaryTheorySessions} /> {t("packageFeatTheorySessions")}
                      </span>
                    ) : (
                      t("studentServicesTheoryNone")
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 leading-snug">
                    {hasTheoryFromPackage ? t("purchasesIncludesTheoryNote") : t("studentServicesTheorySub")}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </Reveal>

      <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} className="rounded-lg border border-border bg-card mb-6" />

      <div className="mb-8">
          {filteredPackages.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{ownedPackages.length === 0 ? t("studentServicesNoPackages") : t("tableNoMatches")}</p>
          ) : null}
          {filteredPackages.map((p, i) => (
            <Reveal key={p.purchaseId} delay={i * 0.06}>
              <Card className="p-6 border-border mb-4 last:mb-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-6 h-6 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-foreground">{t(packageNameKey(p.tier))}</h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {t("purchasesPurchasedPrefix")} {p.purchasedAt}
                      </p>
                      <Badge className="mt-2 bg-emerald-100 text-emerald-700 text-xs">{t("active")}</Badge>
                      <p className="text-xs font-medium text-foreground mt-4">{t("purchasesPackageIncludesHeading")}</p>
                      {renderPackageIncludes(p)}
                    </div>
                  </div>
                  <div className="sm:text-right shrink-0">
                    <p className="text-sm text-muted-foreground mb-1">{t("purchasesLessonsUsed")}</p>
                    <p className="text-2xl font-bold text-foreground">
                      <CountUpText value={p.practicalUsed} />{" "}
                      <span className="text-muted-foreground text-base font-normal">/ {p.practicalTotal}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{t("purchasesProgress")}</span>
                    <span>{Math.round((p.practicalUsed / p.practicalTotal) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(p.practicalUsed / p.practicalTotal) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/dashboard/bookings">
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      {t("bookNow")}
                    </Button>
                  </Link>
                  <Link href="/dashboard/payments">
                    <Button size="sm" variant="outline" className="border-input">
                      {t("studentNavPaymentHistory")}
                    </Button>
                  </Link>
                </div>
              </Card>
            </Reveal>
          ))}
      </div>
    </DashboardLayout>
  );
}
