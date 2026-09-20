import { BRAND_LOGO_FALLBACK_SRC } from "src/lib/brandLogo";
import { cn } from "src/lib/utils";

type PackagePromoImageProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Extra classes for the image element. */
  imgClassName?: string;
};

/** Package hero/thumb: real promo image, or brand mark when missing/broken. */
export default function PackagePromoImage({ src, alt, className, imgClassName }: PackagePromoImageProps) {
  const url = (src ?? "").trim() || BRAND_LOGO_FALLBACK_SRC;
  const isFallback = url === BRAND_LOGO_FALLBACK_SRC;

  return (
    <div className={cn("relative w-full aspect-[16/10] overflow-hidden bg-muted shrink-0", className)}>
      <img
        src={url}
        alt={alt}
        className={cn(
          "absolute inset-0 w-full h-full",
          isFallback ? "object-contain p-6 sm:p-8" : "object-cover",
          imgClassName,
        )}
        loading="lazy"
        onError={(e) => {
          if (e.currentTarget.src.endsWith(BRAND_LOGO_FALLBACK_SRC)) return;
          e.currentTarget.src = BRAND_LOGO_FALLBACK_SRC;
          e.currentTarget.classList.add("object-contain", "p-6");
          e.currentTarget.classList.remove("object-cover");
        }}
      />
    </div>
  );
}
