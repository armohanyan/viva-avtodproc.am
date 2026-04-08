"use client";

import { useEffect, useState } from "react";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { loadPublishedBlogs, type Blog } from "src/lib/blogs";
import { sanitizeCoverImageUrl } from "src/lib/blogHtml";
import { Calendar, ArrowRight, ImageIcon } from "lucide-react";
import { Reveal } from "src/lib/motion";

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

export default function Blogs() {
  const { t, lang } = useLang();
  const [posts, setPosts] = useState<Blog[]>(() => loadPublishedBlogs());

  useEffect(() => {
    const refresh = () => setPosts(loadPublishedBlogs());
    window.addEventListener("viva-blogs-updated", refresh);
    return () => window.removeEventListener("viva-blogs-updated", refresh);
  }, []);

  const locale = lang === "am" ? "hy-AM" : lang === "ru" ? "ru-RU" : "en-US";

  return (
    <div className="min-h-screen">
      <Navbar />

      <section className="bg-hero text-hero-foreground py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-primary font-semibold text-sm uppercase tracking-wider mb-3">{t("blogsEyebrow")}</p>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">{t("blogsTitle")}</h1>
          <p className="text-hero-foreground/80 text-lg max-w-2xl leading-relaxed">{t("blogsSub")}</p>
        </div>
      </section>

      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {posts.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">{t("blogNoPosts")}</p>
          ) : (
            <div className="grid gap-8 md:grid-cols-2">
              {posts.map((post, i) => {
                const cover = sanitizeCoverImageUrl(post.coverImage);
                return (
                  <Reveal key={post.id} delay={i * 0.06}>
                    <article className="group rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:border-primary/30 hover:shadow-md transition-all h-full flex flex-col">
                      <div className="aspect-[16/9] bg-muted border-b border-border overflow-hidden">
                        {cover ? (
                          <img
                            src={cover}
                            alt=""
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <ImageIcon className="w-12 h-12 opacity-40" aria-hidden />
                          </div>
                        )}
                      </div>
                      <div className="p-6 sm:p-8 flex flex-col flex-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                          <Calendar className="w-4 h-4 shrink-0" aria-hidden />
                          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt, locale)}</time>
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                          <a
                            href={`/blogs/${post.slug}`}
                            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                          >
                            {post.title}
                          </a>
                        </h2>
                        <p className="text-muted-foreground leading-relaxed flex-1 mb-6">{post.excerpt}</p>
                        <a
                          href={`/blogs/${post.slug}`}
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                        >
                          {t("blogReadMore")}
                          <ArrowRight className="w-4 h-4" aria-hidden />
                        </a>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
