import type { Metadata } from "next";
import BlogPost from "src/views/public/BlogPost";
import { sanitizeCoverImageUrl } from "src/lib/blogHtml";
import { fetchBlogBySlugApi } from "src/lib/blogsApi";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";
import { JsonLd } from "@/components/JsonLd";
import { buildBlogPostJsonLd } from "@/lib/jsonLd";
import { DEFAULT_OG_IMAGE } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

/** Force dynamic: root layout reads cookies/headers via getRequestSeoLang(); SSG + that combo throws DYNAMIC_SERVER_USAGE (500) in production. */
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchBlogBySlugApi(slug);
  if (!post) {
    return {
      title: { absolute: "Blog post | Վիվա Ավտոդպրոց" },
      robots: { index: false, follow: false },
    };
  }

  const description = post.excerpt?.trim() || post.title;
  const coverPath = sameOriginStaffUploadUrl(sanitizeCoverImageUrl(post.coverImage));
  const ogImage =
    coverPath && !coverPath.startsWith("data:")
      ? absoluteUrl(coverPath)
      : DEFAULT_OG_IMAGE;
  const canonical = `/blogs/${post.slug}`;

  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description,
      type: "article",
      publishedTime: post.publishedAt,
      url: canonical,
      images: [{ url: ogImage, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [ogImage],
    },
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  const post = await fetchBlogBySlugApi(slug);
  const coverPath = post
    ? sameOriginStaffUploadUrl(sanitizeCoverImageUrl(post.coverImage))
    : null;
  const jsonLd = post
    ? buildBlogPostJsonLd({
        title: post.title,
        description: post.excerpt?.trim() || post.title,
        slug: post.slug,
        publishedAt: post.publishedAt,
        coverImage: coverPath && !coverPath.startsWith("data:") ? coverPath : null,
      })
    : null;

  return (
    <>
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <BlogPost slug={slug} />
    </>
  );
}
