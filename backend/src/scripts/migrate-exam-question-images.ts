/**
 * Merges image URLs from `thematic-questions/` and `exam-questions/` (repo root)
 * into `backend/data/exam-questions.store.json` as `imageUrl` (store schema;
 * source JSON uses `image`).
 *
 * Usage:
 *   npx tsx src/scripts/migrate-exam-question-images.ts [--dry-run] [--apply-image-conflicts]
 *
 * - Creates `exam-questions.store.backup.json` beside the store before writing.
 * - Duplicate normalized question texts: disambiguate by correct answer, then
 *   by full options signature; otherwise logged as ambiguous (no auto-apply).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

type RawQuestion = {
  question?: string;
  options?: unknown;
  correct_answer?: string;
  image?: string;
};

type SourceEntry = {
  image: string;
  normCorrect: string;
  normOptionsSig: string;
  groupTitle: string;
  file: string;
};

type StoreQuestion = Record<string, unknown> & {
  id?: string;
  text?: Record<string, string>;
  options?: Record<string, string[]>;
  correctIndex?: number;
  topicId?: string;
  category?: string;
  imageUrl?: string | null;
};

type StoreFile = {
  questions: StoreQuestion[];
  meta?: {
    thematicCardQuestionIds?: unknown;
    examCardQuestionIds?: unknown;
  };
};

function buildQuestionOriginSets(meta: StoreFile['meta']): {
  thematicIds: Set<string>;
  examIds: Set<string>;
} {
  const thematicIds = new Set<string>();
  const examIds = new Set<string>();
  const them = meta?.thematicCardQuestionIds;
  const ex = meta?.examCardQuestionIds;
  if (Array.isArray(them)) {
    for (const row of them) {
      if (!Array.isArray(row)) continue;
      for (const id of row) {
        if (typeof id === 'string' && id.trim()) thematicIds.add(id.trim());
      }
    }
  }
  if (Array.isArray(ex)) {
    for (const row of ex) {
      if (!Array.isArray(row)) continue;
      for (const id of row) {
        if (typeof id === 'string' && id.trim()) examIds.add(id.trim());
      }
    }
  }
  return { thematicIds, examIds };
}

function filterCandidatesBySourcePool(
  questionId: string,
  candidates: SourceEntry[],
  thematicIds: Set<string>,
  examIds: Set<string>,
): SourceEntry[] {
  const inT = thematicIds.has(questionId);
  const inE = examIds.has(questionId);
  const isThematicFile = (c: SourceEntry) => /[\\/]thematic-questions[\\/]/i.test(c.file);
  const isExamFile = (c: SourceEntry) => /[\\/]exam-questions[\\/]/i.test(c.file);
  if (inT && !inE) {
    const f = candidates.filter(isThematicFile);
    return f.length > 0 ? f : candidates;
  }
  if (inE && !inT) {
    const f = candidates.filter(isExamFile);
    return f.length > 0 ? f : candidates;
  }
  return candidates;
}

function isExamSourceFile(c: SourceEntry): boolean {
  return /[\\/]exam-questions[\\/]/i.test(c.file);
}


type Report = {
  totalQuestionsChecked: number;
  imageUrlAdded: number;
  imageUrlUpdated: number;
  alreadyHadImageUrl: number;
  alreadyCorrectImageUrl: number;
  unmatchedByText: number;
  matchedNoImageInSource: number;
  ambiguousSkipped: number;
  conflictSkipped: number;
  examImageFallbackForThematic: number;
  suspicious: Array<{
    kind: string;
    questionId?: string;
    detail: string;
  }>;
};

function repoRoot(): string {
  return path.resolve(__dirname, '../../..');
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('hy-AM')
    .replace(/\s+/g, ' ');
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function optionsSignatureFromRaw(options: unknown): string {
  if (!Array.isArray(options)) return '';
  const parts = options.map((o) => normalizeText(safeString(o)));
  return parts.join('\x1f');
}

function storeQuestionTextAm(q: StoreQuestion): string {
  const t = q.text;
  if (t && typeof t.am === 'string') return t.am;
  return '';
}

function storeCorrectText(q: StoreQuestion): string {
  const opts = q.options?.am;
  const ci = q.correctIndex;
  if (!Array.isArray(opts) || typeof ci !== 'number' || ci < 0 || ci >= opts.length) return '';
  return safeString(opts[ci]);
}

function storeOptionsSignature(q: StoreQuestion): string {
  const opts = q.options?.am;
  if (!Array.isArray(opts)) return '';
  return opts.map((o) => normalizeText(safeString(o))).join('\x1f');
}

async function collectJsonFiles(rootDir: string): Promise<string[]> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(rootDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out: string[] = [];
  for (const e of entries) {
    const p = path.join(rootDir, e.name);
    if (e.isDirectory()) {
      out.push(...(await collectJsonFiles(p)));
    } else if (e.isFile() && e.name.toLowerCase().endsWith('.json')) {
      out.push(p);
    }
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function pushQuestionsFromRaw(
  rows: RawQuestion[],
  groupTitle: string,
  file: string,
  bucket: Map<string, SourceEntry[]>,
): void {
  for (const row of rows) {
    const qText = safeString(row.question);
    if (!qText) continue;
    const normQ = normalizeText(qText);
    if (!normQ) continue;
    const opts = Array.isArray(row.options) ? row.options.map((o) => safeString(o)).filter(Boolean) : [];
    const entry: SourceEntry = {
      image: safeString(row.image).trim(),
      normCorrect: normalizeText(safeString(row.correct_answer)),
      normOptionsSig: optionsSignatureFromRaw(row.options),
      groupTitle,
      file,
    };
    const list = bucket.get(normQ) ?? [];
    list.push(entry);
    bucket.set(normQ, list);
  }
}

async function loadSourcesIntoBucket(
  dirs: string[],
  bucket: Map<string, SourceEntry[]>,
): Promise<{ filesRead: number; errors: string[] }> {
  let filesRead = 0;
  const errors: string[] = [];
  for (const dir of dirs) {
    const files = await collectJsonFiles(dir);
    for (const filePath of files) {
      try {
        const raw = await fs.readFile(filePath, 'utf8');
        const data = JSON.parse(raw) as {
          themes?: { theme_name?: string; questions?: RawQuestion[] }[];
          tickets?: { ticket_name?: string; questions?: RawQuestion[] }[];
        };
        if (Array.isArray(data.themes)) {
          for (const th of data.themes) {
            const title = safeString(th.theme_name);
            pushQuestionsFromRaw(Array.isArray(th.questions) ? th.questions : [], title, filePath, bucket);
          }
        }
        if (Array.isArray(data.tickets)) {
          for (const tk of data.tickets) {
            const title = safeString(tk.ticket_name);
            pushQuestionsFromRaw(Array.isArray(tk.questions) ? tk.questions : [], title, filePath, bucket);
          }
        }
        filesRead += 1;
      } catch (e) {
        errors.push(`${filePath}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
  return { filesRead, errors };
}

function pickUniqueCandidate(
  candidates: SourceEntry[],
  storeNormCorrect: string,
  storeNormOptionsSig: string,
): { chosen: SourceEntry | null; reason: 'unique' | 'by_correct' | 'by_options' | 'ambiguous' } {
  if (candidates.length === 1) {
    return { chosen: candidates[0]!, reason: 'unique' };
  }
  const byCorrect = candidates.filter((c) => c.normCorrect === storeNormCorrect && storeNormCorrect);
  if (byCorrect.length === 1) {
    return { chosen: byCorrect[0]!, reason: 'by_correct' };
  }
  const pool = byCorrect.length > 0 ? byCorrect : candidates;
  const byOpts = pool.filter((c) => c.normOptionsSig === storeNormOptionsSig && storeNormOptionsSig);
  if (byOpts.length === 1) {
    return { chosen: byOpts[0]!, reason: 'by_options' };
  }
  if (byOpts.length > 1) {
    const imgs = new Set(byOpts.map((c) => c.image).filter(Boolean));
    if (imgs.size === 1 && byOpts[0]!.image) {
      return { chosen: byOpts[0]!, reason: 'by_options' };
    }
  }
  return { chosen: null, reason: 'ambiguous' };
}

function parseArgs(argv: string[]): { dryRun: boolean; applyImageConflicts: boolean } {
  return {
    dryRun: argv.includes('--dry-run'),
    applyImageConflicts: argv.includes('--apply-image-conflicts'),
  };
}

async function main(): Promise<void> {
  const { dryRun, applyImageConflicts } = parseArgs(process.argv.slice(2));
  const root = repoRoot();
  const storePath = path.join(root, 'backend', 'data', 'exam-questions.store.json');
  const backupPath = path.join(root, 'backend', 'data', 'exam-questions.store.backup.json');
  const sourceDirs = [
    path.join(root, 'thematic-questions'),
    path.join(root, 'exam-questions'),
  ];

  const bucket = new Map<string, SourceEntry[]>();
  const { filesRead, errors } = await loadSourcesIntoBucket(sourceDirs, bucket);

  const storeRaw = await fs.readFile(storePath, 'utf8');
  const store = JSON.parse(storeRaw) as StoreFile;
  if (!Array.isArray(store.questions)) {
    throw new Error('Invalid store: questions must be an array');
  }

  const report: Report = {
    totalQuestionsChecked: 0,
    imageUrlAdded: 0,
    imageUrlUpdated: 0,
    alreadyHadImageUrl: 0,
    alreadyCorrectImageUrl: 0,
    unmatchedByText: 0,
    matchedNoImageInSource: 0,
    ambiguousSkipped: 0,
    conflictSkipped: 0,
    examImageFallbackForThematic: 0,
    suspicious: [],
  };

  const { thematicIds, examIds } = buildQuestionOriginSets(store.meta);

  for (const q of store.questions) {
    report.totalQuestionsChecked += 1;
    const id = safeString(q.id);
    const textAm = storeQuestionTextAm(q);
    const normQ = normalizeText(textAm);
    const storeCorrect = storeCorrectText(q);
    const storeNormCorrect = normalizeText(storeCorrect);
    const storeSig = storeOptionsSignature(q);

    const existingUrl =
      typeof q.imageUrl === 'string' && q.imageUrl.trim() ? q.imageUrl.trim() : '';
    if (existingUrl) {
      report.alreadyHadImageUrl += 1;
    }

    let candidates = normQ ? (bucket.get(normQ) ?? []) : [];
    if (candidates.length === 0) {
      report.unmatchedByText += 1;
      continue;
    }

    candidates = filterCandidatesBySourcePool(id, candidates, thematicIds, examIds);

    const { chosen: primaryChosen } = pickUniqueCandidate(candidates, storeNormCorrect, storeSig);
    if (!primaryChosen) {
      report.ambiguousSkipped += 1;
      const preview = textAm.length > 90 ? `${textAm.slice(0, 90).replace(/\s+/g, ' ')}…` : textAm.replace(/\s+/g, ' ');
      report.suspicious.push({
        kind: 'ambiguous_match',
        questionId: id,
        detail: `${preview} | candidates=${candidates.length} files=${[...new Set(candidates.map((c) => c.file))].slice(0, 6).join('; ')}`,
      });
      continue;
    }

    let chosen = primaryChosen;
    let srcImage = chosen.image;

    const thematicOnly = thematicIds.has(id) && !examIds.has(id);
    if (!srcImage.trim() && thematicOnly) {
      const full = bucket.get(normQ) ?? [];
      const examOnly = full.filter(isExamSourceFile);
      const examPick = pickUniqueCandidate(examOnly, storeNormCorrect, storeSig);
      if (examPick.chosen?.image.trim()) {
        chosen = examPick.chosen;
        srcImage = chosen.image.trim();
        report.examImageFallbackForThematic += 1;
      }
    }

    if (!srcImage.trim()) {
      report.matchedNoImageInSource += 1;
      continue;
    }

    if (existingUrl) {
      if (existingUrl === srcImage) {
        report.alreadyCorrectImageUrl += 1;
        continue;
      }
      if (!applyImageConflicts) {
        report.conflictSkipped += 1;
        report.suspicious.push({
          kind: 'image_conflict',
          questionId: id,
          detail: `store=${existingUrl.slice(0, 72)}… vs source=${srcImage.slice(0, 72)}…`,
        });
        continue;
      }
      q.imageUrl = srcImage;
      report.imageUrlUpdated += 1;
      continue;
    }

    q.imageUrl = srcImage;
    report.imageUrlAdded += 1;
  }

  console.log('--- migrate-exam-question-images ---');
  console.log(`Source JSON files read: ${filesRead}`);
  if (errors.length) {
    console.log(`Source read errors (${errors.length}):`);
    for (const e of errors.slice(0, 20)) console.log(`  ${e}`);
    if (errors.length > 20) console.log(`  … and ${errors.length - 20} more`);
  }
  const couldNotMatch = report.unmatchedByText + report.ambiguousSkipped;
  console.log(JSON.stringify({ ...report, couldNotMatchForImage: couldNotMatch }, null, 2));
  if (report.suspicious.length) {
    const cap = 80;
    console.log(`Suspicious / ambiguous (showing up to ${cap} of ${report.suspicious.length}):`);
    for (const row of report.suspicious.slice(0, cap)) {
      console.log(`  [${row.kind}] id=${row.questionId ?? '?'} ${row.detail}`);
    }
  }

  if (dryRun) {
    console.log('[dry-run] No backup written; store unchanged.');
    return;
  }

  await fs.copyFile(storePath, backupPath);
  const json = `${JSON.stringify(store, null, 2)}\n`;
  JSON.parse(json);
  await fs.writeFile(storePath, json, 'utf8');
  console.log(`Backup: ${backupPath}`);
  console.log(`Wrote store: ${storePath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
