"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLang } from "src/lib/i18n";

/** Renders an optional exam question illustration (HTTPS or data URL) with click-to-preview. */
export default function ExamQuestionFigure({ url, alt }: { url: string; alt: string }) {
  const { t } = useLang();
  const titleId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 w-full rounded-xl border border-border bg-muted/30 p-3 flex justify-center cursor-zoom-in transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={t("examQuizOpenImagePreview")}
      >
        <img
          src={url}
          alt={alt}
          className="max-h-64 sm:max-h-80 max-w-full w-auto object-contain rounded-md pointer-events-none"
          loading="lazy"
          decoding="async"
        />
      </button>

      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-1 sm:p-2"
              onClick={() => setOpen(false)}
            >
              <span id={titleId} className="sr-only">
                {alt}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={t("examQuizCloseImagePreview")}
              >
                <X className="h-5 w-5" />
              </button>
              <div
                className="flex h-[98vh] w-[98vw] items-center justify-center"
                onClick={(event) => event.stopPropagation()}
              >
                <img
                  src={url}
                  alt={alt}
                  className="h-full w-full max-h-full max-w-full object-contain rounded-md shadow-2xl"
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
