import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang, type Lang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { ClipboardList, Edit2, ImageIcon, Plus, RotateCcw, Trash2 } from "lucide-react";
import { sanitizeCoverImageUrl } from "src/lib/blogHtml";
import type { ExamQuestion, ExamQuestionCategory } from "src/data/examSampleQuestions";
import { EXAM_QUESTION_POOL } from "src/data/examSampleQuestions";
import { THEMATIC_TOPIC_IDS } from "src/data/thematicTopics";
import { loadExamQuestions, notifyExamQuestionsUpdated } from "src/lib/examQuestions";
import { vivaApiJson } from "src/lib/vivaApi";
import { cn } from "src/lib/utils";

const LANGS: Lang[] = ["en", "ru", "am"];

const emptyOptions = (): Record<Lang, string[]> => ({
  en: ["", "", "", ""],
  ru: ["", "", "", ""],
  am: ["", "", "", ""],
});

const emptyText = (): Record<Lang, string> => ({ en: "", ru: "", am: "" });

const EXAM_IMAGE_MAX_BYTES = 800 * 1024;

function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) return Promise.reject(new Error("too_large"));
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

function questionToForm(q: ExamQuestion): {
  id: string;
  text: Record<Lang, string>;
  options: Record<Lang, string[]>;
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
  optionExplanations?: Record<string, (string | null)[]>;
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
    optionExplanations: q.optionExplanations as ExamQuestion["optionExplanations"],
    correctIndex: q.correctIndex,
    category: q.category,
    topicId: q.topicId,
    imageUrl: q.imageUrl ?? undefined,
  };
}

export default function AdminExamQuestions() {
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

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<"all" | ExamQuestionCategory>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(() => defaultForm());
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return questions.filter((row) => {
      const hay = [row.id, row.text.en, row.text.ru, row.text.am, row.topicId ?? ""].join(" ").toLowerCase();
      const okSearch = !q || hay.includes(q);
      const okCat = catFilter === "all" || row.category === catFilter;
      return okSearch && okCat;
    });
  }, [questions, search, catFilter]);

  const openAdd = () => {
    setForm(defaultForm());
    setDialogOpen(true);
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
    const body: ExamDto = {
      id,
      text: form.text,
      options: form.options as Record<string, string[]>,
      correctIndex: form.correctIndex,
      category: form.category,
      ...(form.category !== "signs" && form.topicId.trim() ? { topicId: form.topicId.trim() } : {}),
      ...(imageUrl ? { imageUrl } : {}),
    };

    try {
      await vivaApiJson("/exam-questions", { method: "POST", body });
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
      setDeleteId(null);
      notifyExamQuestionsUpdated();
      await load();
      showToast(t("adminExamQuestionsDeleted"), "info");
    } catch {
      showToast(t("fillRequired"), "error");
    }
  };

  const handleReset = async () => {
    try {
      const seedQs: ExamDto[] = EXAM_QUESTION_POOL.map((q) => ({
        id: q.id,
        text: { ...q.text },
        options: { en: [...q.options.en], ru: [...q.options.ru], am: [...q.options.am] },
        optionExplanations: q.optionExplanations
          ? {
              en: [...(q.optionExplanations.en ?? [])],
              ru: [...(q.optionExplanations.ru ?? [])],
              am: [...(q.optionExplanations.am ?? [])],
            }
          : undefined,
        correctIndex: q.correctIndex,
        category: q.category,
        topicId: q.topicId,
        imageUrl: q.imageUrl ?? null,
      }));
      await vivaApiJson("/exam-questions/replace", { method: "PUT", body: { questions: seedQs } });
      setResetOpen(false);
      notifyExamQuestionsUpdated();
      await load();
      showToast(t("adminExamQuestionsResetDone"), "info");
    } catch {
      showToast(t("fillRequired"), "error");
    }
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

      <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`} className="mt-6">
        <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:justify-end sm:gap-2">
          <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setResetOpen(true)}>
            <RotateCcw className="w-4 h-4 mr-1.5" />
            {t("adminExamQuestionsReset")}
          </Button>
          <Button type="button" size="sm" className="w-full sm:w-auto" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            {t("adminExamQuestionsAdd")}
          </Button>
        </div>
      </DataTableToolbar>

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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? t("adminExamQuestionsEdit") : t("adminExamQuestionsAdd")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("adminExamQuestionsColCategory")}</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v as ExamQuestionCategory }))
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rules">{t("adminExamQuestionsCategoryRules")}</SelectItem>
                    <SelectItem value="signs">{t("adminExamQuestionsCategorySigns")}</SelectItem>
                    <SelectItem value="safety">{t("adminExamQuestionsCategorySafety")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.category !== "signs" ? (
                <div>
                  <Label>{t("adminExamQuestionsTopicLabel")}</Label>
                  <Select value={form.topicId || "5"} onValueChange={(v) => setForm((f) => ({ ...f, topicId: v }))}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {THEMATIC_TOPIC_IDS.map((tid) => (
                        <SelectItem key={tid} value={tid}>
                          {t("adminExamQuestionsTopicPrefix")} {tid}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">{t("adminExamQuestionsTopicHint")}</p>
                </div>
              ) : null}
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
                    try {
                      const data = await readFileAsDataUrl(file, EXAM_IMAGE_MAX_BYTES);
                      if (!sanitizeCoverImageUrl(data)) {
                        showToast(t("adminExamQuestionsImageInvalid"), "error");
                        return;
                      }
                      setForm((f) => ({ ...f, imageUrl: data }));
                    } catch {
                      showToast(t("adminExamQuestionsImageTooLarge"), "error");
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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit">{t("save")}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title={t("adminExamQuestionsDeleteTitle")}
        description={t("adminExamQuestionsDeleteDesc")}
        confirmLabel={t("adminExamQuestionsDelete")}
        danger
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t("adminExamQuestionsResetTitle")}
        description={t("adminExamQuestionsResetDesc")}
        confirmLabel={t("adminExamQuestionsReset")}
        danger
        onConfirm={handleReset}
      />
    </AdminLayout>
  );
}
