import { API_V1_PREFIX } from "src/constants/api.constants";
import { apiJson, ApiRequestError } from "src/lib/api";
import type { Blog } from "src/lib/blogs";

const blogsBase = `${API_V1_PREFIX}/blogs`;

/** Path segments may be over-encoded (`%25` for `%`). Decode until stable so we match DB slugs. */
function fullyDecodeSlugSegment(slug: string): string {
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
    const normalized = fullyDecodeSlugSegment(slug);
    return await apiJson<Blog>(`${blogsBase}/slug/${encodeURIComponent(normalized)}`);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) return null;
    return null;
  }
}

export async function fetchPublishedBlogSlugsApi(): Promise<string[]> {
  const posts = await fetchPublishedBlogsApi();
  return posts.map((p) => p.slug);
}
