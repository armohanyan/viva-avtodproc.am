import DashboardLayout from "src/components/DashboardLayout";
import PanelPageHeader from "src/components/PanelPageHeader";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Shield, UserCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Reveal } from "src/lib/motion";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { loadAccountSession, saveAccountSession } from "src/modules/accounts/account.session";

type AuthMeUser = {
  id: number;
  email: string;
  name: string;
  accountType: string;
  phone: string | null;
  phone2: string | null;
  hasPassword: boolean;
};

function splitDisplayName(name: string): { firstName: string; lastName: string } {
  const t = name.trim();
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t, lastName: "" };
  return { firstName: t.slice(0, i), lastName: t.slice(i + 1).trim() };
}

export default function DashboardProfile() {
  const { t } = useLang();
  const { showToast } = useToast();

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", phone2: "" });
  const [pass, setPass] = useState({ current: "", next: "", confirm: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [hasLocalPassword, setHasLocalPassword] = useState<boolean | null>(null);

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const me = await vivaApiJson<AuthMeUser>("/auth/me");
      const { firstName, lastName } = splitDisplayName(me.name);
      setHasLocalPassword(me.hasPassword);
      setForm({
        firstName,
        lastName,
        email: me.email,
        phone: me.phone ?? "",
        phone2: me.phone2 ?? "",
      });
      const prev = loadAccountSession();
      if (prev && String(me.id) === prev.id && prev.hasPassword !== me.hasPassword) {
        saveAccountSession({ ...prev, hasPassword: me.hasPassword });
      }
    } catch (e) {
      setProfileError(getApiErrorMessage(e));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setP = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setPass((f) => ({ ...f, [k]: e.target.value }));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.email) {
      showToast(t("fillRequired"), "error");
      return;
    }
    setSavingProfile(true);
    try {
      const fullName = `${form.firstName} ${form.lastName}`.trim();
      const updated = await vivaApiJson<AuthMeUser>("/auth/me", {
        method: "PATCH",
        body: {
          name: fullName,
          phone: form.phone.trim() === "" ? null : form.phone.trim(),
          phone2: form.phone2.trim() === "" ? null : form.phone2.trim(),
        },
      });
      const prev = loadAccountSession();
      if (prev) {
        saveAccountSession({
          ...prev,
          name: updated.name,
          ...(typeof updated.hasPassword === "boolean" ? { hasPassword: updated.hasPassword } : {}),
        });
      }
      if (typeof updated.hasPassword === "boolean") {
        setHasLocalPassword(updated.hasPassword);
      }
      showToast(t("profileSaved"), "success");
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePassword = async (e: React.FormEvent) => {
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
    try {
      await vivaApiJson<void>("/auth/change-password", {
        method: "POST",
        body: { currentPassword: pass.current, newPassword: pass.next },
      });
      setPass({ current: "", next: "", confirm: "" });
      setHasLocalPassword(true);
      const prev = loadAccountSession();
      if (prev) {
        saveAccountSession({ ...prev, hasPassword: true });
      }
      showToast(t("passwordUpdated"), "success");
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <DashboardLayout>
      <PanelPageHeader icon={UserCircle} title={t("profile")} />

      {profileError ? (
        <p className="text-sm text-destructive mb-4 max-w-3xl" role="alert">
          {profileError}
        </p>
      ) : null}

      <div className="space-y-6 max-w-3xl">
        <Reveal delay={0.06}>
          <Card className="p-6 border-border">
            <h3 className="font-semibold text-foreground mb-5">{t("personalInformationTitle")}</h3>
            {profileLoading ? (
              <p className="text-sm text-muted-foreground py-4">{t("loading")}</p>
            ) : (
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
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("emailAddress")}</label>
                    <Input type="email" value={form.email} readOnly disabled className="h-10 opacity-80" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("phoneNumber")}</label>
                    <Input type="tel" value={form.phone} onChange={set("phone")} className="h-10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("phoneNumber2")}</label>
                    <Input type="tel" value={form.phone2} onChange={set("phone2")} className="h-10" />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={savingProfile || profileLoading}
                  className="mt-5 bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-70"
                >
                  {savingProfile ? t("saving") : t("saveChanges")}
                </Button>
              </form>
            )}
          </Card>
        </Reveal>

        {!profileLoading && hasLocalPassword === false ? (
          <Reveal delay={0.14}>
            <Card className="p-6 border-border">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">{t("changePasswordTitle")}</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t("profileSocialSignInNoPasswordHint")}</p>
            </Card>
          </Reveal>
        ) : null}
        {!profileLoading && hasLocalPassword === true ? (
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
        ) : null}
      </div>
    </DashboardLayout>
  );
}
