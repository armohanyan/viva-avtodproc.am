import type { ComponentType } from "react";
import { useMemo } from "react";
import { Facebook, Instagram, Youtube } from "lucide-react";
import type { MarketingPublicDto } from "src/modules/marketing/types";
import { cn } from "src/lib/utils";

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
    </svg>
  );
}

type SocialIcon = ComponentType<{ className?: string }>;

function useMarketingSocialItems(social: MarketingPublicDto["social"] | undefined) {
  return useMemo(() => {
    const s = social;
    const out: { key: string; icon: SocialIcon; href: string; label: string }[] = [];
    const push = (href: string | undefined, icon: SocialIcon, label: string, key: string) => {
      const h = href?.trim();
      if (h) out.push({ key, icon, href: h, label });
    };
    push(s?.instagram, Instagram, "Instagram", "instagram");
    push(s?.facebook, Facebook, "Facebook", "facebook");
    push(s?.tiktok, TikTokIcon, "TikTok", "tiktok");
    push(s?.youtube, Youtube, "YouTube", "youtube");
    return out;
  }, [social]);
}

export function hasMarketingSocialLinks(social: MarketingPublicDto["social"] | undefined): boolean {
  const s = social;
  return [s?.instagram, s?.facebook, s?.tiktok, s?.youtube].some((x) => Boolean(x?.trim()));
}

type MarketingSocialLinksProps = {
  social: MarketingPublicDto["social"] | undefined;
  variant?: "footer" | "page";
  className?: string;
};

export function MarketingSocialLinks({ social, variant = "footer", className }: MarketingSocialLinksProps) {
  const items = useMarketingSocialItems(social);
  if (!items.length) return null;

  const linkClass =
    variant === "footer"
      ? "w-9 h-9 rounded-lg bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors"
      : "w-11 h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-colors";

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      {items.map((item) => (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          aria-label={item.label}
          className={linkClass}
        >
          <item.icon className={variant === "footer" ? "w-4 h-4" : "w-5 h-5"} />
        </a>
      ))}
    </div>
  );
}
