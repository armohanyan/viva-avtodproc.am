import fs from 'fs/promises';
import path from 'path';
import { LoggerUtil } from '../utils';

export const STAFF_UPLOAD_DIR = path.join(process.cwd(), 'upload');

/** Matches filenames produced by staff image upload (`toString(36)` prefix + 16 hex chars + ext). */
export const MANAGED_UPLOAD_FILENAME_RE = /^[0-9a-z]+-[a-f0-9]{16}\.(png|jpe?g|gif|webp)$/i;

export function managedFilenameFromUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const t = url.trim();
  if (!t) return null;
  try {
    const u = new URL(t, 'http://upload.local');
    const m = u.pathname.match(/^\/upload\/([^/]+)$/i);
    if (!m) return null;
    const name = m[1];
    return MANAGED_UPLOAD_FILENAME_RE.test(name) ? name : null;
  } catch {
    return null;
  }
}

export function collectImgSrcs(html: string | null | undefined): string[] {
  if (!html) return [];
  const out: string[] = [];
  const re = /<img\b[^>]*\bsrc\s*=\s*(["'])([^"']*)\1/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    out.push(m[2]);
  }
  return out;
}

export function managedFilenamesFromHtml(html: string | null | undefined): Set<string> {
  const s = new Set<string>();
  for (const src of collectImgSrcs(html)) {
    const f = managedFilenameFromUrl(src);
    if (f) s.add(f);
  }
  return s;
}

export function addManagedFilenameFromUrl(url: string | null | undefined, into: Set<string>): void {
  const f = managedFilenameFromUrl(url);
  if (f) into.add(f);
}

export async function deleteManagedUploadFile(filename: string): Promise<void> {
  if (!MANAGED_UPLOAD_FILENAME_RE.test(filename)) return;
  const base = path.basename(filename);
  if (base !== filename) return;
  const full = path.join(STAFF_UPLOAD_DIR, base);
  try {
    await fs.unlink(full);
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return;
    LoggerUtil.warn(`Could not delete upload file ${base}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function deleteManagedUploadFiles(filenames: Iterable<string>): Promise<void> {
  for (const f of filenames) {
    await deleteManagedUploadFile(f);
  }
}
