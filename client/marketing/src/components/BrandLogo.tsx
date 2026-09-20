import type { ImgHTMLAttributes } from "react";
import { useLang } from "src/lib/i18n";
import { useTheme } from "src/lib/theme";
import {
  brandLogoSrc,
  type BrandLogoLayout,
  type BrandLogoTone,
} from "src/lib/brandLogo";
import { cn } from "src/lib/utils";

type BrandLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  layout?: BrandLogoLayout;
  /** `auto` follows theme; use `on-dark` on hero / dark sidebars. */
  tone?: BrandLogoTone;
};

const layoutClass: Record<BrandLogoLayout, string> = {
  horizontal: "h-9 w-auto max-w-[11.5rem] sm:h-10 sm:max-w-[13rem]",
  vertical: "h-16 w-auto max-w-[9rem]",
  mark: "h-8 w-auto max-w-[3.25rem]",
};

export default function BrandLogo({
  layout = "horizontal",
  tone = "auto",
  alt,
  className,
  ...rest
}: BrandLogoProps) {
  const { t, lang } = useLang();
  const { theme } = useTheme();
  const src = brandLogoSrc({ lang, theme, layout, tone });

  return (
    <img
      src={src}
      alt={alt ?? t("brandName")}
      decoding="async"
      className={cn("object-contain shrink-0", layoutClass[layout], className)}
      {...rest}
    />
  );
}
