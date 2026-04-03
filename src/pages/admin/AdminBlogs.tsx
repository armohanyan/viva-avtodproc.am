import { FormEvent, useMemo, useState } from "react";
import AdminLayout from "src/components/AdminLayout";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import { Plus, Edit2, Trash2, ImageIcon } from "lucide-react";
import { loadBlogs, createBlog, updateBlog, deleteBlog, slugify, type Blog } from "src/lib/blogs";
import { isRichTextEmpty } from "src/lib/blogHtml";
import RichTextEditor from "src/components/RichTextEditor";
import { cn } from "src/lib/utils";

const textareaClass = cn(
  "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none md:text-sm dark:bg-input/30",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

const COVER_MAX_BYTES = 800 * 1024;

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function datetimeLocalToIso(local: string): string {
  const t = new Date(local).getTime();
  if (Number.isNaN(t)) return new Date().toISOString();
  return new Date(t).toISOString();
}

function readFileAsDataUrl(file: File, maxBytes: number): Promise<string> {
  if (file.size > maxBytes) return Promise.reject(new Error("too_large"));
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error("read"));
    r.readAsDataURL(file);
  });
}

export default function AdminBlogs() {
  const { t } = useLang();
  const { showToast } = useToast();
  const [blogs, setBlogs] = useState<Blog[]>(() => loadBlogs());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBlog, setEditBlog] = useState<Blog | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);
  const [newBlog, setNewBlog] = useState({
    title: "",
    excerpt: "",
    bodyHtml: "<p></p>",
    coverImage: null as string | null,
    published: true,
  });

  const refresh = () => setBlogs(loadBlogs());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return blogs.filter((b) => {
      const hay = [b.title, b.slug, b.excerpt, b.id].join(" ").toLowerCase();
      const matchSearch = !q || hay.includes(q);
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "published" && b.published) ||
        (statusFilter === "draft" && !b.published);
      return matchSearch && matchStatus;
    });
  }, [blogs, search, statusFilter]);

  const previewSlugNew = useMemo(() => slugify(newBlog.title.trim()) || "…", [newBlog.title]);
  const previewSlugEdit = useMemo(
    () => (editBlog ? slugify(editBlog.title.trim()) || "…" : ""),
    [editBlog],
  );

  const handleDelete = () => {
    if (!deleteId) return;
    deleteBlog(deleteId);
    refresh();
    setDeleteId(null);
    showToast(t("blogDeletedToast"), "success");
  };

  const handleEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editBlog) return;
    if (!editBlog.title.trim() || isRichTextEmpty(editBlog.bodyHtml)) {
      showToast(t("fillRequired"), "error");
      return;
    }
    updateBlog(editBlog);
    refresh();
    setEditBlog(null);
    showToast(t("blogUpdatedToast"), "success");
  };

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!newBlog.title.trim() || isRichTextEmpty(newBlog.bodyHtml)) {
      showToast(t("fillRequired"), "error");
      return;
    }
    createBlog({
      title: newBlog.title,
      excerpt: newBlog.excerpt,
      bodyHtml: newBlog.bodyHtml,
      coverImage: newBlog.coverImage,
      published: newBlog.published,
    });
    refresh();
    setAddOpen(false);
    setNewBlog({
      title: "",
      excerpt: "",
      bodyHtml: "<p></p>",
      coverImage: null,
      published: true,
    });
    showToast(t("blogCreatedToast"), "success");
  };

  const onCoverFile = async (file: File | undefined, mode: "new" | "edit") => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file, COVER_MAX_BYTES);
      if (mode === "new") setNewBlog((b) => ({ ...b, coverImage: dataUrl }));
      else if (editBlog) setEditBlog({ ...editBlog, coverImage: dataUrl });
    } catch {
      showToast(t("blogImageTooLarge"), "error");
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-foreground">{t("blogsAdmin")}</h2>
        <Button
          onClick={() => {
            setNewBlog({
              title: "",
              excerpt: "",
              bodyHtml: "<p></p>",
              coverImage: null,
              published: true,
            });
            setAddFormKey((k) => k + 1);
            setAddOpen(true);
          }}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          {t("addNew")}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <div className="flex flex-wrap gap-2">
            {(["all", "published", "draft"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-input text-muted-foreground hover:border-primary/40"
                }`}
              >
                {s === "all" ? t("filterOptionAll") : s === "published" ? t("blogPublished") : t("blogDraft")}
              </button>
            ))}
          </div>
        </DataTableToolbar>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                {[t("blogColTitle"), t("blogColSlug"), t("blogColExcerpt"), t("date"), t("status"), t("actions")].map(
                  (h) => (
                    <th
                      key={h}
                      className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b) => (
                <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-start gap-3 max-w-[240px]">
                      <div className="w-14 h-14 rounded-lg bg-muted shrink-0 overflow-hidden border border-border">
                        {b.coverImage ? (
                          <img src={b.coverImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-foreground line-clamp-2 pt-0.5">{b.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground whitespace-nowrap">{b.slug}</td>
                  <td className="px-4 py-3.5 text-muted-foreground max-w-[200px]">
                    <span className="line-clamp-2">{b.excerpt || "—"}</span>
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap text-xs">
                    {new Date(b.publishedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5">
                    {b.published ? (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">{t("blogPublished")}</Badge>
                    ) : (
                      <Badge className="bg-slate-100 text-slate-600 text-xs">{t("blogDraft")}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditBlog({ ...b })}
                        className="p-1.5 rounded hover:bg-primary/10 text-primary"
                        aria-label={t("edit")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteId(b.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-red-500"
                        aria-label={t("delete")}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!editBlog} onOpenChange={() => setEditBlog(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("blogEditTitle")}</DialogTitle>
          </DialogHeader>
          {editBlog && (
            <form onSubmit={handleEdit} className="space-y-4 mt-2">
              <div>
                <Label className="text-muted-foreground">{t("blogFieldTitle")} *</Label>
                <Input
                  value={editBlog.title}
                  onChange={(e) => setEditBlog({ ...editBlog, title: e.target.value })}
                  className="h-10 mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                  {t("blogSlugAuto")}: /blogs/{previewSlugEdit}
                </p>
              </div>

              <div>
                <Label className="text-muted-foreground">{t("blogFieldCoverImage")}</Label>
                <p className="text-xs text-muted-foreground mb-2">{t("blogCoverHint")}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <Input
                    type="file"
                    accept="image/*"
                    className="max-w-xs"
                    onChange={(e) => onCoverFile(e.target.files?.[0], "edit")}
                  />
                  {editBlog.coverImage ? (
                    <>
                      <img
                        src={editBlog.coverImage}
                        alt=""
                        className="h-20 w-32 rounded-lg object-cover border border-border"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => setEditBlog({ ...editBlog, coverImage: null })}>
                        {t("blogRemoveCover")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <div>
                <Label className="text-muted-foreground">{t("blogFieldExcerpt")}</Label>
                <textarea
                  value={editBlog.excerpt}
                  onChange={(e) => setEditBlog({ ...editBlog, excerpt: e.target.value })}
                  className={cn(textareaClass, "mt-1")}
                />
              </div>

              <div>
                <Label className="text-muted-foreground">{t("blogFieldBody")} *</Label>
                <RichTextEditor
                  key={editBlog.id}
                  value={editBlog.bodyHtml}
                  onChange={(html) => setEditBlog({ ...editBlog, bodyHtml: html })}
                  placeholder={t("blogEditorPlaceholder")}
                  className="mt-1"
                  onImageTooLarge={() => showToast(t("blogImageTooLarge"), "error")}
                />
                <p className="text-xs text-muted-foreground mt-1">{t("blogInlineImageHint")}</p>
              </div>

              <div>
                <Label className="text-muted-foreground">{t("blogFieldPublishedAt")}</Label>
                <Input
                  type="datetime-local"
                  value={isoToDatetimeLocal(editBlog.publishedAt)}
                  onChange={(e) =>
                    setEditBlog({ ...editBlog, publishedAt: datetimeLocalToIso(e.target.value) })
                  }
                  className="h-10 mt-1"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editBlog.published}
                  onChange={(e) => setEditBlog({ ...editBlog, published: e.target.checked })}
                  className="rounded border-input"
                />
                <span className="text-sm text-foreground">{t("blogFieldPublished")}</span>
              </label>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setEditBlog(null)}>
                  {t("cancel")}
                </Button>
                <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                  {t("save")}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("blogNewTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            <div>
              <Label className="text-muted-foreground">{t("blogFieldTitle")} *</Label>
              <Input
                value={newBlog.title}
                onChange={(e) => setNewBlog({ ...newBlog, title: e.target.value })}
                className="h-10 mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1.5 font-mono">
                {t("blogSlugAuto")}: /blogs/{previewSlugNew}
              </p>
            </div>

            <div>
              <Label className="text-muted-foreground">{t("blogFieldCoverImage")}</Label>
              <p className="text-xs text-muted-foreground mb-2">{t("blogCoverHint")}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1">
                <Input
                  type="file"
                  accept="image/*"
                  className="max-w-xs"
                  onChange={(e) => onCoverFile(e.target.files?.[0], "new")}
                />
                {newBlog.coverImage ? (
                  <>
                    <img
                      src={newBlog.coverImage}
                      alt=""
                      className="h-20 w-32 rounded-lg object-cover border border-border"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setNewBlog({ ...newBlog, coverImage: null })}>
                      {t("blogRemoveCover")}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <div>
              <Label className="text-muted-foreground">{t("blogFieldExcerpt")}</Label>
              <textarea
                value={newBlog.excerpt}
                onChange={(e) => setNewBlog({ ...newBlog, excerpt: e.target.value })}
                className={cn(textareaClass, "mt-1")}
              />
            </div>

            <div>
              <Label className="text-muted-foreground">{t("blogFieldBody")} *</Label>
              <RichTextEditor
                key={`add-${addFormKey}`}
                value={newBlog.bodyHtml}
                onChange={(html) => setNewBlog((prev) => ({ ...prev, bodyHtml: html }))}
                placeholder={t("blogEditorPlaceholder")}
                className="mt-1"
                onImageTooLarge={() => showToast(t("blogImageTooLarge"), "error")}
              />
              <p className="text-xs text-muted-foreground mt-1">{t("blogInlineImageHint")}</p>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={newBlog.published}
                onChange={(e) => setNewBlog({ ...newBlog, published: e.target.checked })}
                className="rounded border-input"
              />
              <span className="text-sm text-foreground">{t("blogFieldPublished")}</span>
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
                {t("cancel")}
              </Button>
              <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("addNew")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("blogDeleteConfirmTitle")}
        description={t("blogDeleteConfirmDesc")}
        confirmLabel={t("delete")}
        danger
      />
    </AdminLayout>
  );
}
