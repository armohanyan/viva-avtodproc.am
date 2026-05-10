/**
 * Downloads remote exam question images into `upload/questions/` and rewrites
 * `imageUrl` in `backend/data/exam-questions.store.json` to `/upload/questions/…`.
 *
 * Filenames are `exam-{sha256(url) first 32 hex}.{ext}` so the same remote URL
 * always maps to one file (dedupe, safe re-runs). Static files are already
 * served from `/upload` via `app.ts` (no route change).
 *
 * Run: `npm run mirror:exam-question-images --prefix backend -- [--dry-run]`
 *
 * Backup: `backend/data/exam-questions.store.backup-before-local-images.json`
 */
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

import { STAFF_UPLOAD_DIR } from '../helpers/managed-upload.helper';

type StoreQuestion = Record<string, unknown> & {
  id?: string;
  imageUrl?: string | null;
};

type StoreFile = {
  questions: StoreQuestion[];
  meta?: unknown;
};

const QUESTIONS_SUBDIR = 'questions';
const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 25_000;
const RETRIES = 3;
const RETRY_DELAY_MS = 800;

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);

function repoRoot(): string {
  return path.resolve(__dirname, '../../..');
}

function parseArgs(argv: string[]): { dryRun: boolean } {
  return { dryRun: argv.includes('--dry-run') };
}

function isRemoteHttpUrl(raw: string): boolean {
  const t = raw.trim();
  if (!/^https?:\/\//i.test(t)) return false;
  try {
    const u = new URL(t);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function isAlreadyLocalPath(raw: string): boolean {
  const t = raw.trim();
  return t.startsWith('/upload/');
}

function urlFileStem(url: string): string {
  const h = crypto.createHash('sha256').update(url.trim()).digest('hex').slice(0, 32);
  return `exam-${h}`;
}

function extFromContentType(ct: string | null): string | null {
  if (!ct) return null;
  const base = ct.split(';')[0]?.trim().toLowerCase() ?? '';
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
  };
  return map[base] ?? null;
}

function extFromUrlPathname(urlStr: string): string | null {
  try {
    const p = new URL(urlStr).pathname;
    const m = p.match(/\.(jpe?g|png|gif|webp|svg)$/i);
    if (!m) return null;
    const e = `.${m[1]!.toLowerCase()}`;
    return e === '.jpeg' ? '.jpg' : e;
  } catch {
    return null;
  }
}

function sniffExt(buf: Uint8Array): string | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return '.jpg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return '.png';
  if (buf.length >= 6 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return '.gif';
  if (buf.length >= 12 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) {
    const tag = String.fromCharCode(buf[8] ?? 0, buf[9] ?? 0, buf[10] ?? 0, buf[11] ?? 0);
    if (tag === 'WEBP') return '.webp';
  }
  const head = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, Math.min(256, buf.length))).trimStart();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return '.svg';
  return null;
}

function assertSafeDiskName(name: string): void {
  const base = path.basename(name);
  if (base !== name || !/^exam-[a-f0-9]{32}\.[a-z0-9]+$/i.test(base)) {
    throw new Error(`Unsafe disk name: ${name}`);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function downloadOnce(url: string): Promise<{ buffer: Buffer; ext: string; contentType: string }> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { Accept: 'image/*,*/*;q=0.8' },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      const ct = res.headers.get('content-type');
      if (!ct || !ct.toLowerCase().startsWith('image/')) {
        throw new Error(`Bad content-type: ${ct ?? '(missing)'}`);
      }
      const lenHeader = res.headers.get('content-length');
      if (lenHeader) {
        const n = Number(lenHeader);
        if (Number.isFinite(n) && n > MAX_BYTES) {
          throw new Error(`Content-Length ${n} exceeds max ${MAX_BYTES}`);
        }
      }
      const ab = await res.arrayBuffer();
      if (ab.byteLength > MAX_BYTES) {
        throw new Error(`Body ${ab.byteLength} exceeds max ${MAX_BYTES}`);
      }
      const buffer = Buffer.from(ab);
      let ext = extFromContentType(ct) ?? extFromUrlPathname(url) ?? sniffExt(buffer);
      if (!ext || !ALLOWED_EXT.has(ext)) {
        ext = sniffExt(buffer);
      }
      if (!ext || !ALLOWED_EXT.has(ext)) {
        throw new Error(`Could not determine allowed image extension (Content-Type: ${ct})`);
      }
      return { buffer, ext, contentType: ct.split(';')[0]!.trim() };
    } catch (e) {
      lastErr = e;
      if (attempt < RETRIES) await sleep(RETRY_DELAY_MS * attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

type Stats = {
  totalQuestions: number;
  remoteImageUrlsDistinct: number;
  questionsWithRemoteUrl: number;
  downloadedNewFiles: number;
  reusedExistingFile: number;
  failedDownloads: number;
  questionsUpdated: number;
  skippedAlreadyLocal: number;
  failedUrls: string[];
};

async function main(): Promise<void> {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  const storePath = path.join(root, 'backend', 'data', 'exam-questions.store.json');
  const backupPath = path.join(root, 'backend', 'data', 'exam-questions.store.backup-before-local-images.json');
  const destDir = path.join(STAFF_UPLOAD_DIR, QUESTIONS_SUBDIR);

  const storeRaw = await fs.readFile(storePath, 'utf8');
  const store = JSON.parse(storeRaw) as StoreFile;
  if (!Array.isArray(store.questions)) {
    throw new Error('Invalid store');
  }

  const urlUsage = new Map<string, Set<string>>();
  for (const q of store.questions) {
    const id = typeof q.id === 'string' ? q.id.trim() : '';
    const raw = typeof q.imageUrl === 'string' ? q.imageUrl.trim() : '';
    if (!raw || !isRemoteHttpUrl(raw)) continue;
    if (!id) continue;
    const set = urlUsage.get(raw) ?? new Set<string>();
    set.add(id);
    urlUsage.set(raw, set);
  }

  const stats: Stats = {
    totalQuestions: store.questions.length,
    remoteImageUrlsDistinct: urlUsage.size,
    questionsWithRemoteUrl: [...urlUsage.values()].reduce((a, s) => a + s.size, 0),
    downloadedNewFiles: 0,
    reusedExistingFile: 0,
    failedDownloads: 0,
    questionsUpdated: 0,
    skippedAlreadyLocal: 0,
    failedUrls: [],
  };

  const urlToPublicPath = new Map<string, string>();

  if (!dryRun) {
    await fs.mkdir(destDir, { recursive: true });
  }

  if (dryRun) {
    console.log('--- mirror-exam-question-images-local (dry-run) ---');
    console.log(
      JSON.stringify(
        {
          totalQuestions: stats.totalQuestions,
          remoteImageUrlsDistinct: stats.remoteImageUrlsDistinct,
          questionsWithRemoteUrl: stats.questionsWithRemoteUrl,
          note: 'No HTTP requests, no disk writes, no store changes.',
        },
        null,
        2,
      ),
    );
    return;
  }

  for (const remoteUrl of urlUsage.keys()) {
    const stem = urlFileStem(remoteUrl);
    let diskName = '';
    let publicPath = '';

    const pickExisting = async (): Promise<boolean> => {
      for (const ext of ALLOWED_EXT) {
        const candidate = `${stem}${ext}`;
        assertSafeDiskName(candidate);
        const full = path.join(destDir, candidate);
        try {
          await fs.access(full);
          diskName = candidate;
          publicPath = `/upload/${QUESTIONS_SUBDIR}/${diskName}`;
          return true;
        } catch {
          /* noop */
        }
      }
      return false;
    };

    if (await pickExisting()) {
      urlToPublicPath.set(remoteUrl, publicPath);
      stats.reusedExistingFile += 1;
      continue;
    }

    try {
      const { buffer, ext } = await downloadOnce(remoteUrl);
      diskName = `${stem}${ext}`;
      assertSafeDiskName(diskName);
      const fullPath = path.join(destDir, diskName);
      await fs.writeFile(fullPath, buffer, { mode: 0o644 });
      publicPath = `/upload/${QUESTIONS_SUBDIR}/${diskName}`;
      urlToPublicPath.set(remoteUrl, publicPath);
      stats.downloadedNewFiles += 1;
    } catch (e) {
      stats.failedDownloads += 1;
      stats.failedUrls.push(remoteUrl);
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[mirror-exam-images] FAIL ${remoteUrl}\n  ${msg}`);
    }
  }

  for (const q of store.questions) {
    const raw = typeof q.imageUrl === 'string' ? q.imageUrl.trim() : '';
    if (!raw) continue;
    if (isAlreadyLocalPath(raw)) {
      stats.skippedAlreadyLocal += 1;
      continue;
    }
    if (!isRemoteHttpUrl(raw)) continue;
    const local = urlToPublicPath.get(raw);
    if (!local) continue;
    if (q.imageUrl !== local) {
      q.imageUrl = local;
      stats.questionsUpdated += 1;
    }
  }

  console.log('--- mirror-exam-question-images-local ---');
  console.log(JSON.stringify(stats, null, 2));

  await fs.copyFile(storePath, backupPath);
  const outJson = `${JSON.stringify(store, null, 2)}\n`;
  JSON.parse(outJson);
  await fs.writeFile(storePath, outJson, 'utf8');
  console.log(`Backup written: ${backupPath}`);
  console.log(`Store updated: ${storePath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
