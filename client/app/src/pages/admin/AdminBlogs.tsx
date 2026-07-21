import { FormEvent, useCallback, useEffect, useId, useMemo, useState } from "react";
import AdminLayout from "src/components/AdminLayout";
import AdminTableScroll from "src/components/AdminTableScroll";
import AdminTableRowActions, { AdminTableRowContextMenu } from "src/components/AdminTableRowActions";
import { useLang } from "src/lib/i18n";
import { useToast } from "src/lib/toast";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { AppModal } from "src/components/AppModal";
import ConfirmDialog from "src/components/ConfirmDialog";
import DataTableToolbar from "src/components/DataTableToolbar";
import CsvExportButton from "src/components/CsvExportButton";
import TableColumnFilter, { TableColumnHeaderWithFilter } from "src/components/TableColumnFilter";
import PanelPageHeader from "src/components/PanelPageHeader";
import { Plus, Edit2, Trash2, ImageIcon, Newspaper } from "lucide-react";
import {
  slugify,
  ensureUniqueSlug,
  normalizeBlogSlug,
  isValidBlogSlug,
  type Blog,
} from "src/lib/blogs";
import { getApiErrorMessage, vivaApiJson } from "src/lib/vivaApi";
import { isRichTextEmpty } from "src/lib/blogHtml";
import { uploadStaffImageFile } from "src/lib/staffImageUpload";
import RichTextEditor, { BLOG_INLINE_IMAGE_MAX_BYTES } from "src/components/RichTextEditor";
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

export default function AdminBlogs() {
  const editBlogFormId = useId();
  const addBlogFormId = useId();
  const { t } = useLang();
  const { showToast } = useToast();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editBlog, setEditBlog] = useState<Blog | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addFormKey, setAddFormKey] = useState(0);
  const [newBlog, setNewBlog] = useState({
    title: "",
    slug: "",
    /** When true, title changes no longer overwrite the slug field. */
    slugManual: false,
    excerpt: "",
    bodyHtml: "<p></p>",
    coverImage: null as string | null,
    published: true,
  });

  const refresh = useCallback(async () => {
    try {
      const data = await vivaApiJson<Blog[]>("/blogs/admin/all");
      setBlogs(Array.isArray(data) ? data : []);
    } catch (e) {
      setBlogs([]);
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    }
  }, [showToast, t]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setListLoading(true);
      try {
        const data = await vivaApiJson<Blog[]>("/blogs/admin/all");
        if (!cancelled) setBlogs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setBlogs([]);
          showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast, t]);

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

  const openEditBlog = (b: Blog) => {
    const slug = isValidBlogSlug(b.slug)
      ? b.slug
      : (() => {
          const fromTitle = slugify(b.title.trim());
          return fromTitle !== "post" ? fromTitle : "";
        })();
    setEditBlog({ ...b, slug });
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await vivaApiJson(`/blogs/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      await refresh();
      setDeleteId(null);
      showToast(t("blogDeletedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    }
  };

  const handleEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editBlog) return;
    if (!editBlog.title.trim() || isRichTextEmpty(editBlog.bodyHtml)) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const slug = normalizeBlogSlug(editBlog.slug);
    if (!isValidBlogSlug(slug)) {
      showToast(t("blogSlugInvalid"), "error");
      return;
    }
    try {
      await vivaApiJson(`/blogs/${encodeURIComponent(editBlog.id)}`, {
        method: "PATCH",
        body: {
          slug: ensureUniqueSlug(slug, blogs, editBlog.id),
          title: editBlog.title.trim(),
          excerpt: editBlog.excerpt.trim(),
          bodyHtml: editBlog.bodyHtml,
          coverImage: editBlog.coverImage,
          published: editBlog.published,
          publishedAt: editBlog.publishedAt,
        },
      });
      await refresh();
      setEditBlog(null);
      showToast(t("blogUpdatedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBlog.title.trim() || isRichTextEmpty(newBlog.bodyHtml)) {
      showToast(t("fillRequired"), "error");
      return;
    }
    const slug = normalizeBlogSlug(newBlog.slug);
    if (!isValidBlogSlug(slug)) {
      showToast(t("blogSlugInvalid"), "error");
      return;
    }
    try {
      await vivaApiJson("/blogs", {
        method: "POST",
        body: {
          slug: ensureUniqueSlug(slug, blogs),
          title: newBlog.title.trim(),
          excerpt: newBlog.excerpt.trim(),
          bodyHtml: newBlog.bodyHtml,
          coverImage: newBlog.coverImage,
          published: newBlog.published,
        },
      });
      await refresh();
      setAddOpen(false);
      setNewBlog({
        title: "",
        slug: "",
        slugManual: false,
        excerpt: "",
        bodyHtml: "<p></p>",
        coverImage: null,
        published: true,
      });
      showToast(t("blogCreatedToast"), "success");
    } catch (e) {
      showToast(getApiErrorMessage(e) || t("couldNotLoadData"), "error");
    }
  };

  const onCoverFile = async (file: File | undefined, mode: "new" | "edit") => {
    if (!file) return;
    if (file.size > COVER_MAX_BYTES) {
      showToast(t("blogImageTooLarge"), "error");
      return;
    }
    try {
      const url = await uploadStaffImageFile(file);
      if (mode === "new") setNewBlog((b) => ({ ...b, coverImage: url }));
      else if (editBlog) setEditBlog({ ...editBlog, coverImage: url });
    } catch (e) {
      showToast(getApiErrorMessage(e), "error");
    }
  };

  const resolveBlogInlineImage = async (file: File) => {
    if (file.size > BLOG_INLINE_IMAGE_MAX_BYTES) {
      throw new Error("too_large");
    }
    return uploadStaffImageFile(file);
  };

  return (
    <AdminLayout>
      <PanelPageHeader
        icon={Newspaper}
        title={t("blogsAdmin")}
        subtitle={t("adminBlogsPageSubtitle")}
        actions={
        <Button
          onClick={() => {
            setNewBlog({
              title: "",
              slug: "",
              slugManual: false,
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
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden min-w-0">
        <DataTableToolbar value={search} onChange={setSearch} placeholder={`${t("search")}…`}>
          <CsvExportButton
            filename="admin-blogs.csv"
            headers={[t("blogColTitle"), t("blogColSlug"), t("blogColExcerpt"), t("date"), t("status")]}
            rows={filtered.map((b) => [
              b.title,
              b.slug,
              b.excerpt || "—",
              new Date(b.publishedAt).toLocaleDateString(),
              b.published ? t("blogPublished") : t("blogDraft"),
            ])}
          />
        </DataTableToolbar>
        <AdminTableScroll>
          <table className="w-full text-sm min-w-[48rem]">
            <thead className="bg-muted/40">
              <tr>
                <TableColumnHeaderWithFilter title={t("blogColTitle")} />
                <TableColumnHeaderWithFilter title={t("blogColSlug")} />
                <TableColumnHeaderWithFilter title={t("blogColExcerpt")} />
                <TableColumnHeaderWithFilter title={t("date")} />
                <TableColumnHeaderWithFilter
                  title={t("status")}
                  filter={
                    <TableColumnFilter
                      value={statusFilter}
                      onChange={(v) => setStatusFilter(v as "all" | "published" | "draft")}
                      ariaLabel={t("filterByStatus")}
                      options={[
                        { value: "all", label: t("filterOptionAll") },
                        { value: "published", label: t("blogPublished") },
                        { value: "draft", label: t("blogDraft") },
                      ]}
                    />
                  }
                />
                <TableColumnHeaderWithFilter title={t("actions")} align="end" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {listLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    {t("loading")}
                  </td>
                </tr>
              ) : (
              filtered.map((b) => (
                <AdminTableRowContextMenu
                  key={b.id}
                  actions={[
                    {
                      kind: "item",
                      id: "edit",
                      label: t("edit"),
                      icon: Edit2,
                      onClick: () => openEditBlog(b),
                    },
                    {
                      kind: "item",
                      id: "delete",
                      label: t("delete"),
                      icon: Trash2,
                      destructive: true,
                      onClick: () => setDeleteId(b.id),
                    },
                  ]}
                >
                  <tr className="hover:bg-muted/30 transition-colors">
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
                      <AdminTableRowActions
                        toolbarOnly
                        actions={[
                          {
                            kind: "item",
                            id: "edit",
                            label: t("edit"),
                            icon: Edit2,
                            onClick: () => openEditBlog(b),
                          },
                          {
                            kind: "item",
                            id: "delete",
                            label: t("delete"),
                            icon: Trash2,
                            destructive: true,
                            onClick: () => setDeleteId(b.id),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                </AdminTableRowContextMenu>
              ))
              )}
            </tbody>
          </table>
        </AdminTableScroll>
      </div>

      <AppModal
        open={!!editBlog}
        onOpenChange={(o) => !o && setEditBlog(null)}
        title={t("blogEditTitle")}
        contentClassName="max-w-3xl max-h-[92vh]"
        footer={
          editBlog ? (
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditBlog(null)}>
                {t("cancel")}
              </Button>
              <Button type="submit" form={editBlogFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
                {t("save")}
              </Button>
            </div>
          ) : null
        }
      >
        {editBlog && (
          <form id={editBlogFormId} onSubmit={handleEdit} className="space-y-4">
              <div>
                <Label className="text-muted-foreground">{t("blogFieldTitle")} *</Label>
                <Input
                  value={editBlog.title}
                  onChange={(e) => setEditBlog({ ...editBlog, title: e.target.value })}
                  className="h-10 mt-1"
                />
              </div>

              <div>
                <Label className="text-muted-foreground">{t("blogFieldSlug")} *</Label>
                <Input
                  value={editBlog.slug}
                  onChange={(e) =>
                    setEditBlog({ ...editBlog, slug: normalizeBlogSlug(e.target.value) })
                  }
                  className="h-10 mt-1 font-mono text-sm"
                  placeholder="driving-tips"
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  {t("blogSlugHint")}
                </p>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {t("blogSlugAuto")}: /blogs/{editBlog.slug || "…"}
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
                  resolveUploadedImageSrc={resolveBlogInlineImage}
                  onImageTooLarge={() => showToast(t("blogImageTooLarge"), "error")}
                  onInsertImageError={(e) => showToast(getApiErrorMessage(e), "error")}
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
          </form>
        )}
      </AppModal>

      <AppModal
        open={addOpen}
        onOpenChange={setAddOpen}
        title={t("blogNewTitle")}
        contentClassName="max-w-3xl max-h-[92vh]"
        footer={
          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" form={addBlogFormId} className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground">
              {t("addNew")}
            </Button>
          </div>
        }
      >
        <form id={addBlogFormId} onSubmit={handleAdd} className="space-y-4">
            <div>
              <Label className="text-muted-foreground">{t("blogFieldTitle")} *</Label>
              <Input
                value={newBlog.title}
                onChange={(e) => {
                  const title = e.target.value;
                  setNewBlog((b) => {
                    if (b.slugManual) return { ...b, title };
                    const auto = slugify(title);
                    const hasLatin = /[a-z0-9]/i.test(title);
                    return {
                      ...b,
                      title,
                      slug: auto === "post" && !hasLatin ? "" : auto,
                    };
                  });
                }}
                className="h-10 mt-1"
              />
            </div>

            <div>
              <Label className="text-muted-foreground">{t("blogFieldSlug")} *</Label>
              <Input
                value={newBlog.slug}
                onChange={(e) =>
                  setNewBlog({
                    ...newBlog,
                    slug: normalizeBlogSlug(e.target.value),
                    slugManual: true,
                  })
                }
                className="h-10 mt-1 font-mono text-sm"
                placeholder="driving-tips"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                {t("blogSlugHint")}
              </p>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {t("blogSlugAuto")}: /blogs/{newBlog.slug || "…"}
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
                resolveUploadedImageSrc={resolveBlogInlineImage}
                onImageTooLarge={() => showToast(t("blogImageTooLarge"), "error")}
                onInsertImageError={(e) => showToast(getApiErrorMessage(e), "error")}
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
        </form>
      </AppModal>

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
