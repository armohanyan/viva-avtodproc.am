import { BRAND_LOGO_FALLBACK_SRC } from "src/lib/brandLogo";
import { cn } from "src/lib/utils";

type PackagePromoImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Extra classes for the image element. */
  imgClassName?: string;
  /** Shorter frame and tighter padding around the fallback brand mark. */
  compact?: boolean;
};

/** Package hero/thumb: real promo image, or brand mark when missing/broken. */
export default function PackagePromoImage({ src, alt, className, imgClassName, compact }: PackagePromoImageProps) {
  const url = (src ?? "").trim() || BRAND_LOGO_FALLBACK_SRC;
  const isFallback = url === BRAND_LOGO_FALLBACK_SRC;
  const fallbackPadding = compact ? "p-3 sm:p-4" : "p-6 sm:p-8";

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden bg-muted shrink-0",
        compact ? "aspect-[16/7]" : "aspect-[16/10]",
        className,
      )}
    >
      <img
        src={url}
        alt={alt}
        className={cn(
          "absolute inset-0 w-full h-full",
          isFallback ? `object-contain ${fallbackPadding}` : "object-cover",
          imgClassName,
        )}
        loading="lazy"
        onError={(e) => {
          if (e.currentTarget.src.endsWith(BRAND_LOGO_FALLBACK_SRC)) return;
          e.currentTarget.src = BRAND_LOGO_FALLBACK_SRC;
          e.currentTarget.classList.add("object-contain", compact ? "p-3" : "p-6");
          e.currentTarget.classList.remove("object-cover");
        }}
      />
    </div>
  );
}
