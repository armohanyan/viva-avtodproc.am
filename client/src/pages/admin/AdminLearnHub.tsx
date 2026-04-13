import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { Card } from "src/components/ui/card";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Link } from "wouter";
import { Car, ChevronRight, BookOpen, ClipboardList } from "lucide-react";
import { Reveal } from "src/lib/motion";

export default function AdminLearnHub() {
  const { t } = useLang();

  const cards = [
    {
      href: "/admin/learn/practical",
      icon: Car,
      titleKey: "adminLearnCardPracticalTitle" as const,
      descKey: "adminLearnCardPracticalDesc" as const,
      ctaKey: "adminLearnOpenPractical" as const,
    },
    {
      href: "/admin/learn/theory",
      icon: BookOpen,
      titleKey: "adminLearnCardTheoryTitle" as const,
      descKey: "adminLearnCardTheoryDesc" as const,
      ctaKey: "adminLearnOpenTheory" as const,
    },
    {
      href: "/admin/learn/exam-questions",
      icon: ClipboardList,
      titleKey: "adminLearnCardExamTestsTitle" as const,
      descKey: "adminLearnCardExamTestsDesc" as const,
      ctaKey: "adminLearnOpenExamTests" as const,
    },
  ];

  return (
    <AdminLayout>
      <PanelPageHeader icon={BookOpen} title={t("adminLearnHubTitle")} subtitle={t("adminLearnHubSubtitle")} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl lg:max-w-6xl">
        {cards.map((c, idx) => (
          <Reveal key={c.href} delay={idx * 0.08}>
            <Link href={c.href} className="block group">
              <Card className="p-6 border-border h-full transition-colors hover:border-primary/40 hover:bg-muted/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <c.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-foreground text-lg mb-2">{t(c.titleKey)}</h2>
                    <p className="text-sm text-muted-foreground mb-4">{t(c.descKey)}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                      {t(c.ctaKey)}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          </Reveal>
        ))}
      </div>
    </AdminLayout>
  );
}
