import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Badge } from "src/components/ui/badge";
import { Shield, UserCircle } from "lucide-react";
import { useState } from "react";
import { Reveal } from "src/lib/motion";

export default function DashboardProfile() {
  const { t } = useLang();
  const { showToast } = useToast();

  const [form, setForm] = useState({ firstName: "Armen", lastName: "Petrosyan", email: "armen@example.com", phone: "+374 99 123 456", dob: "1998-05-15" });
  const [pass, setPass] = useState({ current: "", next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setP = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setPass(f => ({ ...f, [k]: e.target.value }));

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email) { showToast(t("fillRequired"), "error"); return; }
    setSavingProfile(true);
    setTimeout(() => { setSavingProfile(false); showToast(t("profileSaved"), "success"); }, 700);
  };

  const handlePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pass.current || !pass.next || !pass.confirm) { showToast(t("fillRequired"), "error"); return; }
    if (pass.next.length < 8) { showToast(t("passwordTooShortError"), "error"); return; }
    if (pass.next !== pass.confirm) { showToast(t("passwordsDoNotMatchError"), "error"); return; }
    setSavingPass(true);
    setTimeout(() => {
      setSavingPass(false);
      setPass({ current: "", next: "", confirm: "" });
      showToast(t("passwordUpdated"), "success");
    }, 700);
  };

  return (
    <DashboardLayout>
      <PanelPageHeader icon={UserCircle} title={t("profile")} subtitle={t("dashboardProfilePageSubtitle")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile summary card */}
        <Reveal delay={0.06}>
          <Card className="p-6 border-border text-center">
            <div className="mb-4 flex justify-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl">
                {form.firstName[0]}
              </div>
            </div>
            <h3 className="font-bold text-foreground text-lg">{form.firstName} {form.lastName}</h3>
            <p className="text-muted-foreground text-sm mt-0.5">{form.email}</p>
            <Badge className="mt-3 bg-primary/10 text-primary">{t("standardPackageLabel")}</Badge>
            <div className="mt-6 space-y-2.5 text-left">
              {[
                { label: t("memberSinceLabel"), value: t("memberSinceDemoValue") },
                {
                  label: t("lessonsCompletedLabel"),
                  value: `4 / 18 ${t("lessons")} (${t("studentServicesPackageTitle")}) · 1 / 3 (${t("studentServicesExtraTitle")})`,
                },
              ].map((r, i) => (
                <div key={i} className="flex justify-between text-sm border-b border-border pb-2">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-medium text-foreground">{r.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>

        {/* Forms */}
        <div className="lg:col-span-2 space-y-6">
          <Reveal delay={0.10}>
            <Card className="p-6 border-border">
              <h3 className="font-semibold text-foreground mb-5">{t("personalInformationTitle")}</h3>
              <form onSubmit={handleSaveProfile}>
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
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("dateOfBirthLabel")}</label>
                    <Input type="date" value={form.dob} onChange={set("dob")} className="h-10" />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-70"
                >
                  {savingProfile ? t("saving") : t("saveChanges")}
                </Button>
              </form>
            </Card>
          </Reveal>

          <Reveal delay={0.14}>
            <Card className="p-6 border-border">
              <div className="flex items-center gap-2 mb-5">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{t("changePasswordTitle")}</h3>
              </div>
              <form onSubmit={handlePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("currentPassword")}</label>
                  <Input type="password" value={pass.current} onChange={setP("current")} placeholder="••••••••" className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("newPassword")}</label>
                  <Input type="password" value={pass.next} onChange={setP("next")} placeholder={t("passwordPlaceholderMinChars")} className="h-10" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("confirmNewPassword")}</label>
                  <Input type="password" value={pass.confirm} onChange={setP("confirm")} placeholder={t("passwordPlaceholderRepeat")} className="h-10" />
                </div>
                <Button type="submit" disabled={savingPass} variant="outline" className="border-border disabled:opacity-70">
                  {savingPass ? t("updating") : t("updatePassword")}
                </Button>
              </form>
            </Card>
          </Reveal>
        </div>
      </div>
    </DashboardLayout>
  );
}
