import { API_V1_PREFIX } from "src/constants/api.constants";
import { apiJson, ApiRequestError } from "src/lib/api";
import type { Blog } from "src/lib/blogs";

const blogsBase = `${API_V1_PREFIX}/blogs`;

export async function fetchPublishedBlogsApi(): Promise<Blog[]> {
  try {
    const data = await apiJson<Blog[]>(`${blogsBase}/published`);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchBlogBySlugApi(slug: string): Promise<Blog | null> {
  try {
    return await apiJson<Blog>(`${blogsBase}/slug/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) return null;
    return null;
  }
}

export async function fetchPublishedBlogSlugsApi(): Promise<string[]> {
  const posts = await fetchPublishedBlogsApi();
  return posts.map((p) => p.slug);
}
