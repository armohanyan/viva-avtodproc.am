import AdminLayout from "src/components/AdminLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Shield } from "lucide-react";
import { useState } from "react";
import { Reveal } from "src/lib/motion";

export default function AdminProfile() {
  const { t } = useLang();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    firstName: "Super",
    lastName: "Admin",
    email: "admin@vivadrive.am",
    phone: "+374 10 000 001",
  });
  const [pass, setPass] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email) {
      showToast(t("fillRequired"), "error");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      showToast(t("profileSaved"), "success");
    }, 600);
  };

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pass.current || !pass.next || !pass.confirm) {
      showToast(t("fillRequired"), "error");
      return;
    }
    if (pass.next.length < 8) {
      showToast(t("passwordTooShortError"), "error");
      return;
    }
    if (pass.next !== pass.confirm) {
      showToast(t("passwordsDoNotMatchError"), "error");
      return;
    }
    setSavingPass(true);
    setTimeout(() => {
      setSavingPass(false);
      setPass({ current: "", next: "", confirm: "" });
      showToast(t("passwordUpdated"), "success");
    }, 600);
  };

  return (
    <AdminLayout>
      <PanelPageHeader icon={Shield} title={t("adminProfileTitle")} subtitle={t("adminProfilePageSubtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Reveal delay={0.06}>
          <Card className="p-6 border-border text-center">
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-2xl mx-auto mb-4">
              {form.firstName[0]}
              {form.lastName[0]}
            </div>
            <h3 className="font-bold text-foreground text-lg">
              {form.firstName} {form.lastName}
            </h3>
            <p className="text-muted-foreground text-sm mt-0.5">{form.email}</p>
          </Card>
        </Reveal>

        <div className="lg:col-span-2 space-y-6">
          <Reveal delay={0.08}>
            <Card className="p-6 border-border">
              <h3 className="font-semibold text-foreground mb-5">{t("personalInformationTitle")}</h3>
              <form onSubmit={handleSave}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("firstName")}</label>
                    <Input value={form.firstName} onChange={set("firstName")} className="h-10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("lastName")}</label>
                    <Input value={form.lastName} onChange={set("lastName")} className="h-10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("emailAddress")}</label>
                    <Input type="email" value={form.email} onChange={set("email")} className="h-10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("phoneNumber")}</label>
                    <Input type="tel" value={form.phone} onChange={set("phone")} className="h-10" />
                  </div>
                </div>
                <Button type="submit" disabled={saving} className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {saving ? t("saving") : t("saveChanges")}
                </Button>
              </form>
            </Card>
          </Reveal>

          <Reveal delay={0.12}>
            <Card className="p-6 border-border">
              <div className="flex items-center gap-2 mb-5">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{t("changePasswordTitle")}</h3>
              </div>
              <form onSubmit={handlePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("currentPassword")}</label>
                  <Input type="password" value={pass.current} onChange={(e) => setPass((p) => ({ ...p, current: e.target.value }))} className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("newPassword")}</label>
                  <Input type="password" value={pass.next} onChange={(e) => setPass((p) => ({ ...p, next: e.target.value }))} className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("confirmNewPassword")}</label>
                  <Input type="password" value={pass.confirm} onChange={(e) => setPass((p) => ({ ...p, confirm: e.target.value }))} className="h-10" />
                </div>
                <Button type="submit" disabled={savingPass} variant="outline">
                  {savingPass ? t("updating") : t("updatePassword")}
                </Button>
              </form>
            </Card>
          </Reveal>
        </div>
      </div>
    </AdminLayout>
  );
}
