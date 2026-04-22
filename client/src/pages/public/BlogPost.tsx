"use client";

import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { useAppNavigation } from "src/lib/navigation/AppNavigationContext";
import type { Blog } from "src/lib/blogs";
import { fetchBlogBySlugApi } from "src/lib/blogsApi";
import { sanitizeBlogHtml, sanitizeCoverImageUrl } from "src/lib/blogHtml";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";
import { ArrowLeft, Calendar } from "lucide-react";

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

export type BlogPostProps = {
  /** When set (e.g. Next.js `[slug]`), wouter route matching is skipped */
  slug?: string;
};

function BlogPostBody({ slug }: { slug: string }) {
  const { t, lang } = useLang();
  const { MarketingLink } = useAppNavigation();
  const locale = lang === "am" ? "hy-AM" : lang === "ru" ? "ru-RU" : "en-US";
  const [post, setPost] = useState<Blog | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) {
      setPost(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setPost(undefined);
      const p = await fetchBlogBySlugApi(slug);
      if (!cancelled) setPost(p);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (post === undefined) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <section className="py-24 bg-background">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <p className="text-muted-foreground">{t("blogLoading")}</p>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <section className="py-24 bg-background">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">{t("blogPostNotFound")}</h1>
            <MarketingLink href="/blogs" className="text-primary font-medium hover:underline">
              {t("blogBackToList")}
            </MarketingLink>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const cover = sameOriginStaffUploadUrl(sanitizeCoverImageUrl(post.coverImage));
  const html = sanitizeBlogHtml(post.bodyHtml);

  return (
    <div className="min-h-screen">
      <Navbar />

      <article className="bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <MarketingLink
            href="/blogs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {t("blogBackToList")}
          </MarketingLink>

          {cover ? (
            <div className="mb-10 rounded-2xl overflow-hidden border border-border bg-muted aspect-[21/9] max-h-[min(420px,50vh)]">
              <img src={cover} alt="" className="w-full h-full object-cover" />
            </div>
          ) : null}

          <header className="mb-10">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Calendar className="w-4 h-4 shrink-0" aria-hidden />
              <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">{post.title}</h1>
            {post.excerpt ? (
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{post.excerpt}</p>
            ) : null}
          </header>

          <div
            className="prose prose-neutral dark:prose-invert max-w-none text-foreground/90 prose-headings:font-semibold prose-a:text-primary prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </article>

      <Footer />
    </div>
  );
}

function BlogPostWouter() {
  const { navigate } = useAppNavigation();
  const [match, params] = useRoute("/blogs/:slug");
  const slug = match && params?.slug ? params.slug : "";

  useEffect(() => {
    if (!match) {
      navigate("/blogs");
    }
  }, [match, navigate]);

  if (!match) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <section className="py-24 bg-background" aria-hidden />
        <Footer />
      </div>
    );
  }

  return <BlogPostBody slug={slug} />;
}

export default function BlogPost({ slug: slugProp }: BlogPostProps = {}) {
  if (slugProp !== undefined) {
    return <BlogPostBody slug={slugProp} />;
  }
  return <BlogPostWouter />;
}
