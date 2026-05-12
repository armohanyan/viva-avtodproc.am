import type { Metadata } from "next";
import BlogPost from "src/views/public/BlogPost";
import { fetchBlogBySlugApi, fetchPublishedBlogSlugsApi } from "src/lib/blogsApi";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await fetchPublishedBlogSlugsApi();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogBySlugApi(slug);
  if (!post) {
    /** Avoid `cookies()` / `headers()` here: this route is SSG (`generateStaticParams`) and that triggers `DYNAMIC_SERVER_USAGE` in production. */
    return { title: "Blog post | Վիվա Ավտոդպրոց" };
  }
  return {
    title: post.title,
    description: post.excerpt || post.title,
    openGraph: {
      title: post.title,
      description: post.excerpt || undefined,
      type: "article",
      publishedTime: post.publishedAt,
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  return <BlogPost slug={slug} />;
}
