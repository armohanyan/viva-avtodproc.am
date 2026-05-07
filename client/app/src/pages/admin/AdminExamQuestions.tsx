import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang, type Lang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { AppModal } from "src/components/AppModal";
import ConfirmDialog from "src/components/ConfirmDialog";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { ClipboardList, Edit2, ImageIcon, Plus, Trash2 } from "lucide-react";
import { sanitizeCoverImageUrl } from "src/lib/blogHtml";
import type { ExamQuestion, ExamQuestionCategory } from "src/data/examSampleQuestions";
import { THEMATIC_TOPIC_IDS } from "src/data/thematicTopics";
import { loadExamQuestions, notifyExamQuestionsUpdated } from "src/lib/examQuestions";
import {
  defaultExamQuestionMeta,
  loadExamQuestionMeta,
  updateExamQuestionMeta,
  type ExamQuestionMeta,
} from "src/lib/examQuestionMeta";
import { uploadStaffImageFile } from "src/lib/staffImageUpload";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { cn } from "src/lib/utils";

const LANGS: Lang[] = ["am", "en", "ru"];

const emptyOptions = (): Record<Lang, string[]> => ({
  en: ["", "", "", ""],
  ru: ["", "", "", ""],
  am: ["", "", "", ""],
});

const emptyText = (): Record<Lang, string> => ({ en: "", ru: "", am: "" });

const EXAM_IMAGE_MAX_BYTES = 800 * 1024;

function questionToForm(q: ExamQuestion): {
  id: string;
  text: Record<Lang, string>;
  options: Record<Lang, string[]>;
  explanation: string;
  correctIndex: number;
  category: ExamQuestionCategory;
  topicId: string;
  imageUrl: string;
} {
  return {
    id: q.id,
    text: { ...q.text },
    options: {
      en: [...q.options.en],
      ru: [...q.options.ru],
      am: [...q.options.am],
    },
    explanation: q.explanation ?? "",
    correctIndex: q.correctIndex,
    category: q.category,
    topicId: q.topicId ?? "",
    imageUrl: q.imageUrl ?? "",
  };
}

function defaultForm() {
  return {
    id: "",
    text: emptyText(),
    options: emptyOptions(),
    explanation: "",
    correctIndex: 0,
    category: "rules" as ExamQuestionCategory,
    topicId: "5",
    imageUrl: "",
  };
}

const textareaClass = cn(
  "flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none md:text-sm dark:bg-input/30",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

type ExamDto = {
  id: string;
  text: Record<string, string>;
  options: Record<string, string[]>;
  explanation?: string;
  correctIndex: number;
  category: ExamQuestionCategory;
  topicId?: string;
  imageUrl?: string | null;
};

function mapApiToQuestion(q: ExamDto): ExamQuestion {
  return {
    id: q.id,
    text: q.text as ExamQuestion["text"],
    options: q.options as ExamQuestion["options"],
    explanation: q.explanation,
    correctIndex: q.correctIndex,
    category: q.category,
    topicId: q.topicId,
    imageUrl: q.imageUrl ?? undefined,
  };
}

export default function AdminExamQuestions() {
  const examQuestionFormId = useId();
  const { t, lang } = useLang();
  const { showToast } = useToast();
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);

  const load = useCallback(async () => {
    try {
      const rows = await vivaApiJson<ExamDto[]>("/exam-questions");
      if (Array.isArray(rows) && rows.length > 0) {
        setQuestions(rows.map(mapApiToQuestion));
      } else {
        setQuestions(loadExamQuestions());
      }
    } catch {
      setQuestions(loadExamQuestions());
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const [catFilter, setCatFilter] = useState<"all" | ExamQuestionCategory>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(() => defaultForm());
  const [metaDraft, setMetaDraft] = useState<ExamQuestionMeta>(() => defaultExamQuestionMeta());
  const [cardMode, setCardMode] = useState<"thematic" | "exam">("thematic");
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedMetaRef = useRef(false);
  const lastSavedMetaRef = useRef("");

  const selectedCardQuestionIds = useMemo(() => {
    const ids = cardMode === "thematic" ? metaDraft.thematicCardQuestionIds[selectedCardIndex] : metaDraft.examCardQuestionIds[selectedCardIndex];
    return new Set(ids ?? []);
  }, [cardMode, metaDraft.examCardQuestionIds, metaDraft.thematicCardQuestionIds, selectedCardIndex]);

  const filtered = useMemo(() => {
    return questions.filter((row) => {
      if (!selectedCardQuestionIds.has(row.id)) return false;
      const okCat = catFilter === "all" || row.category === catFilter;
      return okCat;
    });
  }, [questions, catFilter, selectedCardQuestionIds]);

  useEffect(() => {
    let mounted = true;
    void loadExamQuestionMeta().then((meta) => {
      if (mounted) {
        setMetaDraft(meta);
        lastSavedMetaRef.current = JSON.stringify(meta);
        hasLoadedMetaRef.current = true;
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const max = cardMode === "thematic" ? metaDraft.thematicCardTitles.length : metaDraft.examCardTitles.length;
    if (selectedCardIndex >= max) setSelectedCardIndex(0);
  }, [cardMode, metaDraft.examCardTitles.length, metaDraft.thematicCardTitles.length, selectedCardIndex]);

  const openAdd = () => {
    const next = defaultForm();
    if (cardMode === "thematic") {
      next.category = "rules";
      next.topicId = THEMATIC_TOPIC_IDS[selectedCardIndex] ?? "5";
    }
    setDialogOpen(true);
    setForm(next);
  };

  const openEdit = (q: ExamQuestion) => {
    setForm(questionToForm(q));
    setDialogOpen(true);
  };

  const categoryLabel = (c: ExamQuestionCategory) => {
    if (c === "rules") return t("adminExamQuestionsCategoryRules");
    if (c === "signs") return t("adminExamQuestionsCategorySigns");
    return t("adminExamQuestionsCategorySafety");
  };

  const validateForm = (): boolean => {
    for (const L of LANGS) {
      if (!form.text[L].trim()) {
        showToast(t("adminExamQuestionsErrText"), "error");
        return false;
      }
      for (let i = 0; i < 4; i++) {
        if (!form.options[L][i]?.trim()) {
          showToast(t("adminExamQuestionsErrOption"), "error");
          return false;
        }
      }
    }
    if (!form.explanation.trim()) {
      showToast(t("fillRequired"), "error");
      return false;
    }
    if (form.category !== "signs" && !form.topicId.trim()) {
      showToast(t("adminExamQuestionsErrTopic"), "error");
      return false;
    }
    return true;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const imageUrl = sanitizeCoverImageUrl(form.imageUrl.trim() || null);
    if (form.imageUrl.trim() && !imageUrl) {
      showToast(t("adminExamQuestionsImageInvalid"), "error");
      return;
    }

    const id =
      form.id.trim() ||
      `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    const isEditing = Boolean(form.id.trim());
    const resolvedCategory: ExamQuestionCategory = isEditing
      ? form.category
      : cardMode === "thematic"
        ? "rules"
        : form.category;
    const resolvedTopicId =
      resolvedCategory !== "signs"
        ? isEditing
          ? form.topicId.trim() || "5"
          : cardMode === "thematic"
            ? THEMATIC_TOPIC_IDS[selectedCardIndex] ?? "5"
            : form.topicId.trim() || "5"
        : undefined;

    const body: ExamDto = {
      id,
      text: form.text,
      options: form.options as Record<string, string[]>,
      explanation: form.explanation.trim(),
      correctIndex: form.correctIndex,
      category: resolvedCategory,
      ...(resolvedTopicId ? { topicId: resolvedTopicId } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    };

    try {
      await vivaApiJson("/exam-questions", { method: "POST", body });
      const nextMeta = buildMetaWithAssignment(id);
      const savedMeta = await updateExamQuestionMeta(nextMeta);
      setMetaDraft(savedMeta);
      notifyExamQuestionsUpdated();
      setDialogOpen(false);
      await load();
      showToast(form.id.trim() ? t("adminExamQuestionsSaved") : t("adminExamQuestionsCreated"), "info");
    } catch {
      showToast(t("adminExamQuestionsErrDuplicate"), "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await vivaApiJson(`/exam-questions/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      const nextMeta: ExamQuestionMeta = {
        ...metaDraft,
        thematicCardQuestionIds: metaDraft.thematicCardQuestionIds.map((row) => row.filter((id) => id !== deleteId)),
        examCardQuestionIds: metaDraft.examCardQuestionIds.map((row) => row.filter((id) => id !== deleteId)),
      };
      const savedMeta = await updateExamQuestionMeta(nextMeta);
      setMetaDraft(savedMeta);
      setDeleteId(null);
      notifyExamQuestionsUpdated();
      await load();
      showToast(t("adminExamQuestionsDeleted"), "info");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const removeFromCurrentCard = async (questionId: string) => {
    try {
      const next: ExamQuestionMeta =
        cardMode === "thematic"
          ? {
              ...metaDraft,
              thematicCardQuestionIds: metaDraft.thematicCardQuestionIds.map((row, idx) =>
                idx === selectedCardIndex ? row.filter((id) => id !== questionId) : row,
              ),
            }
          : {
              ...metaDraft,
              examCardQuestionIds: metaDraft.examCardQuestionIds.map((row, idx) =>
                idx === selectedCardIndex ? row.filter((id) => id !== questionId) : row,
              ),
            };
      const saved = await updateExamQuestionMeta(next);
      setMetaDraft(saved);
      showToast(t("adminExamQuestionsSaved"), "info");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const buildMetaWithAssignment = (questionId: string): ExamQuestionMeta => {
    if (cardMode === "thematic") {
      return {
        ...metaDraft,
        thematicCardQuestionIds: metaDraft.thematicCardQuestionIds.map((row, idx) =>
          idx === selectedCardIndex ? [...row.filter((x) => x !== questionId), questionId] : row.filter((x) => x !== questionId),
        ),
      };
    }
    return {
      ...metaDraft,
      examCardQuestionIds: metaDraft.examCardQuestionIds.map((row, idx) =>
        idx === selectedCardIndex ? [...row.filter((x) => x !== questionId), questionId] : row.filter((x) => x !== questionId),
      ),
    };
  };

  const preview = (q: ExamQuestion) => {
    const s = q.text[lang] || q.text.am;
    return s.length > 72 ? `${s.slice(0, 72)}…` : s;
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={ClipboardList}
        title={t("adminExamQuestionsTitle")}
        subtitle={t("adminExamQuestionsSubtitle")}
      />

      <div className="mt-6 flex justify-end">
        <Button type="button" size="sm" className="w-full sm:w-auto" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" />
          {t("adminExamQuestionsAdd")}
        </Button>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Քարտեր և հարցեր</h3>
            <p className="text-xs text-muted-foreground">Ընտրեք քարտը, հետո ավելացրեք/խմբագրեք/հեռացրեք հարցերը։</p>
          </div>
          <div className="text-xs text-muted-foreground">Քարտերի վերնագրերը ստատիկ են</div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={cardMode === "thematic" ? "default" : "outline"}
            onClick={() => setCardMode("thematic")}
          >
            Թեմատիկ քարտեր
          </Button>
          <Button type="button" size="sm" variant={cardMode === "exam" ? "default" : "outline"} onClick={() => setCardMode("exam")}>
            Քննության քարտեր
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {(cardMode === "thematic" ? metaDraft.thematicCardTitles : metaDraft.examCardTitles).map((title, i) => (
            <button
              key={`${cardMode}-card-${i}`}
              type="button"
              onClick={() => setSelectedCardIndex(i)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm",
                selectedCardIndex === i ? "border-primary bg-primary/10" : "border-border hover:bg-muted/30",
              )}
            >
              {cardMode === "thematic" ? (
                <img src={`/topic-icons/theme-${i + 1}.svg`} alt="" aria-hidden="true" className="mb-2 h-7 w-7 object-contain" />
              ) : null}
              <div className="font-medium truncate">{title}</div>
              <div className="text-xs text-muted-foreground">
                {cardMode === "thematic"
                  ? `${metaDraft.thematicCardQuestionIds[i]?.length ?? 0} հարց`
                  : `${metaDraft.examCardQuestionIds[i]?.length ?? 0} հարց`}
              </div>
            </button>
          ))}
        </div>
        {cardMode === "thematic" ? <p className="text-xs text-muted-foreground">Թեմայի ID: {THEMATIC_TOPIC_IDS[selectedCardIndex] ?? "—"}</p> : null}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Ընտրված քարտի հարցեր՝ {selectedCardQuestionIds.size}</span>
          <span>•</span>
          <span>Ստորև Add/Edit/Delete-ով կառավարեք այս քարտի բովանդակությունը</span>
        </div>
      </div>

      <AdminTableScroll className="mt-4">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="border-b border-border">
              <TableColumnHeaderWithFilter title={t("adminExamQuestionsColId")} />
              <TableColumnHeaderWithFilter
                title={t("adminExamQuestionsColCategory")}
                filter={
                  <TableColumnFilter
                    value={catFilter}
                    onChange={(v) => setCatFilter(v as typeof catFilter)}
                    ariaLabel={t("adminExamQuestionsFilterCategory")}
                    options={[
                      { value: "all", label: t("filterOptionAll") },
                      { value: "rules", label: t("adminExamQuestionsCategoryRules") },
                      { value: "signs", label: t("adminExamQuestionsCategorySigns") },
                      { value: "safety", label: t("adminExamQuestionsCategorySafety") },
                    ]}
                  />
                }
              />
              <TableColumnHeaderWithFilter title={t("adminExamQuestionsColTopic")} />
              <TableColumnHeaderWithFilter title={t("adminExamQuestionsColImage")} className="w-14" />
              <TableColumnHeaderWithFilter title={t("adminExamQuestionsColPreview")} className="min-w-[200px]" />
              <TableColumnHeaderWithFilter title={t("actions")} align="end" className="w-[100px]" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((q) => (
              <AdminTableRowContextMenu
                key={q.id}
                actions={[
                  {
                    kind: "item",
                    id: "edit",
                    label: t("adminExamQuestionsEdit"),
                    ariaLabel: t("adminExamQuestionsEdit"),
                    icon: Edit2,
                    onClick: () => openEdit(q),
                  },
                  {
                    kind: "item",
                    id: "remove-from-card",
                    label: "Հեռացնել քարտից",
                    ariaLabel: "Հեռացնել քարտից",
                    icon: Trash2,
                    onClick: () => void removeFromCurrentCard(q.id),
                  },
                  {
                    kind: "item",
                    id: "delete",
                    label: t("adminExamQuestionsDelete"),
                    ariaLabel: t("adminExamQuestionsDelete"),
                    icon: Trash2,
                    destructive: true,
                    onClick: () => setDeleteId(q.id),
                  },
                ]}
              >
                <tr className="border-b border-border/70">
                  <td className="py-2 pr-3 font-mono text-xs">{q.id}</td>
                  <td className="py-2 pr-3">{categoryLabel(q.category)}</td>
                  <td className="py-2 pr-3 tabular-nums">{q.category === "signs" ? "—" : q.topicId ?? "—"}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {q.imageUrl ? <ImageIcon className="w-4 h-4 text-primary" aria-label={t("adminExamQuestionsColImage")} /> : "—"}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{preview(q)}</td>
                  <td className="py-2 pl-3 text-right">
                    <div className="inline-flex justify-end">
                      <AdminTableRowActions
                        toolbarOnly
                        className="gap-1"
                        actions={[
                          {
                            kind: "item",
                            id: "edit",
                            label: t("adminExamQuestionsEdit"),
                            ariaLabel: t("adminExamQuestionsEdit"),
                            icon: Edit2,
                            onClick: () => openEdit(q),
                          },
                          {
                            kind: "item",
                            id: "remove-from-card",
                            label: "Հեռացնել քարտից",
                            ariaLabel: "Հեռացնել քարտից",
                            icon: Trash2,
                            onClick: () => void removeFromCurrentCard(q.id),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("adminExamQuestionsDelete"),
                            ariaLabel: t("adminExamQuestionsDelete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteId(q.id),
                          },
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              </AdminTableRowContextMenu>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">{t("adminExamQuestionsEmpty")}</p> : null}
      </AdminTableScroll>

      <AppModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={form.id ? t("adminExamQuestionsEdit") : t("adminExamQuestionsAdd")}
        contentClassName="max-w-lg max-h-[90vh]"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={examQuestionFormId}>
              {t("save")}
            </Button>
          </div>
        }
      >
        <form id={examQuestionFormId} onSubmit={submit} className="space-y-4">
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">
                Թեման և կատեգորիան որոշվում են ընտրված քարտով։ Այս պատուհանում պետք է լրացնել միայն հարցի բովանդակությունը։
              </p>
            </div>

            <div className="rounded-lg border border-border p-3 space-y-3">
              <Label>{t("adminExamQuestionsImageLabel")}</Label>
              <p className="text-[11px] text-muted-foreground">{t("adminExamQuestionsImageHint")}</p>
              <Input
                placeholder={t("adminExamQuestionsImageUrlPlaceholder")}
                value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                disabled={form.imageUrl.startsWith("data:")}
                className="mt-1"
              />
              {form.imageUrl.startsWith("data:") ? (
                <p className="text-xs text-muted-foreground">{t("adminExamQuestionsImageEmbeddedHint")}</p>
              ) : null}
              <div className="flex flex-wrap gap-2 items-center">
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    if (file.size > EXAM_IMAGE_MAX_BYTES) {
                      showToast(t("adminExamQuestionsImageTooLarge"), "error");
                      return;
                    }
                    try {
                      const url = await uploadStaffImageFile(file);
                      if (!sanitizeCoverImageUrl(url)) {
                        showToast(t("adminExamQuestionsImageInvalid"), "error");
                        return;
                      }
                      setForm((f) => ({ ...f, imageUrl: url }));
                    } catch (err) {
                      showToast(getApiErrorMessage(err), "error");
                    }
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => imageFileInputRef.current?.click()}>
                  {t("adminExamQuestionsImagePickFile")}
                </Button>
                {form.imageUrl ? (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, imageUrl: "" }))}>
                    {t("adminExamQuestionsRemoveImage")}
                  </Button>
                ) : null}
              </div>
              {sanitizeCoverImageUrl(form.imageUrl.trim() || null) ? (
                <img
                  src={sanitizeCoverImageUrl(form.imageUrl.trim() || null)!}
                  alt=""
                  className="max-h-36 max-w-full rounded-md border border-border object-contain"
                />
              ) : null}
            </div>

            <div>
              <Label>{t("adminExamQuestionsCorrectOption")}</Label>
              <Select
                value={String(form.correctIndex)}
                onValueChange={(v) => setForm((f) => ({ ...f, correctIndex: Number(v) }))}
              >
                <SelectTrigger className="mt-1.5 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3].map((i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i === 0
                        ? t("adminExamQuestionsOpt1")
                        : i === 1
                          ? t("adminExamQuestionsOpt2")
                          : i === 2
                            ? t("adminExamQuestionsOpt3")
                            : t("adminExamQuestionsOpt4")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {LANGS.map((L) => (
              <div key={L} className="space-y-2 rounded-lg border border-border p-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase">{L}</p>
                <div>
                  <Label className="text-xs">{t("adminExamQuestionsQuestionText")}</Label>
                  <textarea
                    className={cn(textareaClass, "mt-1")}
                    value={form.text[L]}
                    onChange={(e) => setForm((f) => ({ ...f, text: { ...f.text, [L]: e.target.value } }))}
                  />
                </div>
                <p className="text-xs font-medium text-foreground">{t("adminExamQuestionsOptionsHeading")}</p>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i}>
                    <Label className="text-xs">
                      {i === 0
                        ? t("adminExamQuestionsOpt1")
                        : i === 1
                          ? t("adminExamQuestionsOpt2")
                          : i === 2
                            ? t("adminExamQuestionsOpt3")
                            : t("adminExamQuestionsOpt4")}
                    </Label>
                    <Input
                      className="mt-1"
                      value={form.options[L][i]}
                      onChange={(e) =>
                        setForm((f) => {
                          const next = { ...f.options, [L]: [...f.options[L]] };
                          next[L][i] = e.target.value;
                          return { ...f, options: next };
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            ))}

            <div>
              <Label>Բացատրություն</Label>
              <textarea
                className={cn(textareaClass, "mt-1")}
                value={form.explanation}
                onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              />
            </div>

        </form>
      </AppModal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title={t("adminExamQuestionsDeleteTitle")}
        description={t("adminExamQuestionsDeleteDesc")}
        confirmLabel={t("adminExamQuestionsDelete")}
        danger
        onConfirm={handleDelete}
      />
    </AdminLayout>
  );
}
