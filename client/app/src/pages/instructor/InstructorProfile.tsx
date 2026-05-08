import InstructorPanelLayout from "src/components/InstructorPanelLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Card } from "src/components/ui/card";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Shield, UserCircle } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Reveal } from "src/lib/motion";
import { loadAccountSession, saveAccountSession, useAccount, useAuthPasswordSectionState } from "src/modules/accounts";
import { useInstructors } from "src/modules/instructors/useInstructors";
import { formatInstructorBranches } from "src/modules/instructors/instructorLabels";
import { useBranches } from "src/modules/branches";
import { useCities } from "src/modules/cities";
import { vivaApiJson } from "src/lib/vivaApi";
import { getApiErrorMessage } from "src/lib/api";
import { uploadStaffImageFile } from "src/lib/staffImageUpload";

export default function InstructorProfile() {
  const { t } = useLang();
  const { showToast } = useToast();
  const { user } = useAccount();
  const passwordSection = useAuthPasswordSectionState();
  const { instructors, loading, refresh } = useInstructors();
  const { branches } = useBranches();
  const { cities } = useCities();

  const me = useMemo(
    () => (user?.accountType === "instructor" ? instructors.find((i) => i.id === user.id) : undefined),
    [instructors, user?.accountType, user?.id],
  );

  const displayName = user?.name?.trim() || me?.name || "";
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  const avatarSrc = me?.imageSrc ?? "/logo.svg";
  const avatarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [pass, setPass] = useState({ current: "", next: "", confirm: "" });
  const [savingPass, setSavingPass] = useState(false);

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
      await vivaApiJson("/auth/change-password", {
        method: "POST",
        body: { currentPassword: pass.current, newPassword: pass.next },
      });
      setPass({ current: "", next: "", confirm: "" });
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

  const branchesLine = me ? formatInstructorBranches(me, branches, cities) : "—";

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.currentTarget.value = "";
    if (!file || !me?.id) return;

    setUploadingAvatar(true);

    try {
      const uploadedUrl = await uploadStaffImageFile(file);
      await vivaApiJson(`/instructors/${encodeURIComponent(me.id)}`, {
        method: "PATCH",
        body: { imageSrc: uploadedUrl },
      });

      const prev = loadAccountSession();

      if (prev) {
        saveAccountSession({ ...prev });
      }

      await refresh();
      showToast(t("instructorUpdatedToast"), "success");
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <InstructorPanelLayout>
      <PanelPageHeader icon={UserCircle} title={t("profile")} subtitle={t("instructorProfilePublicHint")} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
        <Reveal delay={0.06}>
          <Card className="p-6 border-border text-center gap-3">
            <div className="relative inline-block">
              <div className="w-28 h-28 rounded-full overflow-hidden bg-muted mx-auto ring-2 ring-border">
                <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
              </div>
            </div>
            <input
              ref={avatarFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => void handleAvatarPick(e)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadingAvatar}
              onClick={() => avatarFileInputRef.current?.click()}
            >
              {uploadingAvatar ? t("loading") : "Upload image"}
            </Button>
            <h3 className="font-bold text-foreground text-lg">{displayName || "—"}</h3>
            <p className="text-xs text-muted-foreground text-left leading-relaxed">{t("instructorProfileCardFieldsHint")}</p>
          </Card>
        </Reveal>

        <div className="lg:col-span-2 space-y-4">
          <Reveal delay={0.08}>
            <Card className="p-6 border-border gap-3">
              <h3 className="font-semibold text-foreground">{t("personalInformationTitle")}</h3>
              <p className="text-sm text-muted-foreground">{t("instructorProfileReadOnlyNote")}</p>
              {loading ? <p className="text-sm text-muted-foreground py-4">{t("loading")}</p> : null}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("firstName")}</label>
                  <Input readOnly value={firstName} className="h-10 bg-muted/40" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("lastName")}</label>
                  <Input readOnly value={lastName} className="h-10 bg-muted/40" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("emailAddress")}</label>
                  <Input readOnly type="email" value={user?.email ?? me?.email ?? ""} className="h-10 bg-muted/40" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("phoneNumber")}</label>
                  <Input readOnly type="tel" value={me?.phone ?? ""} className="h-10 bg-muted/40" />
                </div>
                <div className="sm:col-span-2 space-y-3 rounded-lg border border-border/80 bg-muted/10 p-4">
                  <h4 className="text-sm font-semibold text-foreground">{t("instructorProfileTeachingAreasTitle")}</h4>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{t("instructorBranchesLabel")}</label>
                    <p className="text-sm text-foreground leading-snug">{branchesLine}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("hourlyRateLabel")}</label>
                  <Input readOnly type="text" inputMode="numeric" value={me ? String(me.hourlyPrice) : ""} className="h-10 bg-muted/40" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("yearsExperienceLabel")}</label>
                  <Input readOnly type="text" inputMode="numeric" value={me ? String(me.years) : ""} className="h-10 bg-muted/40" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-1.5">{t("ratingDisplayLabel")}</label>
                  <Input readOnly value={me ? String(me.rating) : ""} className="h-10 bg-muted/40" />
                </div>
              </div>
            </Card>
          </Reveal>

          {passwordSection === "social_only" ? (
            <Reveal delay={0.12}>
              <Card className="p-6 border-border gap-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-foreground">{t("changePasswordTitle")}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t("profileSocialSignInNoPasswordHint")}</p>
              </Card>
            </Reveal>
          ) : null}
          {passwordSection === "change_password" ? (
            <Reveal delay={0.12}>
              <Card className="p-6 border-border gap-3">
                <div className="flex items-center gap-2">
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
          ) : null}
        </div>
      </div>
    </InstructorPanelLayout>
  );
}
