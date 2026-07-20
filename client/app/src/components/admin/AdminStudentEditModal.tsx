import { useEffect, useId, useMemo, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { AppModal } from "src/components/AppModal";
import { Input } from "src/components/ui/input";
import { Button } from "src/components/ui/button";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { useBranches } from "src/modules/branches";
import { allInstructorNames } from "src/modules/admin/adminPeople";
import { useInstructors } from "src/modules/instructors/useInstructors";

const INTERNAL_NO_LOGIN_EMAIL_DOMAIN = "no-login.local";

function displayStudentEmail(email: string): string {
  const value = (email ?? "").trim();
  return value.toLowerCase().endsWith(`@${INTERNAL_NO_LOGIN_EMAIL_DOMAIN}`) ? "" : value;
}

function parseLessons(lessons: string): { completed: number; total: number } | null {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(lessons.trim());
  if (!m) return null;
  return { completed: Number(m[1]), total: Number(m[2]) };
}

export type AdminStudentEditModalUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  phone2: string;
  instructor: string;
  package: string;
  lessons: string;
  status: string;
  /** YYYY-MM-DD */
  joinedIso: string;
  branchId: string;
  /** 0-10 */
  skillRating: number;
  licenseAchieved: boolean;
};

type PackageRow = { id: string; name: string; lessons: number; theoryLessons: number };

export type AdminStudentEditModalProps = {
  open: boolean;
  user: AdminStudentEditModalUser | null;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save. */
  onSaved?: () => void;
  /** Optional secondary action shown next to Save (e.g. "Book lesson"). */
  onBookClick?: () => void;
};

export default function AdminStudentEditModal({
  open,
  user,
  onOpenChange,
  onSaved,
  onBookClick,
}: AdminStudentEditModalProps) {
  const formId = useId();
  const { t } = useLang();
  const { showToast } = useToast();
  const { branches } = useBranches();
  const { instructors } = useInstructors();
  const instructorOptions = useMemo(() => allInstructorNames(instructors), [instructors]);
  const instructorRows = useMemo(
    () => instructors.map((i) => ({ id: i.id, name: i.name })),
    [instructors],
  );

  const [draft, setDraft] = useState<AdminStudentEditModalUser | null>(user);
  const [packages, setPackages] = useState<PackageRow[]>([]);

  useEffect(() => {
    setDraft(
      user
        ? {
            ...user,
            email: displayStudentEmail(user.email),
            phone: user.phone ?? "",
            phone2: user.phone2 ?? "",
          }
        : null,
    );
  }, [user]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const pkg = await vivaApiJson<PackageRow[]>("/packages");
        if (cancelled) return;
        setPackages(
          Array.isArray(pkg)
            ? pkg.map((p) => ({
                id: p.id,
                name: p.name,
                lessons: p.lessons,
                theoryLessons: Number(p.theoryLessons ?? 0),
              }))
            : [],
        );
      } catch {
        if (!cancelled) setPackages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;
    const parsed = parseLessons(draft.lessons);
    const pkg = packages.find((p) => p.name === draft.package);
    const ins = instructorRows.find((i) => i.name === draft.instructor);
    try {
      await vivaApiJson(`/students/${encodeURIComponent(draft.id)}`, {
        method: "PATCH",
        body: {
          name: draft.name,
          email: draft.email,
          phone: draft.phone,
          phone2: draft.phone2.trim() === "" ? null : draft.phone2.trim(),
          branchId: draft.branchId,
          packageId: pkg?.id,
          instructorUserId: ins?.id ?? null,
          enrollmentStatus: draft.status,
          skillRating: draft.skillRating,
          licenseAchieved: draft.licenseAchieved,
          joinedIso: draft.joinedIso,
          ...(parsed
            ? { lessonsCompleted: parsed.completed, lessonsTotal: parsed.total }
            : {}),
        },
      });
      onOpenChange(false);
      showToast(t("profileSaved"), "success");
      onSaved?.();
    } catch (err) {
      showToast(getApiErrorMessage(err) || t("fillRequired"), "error");
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("userDialogEditTitle")}
      contentClassName="max-w-lg max-h-[min(90vh,720px)]"
      footer={
        draft ? (
          <div className="flex flex-wrap gap-2 sm:gap-3 flex-1 min-w-0 w-full sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="min-w-[6rem] flex-1 sm:flex-none"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            {onBookClick ? (
              <Button
                type="button"
                variant="secondary"
                className="min-w-0 flex-1 sm:flex-none gap-2"
                onClick={() => {
                  onOpenChange(false);
                  onBookClick();
                }}
              >
                <CalendarPlus className="w-4 h-4 shrink-0" />
                {t("adminStudentBookLesson")}
              </Button>
            ) : null}
            <Button
              type="submit"
              form={formId}
              className="min-w-[6rem] flex-1 sm:flex-none bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {t("save")}
            </Button>
          </div>
        ) : null
      }
    >
      {draft ? (
        <form id={formId} onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t("adminSelectBranch")}
            </label>
            <select
              value={draft.branchId}
              onChange={(e) => setDraft({ ...draft, branchId: e.target.value })}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("name")}</label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="h-10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t("emailAddress")}
            </label>
            <Input
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              className="h-10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t("phoneNumber")}
            </label>
            <Input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="h-10"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t("phoneNumber2")}
            </label>
            <Input
              value={draft.phone2}
              onChange={(e) => setDraft({ ...draft, phone2: e.target.value })}
              className="h-10"
              placeholder="+374 99 000 000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t("cohortColInstructor")}
            </label>
            <select
              value={draft.instructor}
              onChange={(e) => setDraft({ ...draft, instructor: e.target.value })}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {instructorOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">{t("status")}</label>
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  status: e.target.value,
                  licenseAchieved: e.target.value === "completed" ? true : draft.licenseAchieved,
                })
              }
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="active">{t("active")}</option>
              <option value="inactive">{t("inactive")}</option>
              <option value="completed">{t("userStatusCompleted")}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t("studentSkillRating")} (0-10)
            </label>
            <Input
              type="number"
              min={0}
              max={10}
              value={draft.skillRating}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  skillRating: Math.max(0, Math.min(10, Number(e.target.value) || 0)),
                })
              }
              className="h-10"
            />
          </div>
          <label className="flex items-center gap-2.5 cursor-pointer text-sm text-foreground">
            <input
              type="checkbox"
              checked={draft.licenseAchieved}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  licenseAchieved: e.target.checked,
                  status: e.target.checked
                    ? "completed"
                    : draft.status === "completed"
                      ? "active"
                      : draft.status,
                })
              }
              className="h-4 w-4 rounded border-input accent-primary"
            />
            {t("studentLicenseAchieved")}
          </label>
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1">
              {t("adminColJoined")}
            </label>
            <Input
              type="date"
              value={draft.joinedIso}
              onChange={(e) => setDraft({ ...draft, joinedIso: e.target.value })}
              className="h-10"
            />
          </div>
        </form>
      ) : null}
    </AppModal>
  );
}
