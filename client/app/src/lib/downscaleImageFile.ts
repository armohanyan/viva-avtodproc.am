const MAX_UPLOAD_BYTES = 750 * 1024;
const MAX_DIMENSION = 1600;
const QUALITY_STEPS = [0.85, 0.75, 0.65, 0.55, 0.45];

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

/**
 * Phone photos routinely exceed the 800 KB staff upload limit; downscale to a
 * JPEG that fits. Returns the original file when it is already small enough or
 * when the browser cannot decode it (the server will then report the size error).
 */
export async function downscaleImageFileForUpload(file: File): Promise<File> {
  if (file.size <= MAX_UPLOAD_BYTES) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, quality);
      if (blob && blob.size <= MAX_UPLOAD_BYTES) {
        const name = file.name.replace(/\.[a-z0-9]+$/i, "") || "photo";
        return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
      }
    }
    return file;
  } catch {
    return file;
  }
}
