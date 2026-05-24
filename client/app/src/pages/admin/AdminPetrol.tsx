import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { useLang } from "src/lib/i18n";
import AdminPetrolConsumptionTab from "src/pages/admin/AdminPetrolConsumptionTab";
import AdminPetrolExpenseTab from "src/pages/admin/AdminPetrolExpenseTab";
import { Fuel } from "lucide-react";
import { useState } from "react";

type PetrolTab = "expense" | "consumption";

export default function AdminPetrolPage() {
  const { t } = useLang();
  const [tab, setTab] = useState<PetrolTab>("expense");

  return (
    <AdminLayout>
      <div className="space-y-6">
        <PanelPageHeader
          icon={Fuel}
          title={t("adminPetrolTitle")}
          subtitle={t("adminPetrolSubtitle")}
        />

        <Tabs value={tab} onValueChange={(v) => setTab(v as PetrolTab)} className="space-y-6">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="expense">{t("adminPetrolTabExpense")}</TabsTrigger>
            <TabsTrigger value="consumption">{t("adminPetrolTabConsumption")}</TabsTrigger>
          </TabsList>

          <TabsContent value="expense" className="mt-0">
            <AdminPetrolExpenseTab />
          </TabsContent>

          <TabsContent value="consumption" className="mt-0">
            <AdminPetrolConsumptionTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
