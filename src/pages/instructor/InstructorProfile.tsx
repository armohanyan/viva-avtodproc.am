import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { Camera, Shield } from "lucide-react";
import { useState } from "react";
import { Reveal } from "src/lib/motion";

export default function InstructorProfile() {
  const { t } = useLang();
  const { showToast } = useToast();

  const [avatarSrc, setAvatarSrc] = useState("/logo.jpg");
  const [form, setForm] = useState({
    firstName: "Armen",
    lastName: "Petrosyan",
    email: "instructor@vivadrive.am",
    phone: "+374 99 123 456",
    location: "Yerevan",
    hourlyPrice: "7000",
    years: "12",
    rating: "4.9",
    studentsCount: "340",
    specialties: "City Driving, Highway, Night Driving",
    publicBio: "Patient, experienced instructor focused on safe city driving.",
  });
  const [pass, setPass] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const set =
    (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleAvatar = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 800_000) {
        showToast(t("blogImageTooLarge"), "error");
        return;
      }
      const url = URL.createObjectURL(file);
      setAvatarSrc(url);
      showToast(t("profileSaved"), "success");
    };
    input.click();
  };

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

  const displayName = `${form.firstName} ${form.lastName}`.trim();

  return (
    <InstructorPanelLayout>
      <h2 className="text-2xl font-bold text-foreground mb-2">{t("profile")}</h2>
      <p className="text-muted-foreground text-sm mb-6 max-w-2xl">{t("instructorProfilePublicHint")}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Reveal delay={0.06}>
          <Card className="p-6 border-border text-center">
            <div className="relative inline-block mb-4">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-muted mx-auto ring-2 ring-border">
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              </div>
              <button
                type="button"
                onClick={handleAvatar}
                className="absolute bottom-0 right-1/2 translate-x-12 w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground hover:bg-primary/90 border-2 border-background"
                aria-label={t("blogFieldCoverImage")}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <h3 className="font-bold text-foreground text-lg">{displayName}</h3>
            <p className="text-muted-foreground text-sm mt-0.5">{form.email}</p>
            <p className="text-xs text-muted-foreground mt-4 text-left leading-relaxed">{t("instructorProfileCardFieldsHint")}</p>
          </Card>
        </Reveal>

        <div className="lg:col-span-2 space-y-6">
          <Reveal delay={0.08}>
            <Card className="p-6 border-border">
              <h3 className="font-semibold text-foreground mb-5">{t("personalInformationTitle")}</h3>
              <form onSubmit={handleSave} className="space-y-4">
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
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("location")}</label>
                    <Input value={form.location} onChange={set("location")} className="h-10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("hourlyRateLabel")}</label>
                    <Input type="number" min={0} value={form.hourlyPrice} onChange={set("hourlyPrice")} className="h-10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("yearsExperienceLabel")}</label>
                    <Input type="number" min={0} value={form.years} onChange={set("years")} className="h-10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("ratingDisplayLabel")}</label>
                    <Input value={form.rating} onChange={set("rating")} className="h-10" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("instructorPublicStudentsCount")}</label>
                    <Input value={form.studentsCount} onChange={set("studentsCount")} className="h-10" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("specialtiesLabel")}</label>
                    <Input value={form.specialties} onChange={set("specialties")} className="h-10" placeholder={t("specialtiesHint")} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("instructorPublicBioLabel")}</label>
                    <textarea
                      value={form.publicBio}
                      onChange={set("publicBio")}
                      rows={3}
                      className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
    </InstructorPanelLayout>
  );
}
