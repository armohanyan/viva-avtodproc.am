import type { Metadata } from "next";
import BlogPost from "src/pages/public/BlogPost";
import { getPublishedSeedBlogSlugs, getSeedBlogBySlug } from "src/lib/blogs";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return getPublishedSeedBlogSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getSeedBlogBySlug(slug);
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
