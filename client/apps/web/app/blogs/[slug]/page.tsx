import type { Metadata } from "next";
import BlogPost from "src/pages/public/BlogPost";
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
    return { title: "Blog post" };
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
