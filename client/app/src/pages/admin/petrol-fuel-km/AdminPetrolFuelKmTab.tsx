import { Tabs, TabsContent, TabsList, TabsTrigger } from "src/components/ui/tabs";
import { useLang } from "src/lib/i18n";
import AdminPetrolFuelKmAnalyticsSubTab from "src/pages/admin/petrol-fuel-km/AdminPetrolFuelKmAnalyticsSubTab";
import AdminPetrolFuelKmExpenseSubTab from "src/pages/admin/petrol-fuel-km/AdminPetrolFuelKmExpenseSubTab";
import AdminPetrolFuelKmKmSubTab from "src/pages/admin/petrol-fuel-km/AdminPetrolFuelKmKmSubTab";
import { useState } from "react";

type FuelKmSubTab = "fuel" | "km" | "analytics";

export default function AdminPetrolFuelKmTab() {
  const { t } = useLang();
  const [subTab, setSubTab] = useState<FuelKmSubTab>("fuel");

  return (
    <Tabs value={subTab} onValueChange={(v) => setSubTab(v as FuelKmSubTab)} className="space-y-6">
      <TabsList className="flex-wrap h-auto">
        <TabsTrigger value="fuel">{t("adminPetrolFuelKmSubTabFuel")}</TabsTrigger>
        <TabsTrigger value="km">{t("adminPetrolFuelKmSubTabKm")}</TabsTrigger>
        <TabsTrigger value="analytics">{t("adminPetrolFuelKmSubTabAnalytics")}</TabsTrigger>
      </TabsList>

      <TabsContent value="fuel" className="mt-0">
        <AdminPetrolFuelKmExpenseSubTab />
      </TabsContent>

      <TabsContent value="km" className="mt-0">
        <AdminPetrolFuelKmKmSubTab />
      </TabsContent>

      <TabsContent value="analytics" className="mt-0">
        <AdminPetrolFuelKmAnalyticsSubTab />
      </TabsContent>
    </Tabs>
  );
}
