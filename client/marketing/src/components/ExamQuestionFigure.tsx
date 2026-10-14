import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLang } from "src/lib/i18n";

/** Renders an optional exam question illustration (HTTPS or data URL) with click-to-preview. */
export default function ExamQuestionFigure({ url, alt }: { url: string; alt: string }) {
  const { t } = useLang();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [url]);

  useEffect(() => {
    if (!open) return;
    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const lockedScrollers: { el: HTMLElement; overflow: string }[] = [];
    document.querySelectorAll("body *").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      const overflowY = window.getComputedStyle(node).overflowY;
      if (overflowY !== "auto" && overflowY !== "scroll") return;
      lockedScrollers.push({ el: node, overflow: node.style.overflow });
      node.style.overflow = "hidden";
    });

    const preventBackgroundScroll = (event: Event) => {
      event.preventDefault();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      const fromDialogControl =
        event.target instanceof Element && Boolean(event.target.closest("[role='dialog'] button, [role='dialog'] a"));
      if (
        !fromDialogControl &&
        (event.key === " " ||
          event.key === "ArrowUp" ||
          event.key === "ArrowDown" ||
          event.key === "PageUp" ||
          event.key === "PageDown" ||
          event.key === "Home" ||
          event.key === "End")
      ) {
        event.preventDefault();
      }
    };

    document.addEventListener("wheel", preventBackgroundScroll, { capture: true, passive: false });
    document.addEventListener("touchmove", preventBackgroundScroll, { capture: true, passive: false });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      for (const scroller of lockedScrollers) scroller.el.style.overflow = scroller.overflow;
      document.removeEventListener("wheel", preventBackgroundScroll, { capture: true });
      document.removeEventListener("touchmove", preventBackgroundScroll, { capture: true });
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (failed) {
    return (
      <div
        className="mb-5 flex min-h-32 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted/40 px-4 py-8 text-center text-sm text-muted-foreground"
        role="img"
        aria-label={alt}
      >
        {t("examQuizImageUnavailable")}
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-5 w-full flex justify-center cursor-zoom-in transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
        aria-label={t("examQuizOpenImagePreview")}
      >
        <img
          src={url}
          alt={alt}
          className="max-h-[min(16rem,28dvh)] w-auto max-w-full object-contain pointer-events-none sm:max-h-[min(20rem,32dvh)]"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      </button>

      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden overscroll-none bg-black/85 p-3 sm:p-4"
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
                className="flex h-full min-h-0 w-full min-w-0 items-center justify-center overflow-hidden"
                onClick={(event) => event.stopPropagation()}
              >
                <img
                  src={url}
                  alt={alt}
                  className="max-h-[calc(100dvh-1.5rem)] max-w-[calc(100dvw-1.5rem)] object-contain rounded-md shadow-2xl"
                  onError={() => {
                    setFailed(true);
                    setOpen(false);
                  }}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
