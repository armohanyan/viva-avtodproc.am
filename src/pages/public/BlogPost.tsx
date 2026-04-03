import { Link, Redirect, useRoute } from "wouter";
import Navbar from "src/components/Navbar";
import Footer from "src/components/Footer";
import { useLang } from "src/lib/i18n";
import { getBlogBySlug } from "src/lib/blogs";
import { sanitizeBlogHtml, sanitizeCoverImageUrl } from "src/lib/blogHtml";
import { ArrowLeft, Calendar } from "lucide-react";

function formatDate(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
}

export default function BlogPost() {
  const { t, lang } = useLang();
  const [match, params] = useRoute("/blogs/:slug");
  const slug = match && params?.slug ? params.slug : "";

  const post = slug ? getBlogBySlug(slug) : undefined;
  const locale = lang === "am" ? "hy-AM" : lang === "ru" ? "ru-RU" : "en-US";

  if (!match) {
    return <Redirect to="/blogs" />;
  }

  if (!post) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <section className="py-24 bg-background">
          <div className="max-w-2xl mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">{t("blogPostNotFound")}</h1>
            <Link href="/blogs" className="text-primary font-medium hover:underline">
              {t("blogBackToList")}
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  const cover = sanitizeCoverImageUrl(post.coverImage);
  const html = sanitizeBlogHtml(post.bodyHtml);

  return (
    <div className="min-h-screen">
      <Navbar />

      <article className="bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <Link
            href="/blogs"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden />
            {t("blogBackToList")}
          </Link>

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
