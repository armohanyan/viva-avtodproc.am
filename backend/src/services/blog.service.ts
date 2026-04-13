import { Blog } from '../models';

export type BlogDto = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  bodyHtml: string;
  coverImage: string | null;
  published: boolean;
  publishedAt: string;
};

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

  static async getBySlug(slug: string): Promise<BlogDto | null> {
    const b = await Blog.findOne({ where: { slug, published: true } });
    return b ? toDto(b) : null;
  }

  static async create(input: {
    id?: string;
    slug: string;
    title: string;
    excerpt: string;
    bodyHtml: string;
    coverImage?: string | null;
    published?: boolean;
    publishedAt?: string;
  }): Promise<BlogDto> {
    const id = input.id?.trim() || `blog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    const row = await Blog.create({
      id,
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
    id: string,
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
    await row.update({
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.excerpt !== undefined ? { excerpt: patch.excerpt } : {}),
      ...(patch.bodyHtml !== undefined ? { bodyHtml: patch.bodyHtml } : {}),
      ...(patch.coverImage !== undefined ? { coverImage: patch.coverImage } : {}),
      ...(patch.published !== undefined ? { published: patch.published } : {}),
      ...(patch.publishedAt !== undefined ? { publishedAt: new Date(patch.publishedAt) } : {}),
    });
    return toDto(row);
  }

  static async remove(id: string): Promise<boolean> {
    const n = await Blog.destroy({ where: { id } });
    return n > 0;
  }
}
