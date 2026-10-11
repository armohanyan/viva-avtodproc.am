import { useEffect, useState } from "react";
import { sameOriginStaffUploadUrl } from "src/lib/sameOriginStaffUploadUrl";

/** Used only after the server confirms there is no uploaded hero image. */
const HERO_IMAGE_FALLBACK = "/home-hero-2.svg";

/**
 * `undefined` means the server value is still unknown — keep the placeholder.
 * `null` or `""` means the server has no image, so the bundled fallback may show.
 * A non-empty string is shown only after that file has decoded, so the page
 * never paints the default and then replaces it.
 */
export function useDeferredHeroBackground(serverUrl: string | null | undefined): {
  src: string | null;
  pending: boolean;
} {
  const target =
    serverUrl === undefined ? null : (sameOriginStaffUploadUrl(serverUrl) ?? HERO_IMAGE_FALLBACK);
  const [src, setSrc] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    const img = new Image();
    const reveal = () => {
      if (cancelled) return;
      setSrc(target);
      setAttempt(target);
    };
    const fail = () => {
      if (!cancelled) setAttempt(target);
    };
    img.onload = reveal;
    img.onerror = fail;
    img.src = target;
    if (img.complete) {
      if (img.naturalWidth > 0) reveal();
      else fail();
    }
    return () => {
      cancelled = true;
    };
  }, [target]);

  const waiting = target == null || attempt !== target;
  const visible = src === target ? src : waiting && src ? src : null;
  return { src: visible, pending: waiting && visible == null };
}

export function heroBackgroundImageStyle(url: string | null): { backgroundImage: string } | undefined {
  if (!url) return undefined;
  const escaped = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return { backgroundImage: `url("${escaped}")` };
}
