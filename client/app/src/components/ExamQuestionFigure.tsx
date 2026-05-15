/** Renders an optional exam question illustration (HTTPS or data URL). */
export default function ExamQuestionFigure({ url, alt }: { url: string; alt: string }) {
  return (
    <div className="mb-5 rounded-xl muted/30 p-3 flex justify-center">
      <img
        src={url}
        alt={alt}
        className="max-h-64 sm:max-h-80 max-w-full w-auto object-contain rounded-md"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}
