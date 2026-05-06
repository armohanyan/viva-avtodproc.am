import { Op } from 'sequelize';
import {
  addManagedFilenameFromUrl,
  deleteManagedUploadFiles,
  managedFilenamesFromHtml,
} from '../helpers/managed-upload.helper';
import { Blog } from '../models';

export type BlogDto = {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  coverImage: string | null;
  published: boolean;
  publishedAt: string;
};

/** Avoid deleting a disk file if another blog still references that `/upload/…` URL. */
async function filterUploadsUnreferencedByOtherBlogs(
  filenames: string[],
  excludeBlogId: number,
): Promise<string[]> {
  if (filenames.length === 0) return [];
  const out: string[] = [];
  for (const f of filenames) {
    const needle = `/upload/${f}`;
    const n = await Blog.count({
      where: {
        id: { [Op.ne]: excludeBlogId },
        [Op.or]: [
          { coverImage: { [Op.like]: `%${needle}%` } },
          { bodyHtml: { [Op.like]: `%${needle}%` } },
        ],
      },
    });
    if (n === 0) out.push(f);
  }
  return out;
}

function toDto(b: Blog): BlogDto {
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    excerpt: b.excerpt,
    bodyHtml: b.bodyHtml,
    coverImage: b.coverImage ?? null,
    published: b.published,
    publishedAt: b.publishedAt.toISOString(),
  };
}

export default class BlogService {
  static async listAll(): Promise<BlogDto[]> {
    const rows = await Blog.findAll({ order: [['publishedAt', 'DESC']] });
    return rows.map(toDto);
  }

  static async listPublished(): Promise<BlogDto[]> {
    const rows = await Blog.findAll({
      where: { published: true },
      order: [['publishedAt', 'DESC']],
    });
    return rows.map(toDto);
  }

  /** Slug from URL may be over-encoded; decode until stable to match stored unicode slugs. */
  private static decodeSlugParam(slug: string): string {
    let s = slug.trim();
    for (let i = 0; i < 6; i++) {
      if (!/%[0-9A-Fa-f]{2}/.test(s)) break;
      try {
        const next = decodeURIComponent(s);
        if (next === s) break;
        s = next;
      } catch {
        break;
      }
    }
    return s;
  }

  static async getBySlug(slug: string): Promise<BlogDto | null> {
    const raw = slug.trim();
    const decoded = BlogService.decodeSlugParam(raw);
    const candidates = raw === decoded ? [raw] : [decoded, raw];
    for (const s of candidates) {
      const b = await Blog.findOne({ where: { slug: s } });
      if (b) return toDto(b);
    }
    return null;
  }

  static async create(input: {
    slug: string;
    title: string;
    excerpt: string;
    bodyHtml: string;
    coverImage?: string | null;
    published?: boolean;
    publishedAt?: string;
  }): Promise<BlogDto> {
    const row = await Blog.create({
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      bodyHtml: input.bodyHtml,
      coverImage: input.coverImage ?? null,
      published: input.published ?? false,
      publishedAt: input.publishedAt ? new Date(input.publishedAt) : new Date(),
    });
    return toDto(row);
  }

  static async update(
    id: number,
    patch: Partial<{
      slug: string;
      title: string;
      excerpt: string;
      bodyHtml: string;
      coverImage: string | null;
      published: boolean;
      publishedAt: string;
    }>,
  ): Promise<BlogDto | null> {
    const row = await Blog.findByPk(id);
    if (!row) return null;

    const oldCover = row.coverImage ?? null;
    const oldBody = row.bodyHtml;
    const newCover = patch.coverImage !== undefined ? patch.coverImage ?? null : oldCover;
    const newBody = patch.bodyHtml !== undefined ? patch.bodyHtml : oldBody;

    const stillReferenced = new Set<string>();
    addManagedFilenameFromUrl(newCover, stillReferenced);
    for (const f of managedFilenamesFromHtml(newBody)) stillReferenced.add(f);

    const previouslyReferenced = new Set<string>();
    addManagedFilenameFromUrl(oldCover, previouslyReferenced);
    for (const f of managedFilenamesFromHtml(oldBody)) previouslyReferenced.add(f);

    await row.update({
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.excerpt !== undefined ? { excerpt: patch.excerpt } : {}),
      ...(patch.bodyHtml !== undefined ? { bodyHtml: patch.bodyHtml } : {}),
      ...(patch.coverImage !== undefined ? { coverImage: patch.coverImage } : {}),
      ...(patch.published !== undefined ? { published: patch.published } : {}),
      ...(patch.publishedAt !== undefined ? { publishedAt: new Date(patch.publishedAt) } : {}),
    });

    const toRemove = [...previouslyReferenced].filter((f) => !stillReferenced.has(f));
    const safeToRemove = await filterUploadsUnreferencedByOtherBlogs(toRemove, id);
    await deleteManagedUploadFiles(safeToRemove);

    return toDto(row);
  }

  static async remove(id: number): Promise<boolean> {
    const row = await Blog.findByPk(id);
    if (!row) return false;

    const files = new Set<string>();
    addManagedFilenameFromUrl(row.coverImage, files);
    for (const f of managedFilenamesFromHtml(row.bodyHtml)) files.add(f);

    const n = await Blog.destroy({ where: { id } });
    if (n > 0) {
      const safe = await filterUploadsUnreferencedByOtherBlogs([...files], id);
      await deleteManagedUploadFiles(safe);
    }
    return n > 0;
  }
}
