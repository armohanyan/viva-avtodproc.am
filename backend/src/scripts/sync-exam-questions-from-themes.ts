import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

type SourceQuestion = {
  question?: string;
  options?: unknown;
  correct_answer?: string;
  explanation?: string;
};

type SourceTheme = {
  theme_name?: string;
  questions?: SourceQuestion[];
};

type SourceFileShape = {
  themes?: SourceTheme[];
};

type LocalizedString = {
  en?: string;
  ru?: string;
  am?: string;
  [key: string]: unknown;
};

type LocalizedStringArray = {
  en?: string[];
  ru?: string[];
  am?: string[];
  [key: string]: unknown;
};

type StoreQuestion = {
  id: string;
  text?: LocalizedString;
  options?: LocalizedStringArray;
  correctIndex?: number;
  category?: string;
  topicId?: string;
  explanation?: string;
  [key: string]: unknown;
};

type StoreData = {
  questions?: StoreQuestion[];
  meta?: {
    thematicCardTitles?: string[];
    thematicCardQuestionIds?: string[][];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type Args = {
  source: string;
  store: string;
  dryRun: boolean;
};

type Stats = {
  topicFilesFound: number;
  sourceTopicsFound: number;
  matchedTopics: number;
  missingTopics: number;
  questionsUpdated: number;
  questionsInserted: number;
  questionsSkipped: number;
  orphanedQuestions: number;
  unmatchedTopicTitles: string[];
  orphanedQuestionsByTopic: Array<{ topicTitle: string; questions: string[] }>;
};

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

function parseArgs(argv: string[]): Args {
  let source = '';
  let store = '';
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--source') {
      source = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    if (arg === '--store') {
      store = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
  }

  // Resolve relative paths from repo root so CLI usage works
  // whether invoked from `/` or from `backend/`.
  const repoRoot = path.resolve(__dirname, '../../..');

  const resolveFromRepoRoot = (p: string) => {
    if (!p) return p;
    return path.isAbsolute(p) ? p : path.resolve(repoRoot, p);
  };

  const defaultSource = pickFirstExistingPath([
    path.resolve(repoRoot, 'theme-questions'),
    path.resolve(repoRoot, '../theme-questions'),
  ]);
  const defaultStore = pickFirstExistingPath([
    path.resolve(repoRoot, 'backend/data/exam-questions.store.json'),
    path.resolve(repoRoot, 'data/exam-questions.store.json'),
  ]);

  return {
    source: source ? resolveFromRepoRoot(source) : defaultSource,
    store: store ? resolveFromRepoRoot(store) : defaultStore,
    dryRun,
  };
}

function pickFirstExistingPath(candidates: string[]): string {
  for (const candidate of candidates) {
    try {
      // eslint-disable-next-line no-sync
      require('node:fs').accessSync(candidate);
      return candidate;
    } catch {
      // noop
    }
  }
  return candidates[0] ?? '';
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content) as T;
}

async function loadSourceThemes(sourceDir: string): Promise<{ files: string[]; themes: SourceTheme[] }> {
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.json'))
    .map((entry) => path.join(sourceDir, entry.name))
    .sort((a, b) => a.localeCompare(b));

  const themes: SourceTheme[] = [];
  for (const filePath of files) {
    const fileData = await readJsonFile<SourceFileShape>(filePath);
    const fileThemes = Array.isArray(fileData.themes) ? fileData.themes : [];
    themes.push(...fileThemes);
  }

  return { files, themes };
}

function resolveCorrectIndex(options: string[], correctAnswer: string): number {
  const normalizedCorrect = normalizeText(correctAnswer);
  if (!normalizedCorrect) {
    return -1;
  }
  const idx = options.findIndex((option) => normalizeText(option) === normalizedCorrect);
  return idx;
}

function updateExplanationField(existing: StoreQuestion, sourceExplanation: string): StoreQuestion {
  if (!sourceExplanation) return existing;
  return { ...existing, explanation: sourceExplanation };
}

function buildInsertedQuestion(params: {
  sourceQuestion: SourceQuestion;
  topicId: string;
  category: string;
}): StoreQuestion | null {
  const questionText = safeString(params.sourceQuestion.question);
  const options = Array.isArray(params.sourceQuestion.options)
    ? params.sourceQuestion.options.map((opt) => safeString(opt))
    : [];
  if (!questionText || options.length === 0) {
    return null;
  }

  const correctIndex = resolveCorrectIndex(options, safeString(params.sourceQuestion.correct_answer));
  const created: StoreQuestion = {
    id: `q-${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`,
    text: { en: '', ru: '', am: questionText },
    options: { en: options.map(() => ''), ru: options.map(() => ''), am: options },
    correctIndex: correctIndex >= 0 ? correctIndex : 0,
    category: params.category,
    topicId: params.topicId,
  };

  return updateExplanationField(created, safeString(params.sourceQuestion.explanation));
}

function formatTimestampForFileName(date: Date): string {
  const pad = (num: number) => String(num).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
}

function printSummary(stats: Stats, dryRun: boolean): void {
  console.log('');
  console.log(`Sync summary (${dryRun ? 'dry-run' : 'write mode'}):`);
  console.log(`- topic JSON files found: ${stats.topicFilesFound}`);
  console.log(`- source topics found: ${stats.sourceTopicsFound}`);
  console.log(`- topics matched: ${stats.matchedTopics}`);
  console.log(`- topics missing: ${stats.missingTopics}`);
  console.log(`- questions updated: ${stats.questionsUpdated}`);
  console.log(`- questions inserted: ${stats.questionsInserted}`);
  console.log(`- questions skipped: ${stats.questionsSkipped}`);
  console.log(`- orphaned existing questions: ${stats.orphanedQuestions}`);

  if (stats.unmatchedTopicTitles.length > 0) {
    console.log('- unmatched topic titles:');
    for (const title of stats.unmatchedTopicTitles) {
      console.log(`  - ${title}`);
    }
  } else {
    console.log('- unmatched topic titles: none');
  }

  if (stats.orphanedQuestionsByTopic.length > 0) {
    console.log('- orphaned questions by topic:');
    for (const entry of stats.orphanedQuestionsByTopic) {
      console.log(`  - ${entry.topicTitle}`);
      for (const question of entry.questions) {
        console.log(`    - ${question}`);
      }
    }
  } else {
    console.log('- orphaned questions by topic: none');
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.source || !args.store) {
    throw new Error('Could not resolve source/store paths. Pass --source and --store explicitly.');
  }

  const sourceStat = await fs.stat(args.source).catch(() => null);
  if (!sourceStat?.isDirectory()) {
    throw new Error(`Source directory not found: ${args.source}`);
  }
  const storeStat = await fs.stat(args.store).catch(() => null);
  if (!storeStat?.isFile()) {
    throw new Error(`Store file not found: ${args.store}`);
  }

  const { files, themes } = await loadSourceThemes(args.source);
  const store = await readJsonFile<StoreData>(args.store);

  if (!Array.isArray(store.questions)) {
    throw new Error('Store file has invalid shape: expected "questions" array.');
  }
  if (!store.meta || typeof store.meta !== 'object') {
    throw new Error('Store file has invalid shape: expected "meta" object.');
  }
  if (!Array.isArray(store.meta.thematicCardTitles)) {
    throw new Error('Store file has invalid shape: expected meta.thematicCardTitles array.');
  }

  if (!Array.isArray(store.meta.thematicCardQuestionIds)) {
    store.meta.thematicCardQuestionIds = store.meta.thematicCardTitles.map(() => []);
  }
  while (store.meta.thematicCardQuestionIds.length < store.meta.thematicCardTitles.length) {
    store.meta.thematicCardQuestionIds.push([]);
  }

  const titleToIndex = new Map<string, number>();
  store.meta.thematicCardTitles.forEach((title, idx) => {
    titleToIndex.set(normalizeText(title), idx);
  });

  const questionById = new Map<string, StoreQuestion>();
  for (const question of store.questions) {
    if (typeof question.id === 'string' && question.id) {
      questionById.set(question.id, question);
    }
  }

  let questionsUpdated = 0;
  let questionsInserted = 0;
  let questionsSkipped = 0;
  let matchedTopics = 0;
  const unmatchedTopicTitles: string[] = [];
  const orphanedQuestionsByTopic: Array<{ topicTitle: string; questions: string[] }> = [];

  for (const theme of themes) {
    const sourceTitle = safeString(theme.theme_name);
    const normalizedTitle = normalizeText(sourceTitle);
    if (!normalizedTitle) {
      continue;
    }

    const topicIndex = titleToIndex.get(normalizedTitle);
    if (topicIndex === undefined) {
      unmatchedTopicTitles.push(sourceTitle);
      continue;
    }

    matchedTopics += 1;

    const topicId = String(topicIndex + 1);
    const category = 'rules';

    const existingIds = Array.isArray(store.meta.thematicCardQuestionIds[topicIndex])
      ? [...store.meta.thematicCardQuestionIds[topicIndex]]
      : [];

    const existingTopicQuestions = new Map<string, StoreQuestion>();
    for (const id of existingIds) {
      const found = questionById.get(id);
      if (!found) {
        continue;
      }
      const amText = safeString((found.text ?? {}).am);
      const normalizedQuestionText = normalizeText(amText);
      if (normalizedQuestionText) {
        existingTopicQuestions.set(normalizedQuestionText, found);
      }
    }

    const sourceQuestions = Array.isArray(theme.questions) ? theme.questions : [];
    const sourceNormalizedSet = new Set<string>();
    const nextTopicIds = new Set(existingIds);

    for (const sourceQuestion of sourceQuestions) {
      const sourceQuestionText = safeString(sourceQuestion.question);
      const normalizedQuestionText = normalizeText(sourceQuestionText);
      const options = Array.isArray(sourceQuestion.options)
        ? sourceQuestion.options.map((opt) => safeString(opt))
        : [];

      if (!normalizedQuestionText || options.length === 0) {
        questionsSkipped += 1;
        continue;
      }

      sourceNormalizedSet.add(normalizedQuestionText);
      const existing = existingTopicQuestions.get(normalizedQuestionText);

      if (existing) {
        const correctIndex = resolveCorrectIndex(options, safeString(sourceQuestion.correct_answer));
        const existingText: LocalizedString = { ...(existing.text ?? {}) };
        const existingOptions: LocalizedStringArray = { ...(existing.options ?? {}) };
        const nextQuestion: StoreQuestion = {
          ...existing,
          text: {
            ...existingText,
            am: sourceQuestionText,
          },
          options: {
            ...existingOptions,
            am: options,
          },
          topicId: existing.topicId ?? topicId,
          category: existing.category ?? category,
        };
        if (correctIndex >= 0) {
          nextQuestion.correctIndex = correctIndex;
        } else {
          questionsSkipped += 1;
        }
        const withExplanation = updateExplanationField(nextQuestion, safeString(sourceQuestion.explanation));
        questionById.set(existing.id, withExplanation);
        questionsUpdated += 1;
        continue;
      }

      const created = buildInsertedQuestion({
        sourceQuestion,
        topicId,
        category,
      });
      if (!created) {
        questionsSkipped += 1;
        continue;
      }
      questionById.set(created.id, created);
      nextTopicIds.add(created.id);
      questionsInserted += 1;
    }

    const orphaned = [...existingTopicQuestions.entries()]
      .filter(([normalizedQuestion]) => !sourceNormalizedSet.has(normalizedQuestion))
      .map(([, q]) => safeString(q.text?.am))
      .filter(Boolean);

    if (orphaned.length > 0) {
      orphanedQuestionsByTopic.push({ topicTitle: sourceTitle, questions: orphaned });
    }

    store.meta.thematicCardQuestionIds[topicIndex] = [...nextTopicIds];
  }

  const nextQuestions = [...questionById.values()];
  for (const question of nextQuestions) {
    // Remove legacy per-option explanations in favor of one plain explanation string.
    delete (question as Record<string, unknown>).optionExplanations;
    if (typeof question.explanation !== 'string') {
      question.explanation = '';
    }
  }
  store.questions = nextQuestions;

  // Validate by serializing/parsing before writing.
  const nextJsonContent = JSON.stringify(store, null, 2);
  JSON.parse(nextJsonContent);

  const stats: Stats = {
    topicFilesFound: files.length,
    sourceTopicsFound: themes.length,
    matchedTopics,
    missingTopics: unmatchedTopicTitles.length,
    questionsUpdated,
    questionsInserted,
    questionsSkipped,
    orphanedQuestions: orphanedQuestionsByTopic.reduce((acc, item) => acc + item.questions.length, 0),
    unmatchedTopicTitles,
    orphanedQuestionsByTopic,
  };

  if (!args.dryRun) {
    const backupTimestamp = formatTimestampForFileName(new Date());
    const backupPath = path.join(
      path.dirname(args.store),
      `exam-questions.store.backup.${backupTimestamp}.json`,
    );
    await fs.copyFile(args.store, backupPath);
    await fs.writeFile(args.store, `${nextJsonContent}\n`, 'utf8');
    console.log(`Backup created: ${backupPath}`);
    console.log(`Store updated: ${args.store}`);
  }

  printSummary(stats, args.dryRun);
}

void main().catch((error) => {
  console.error('[sync-exam-questions-from-themes] Failed:');
  console.error(error);
  process.exit(1);
});
