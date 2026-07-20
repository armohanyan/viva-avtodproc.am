/**
 * CLI wrapper for practical flat XLSX import.
 *
 * From backend/:
 *   npm run import:practical-xlsx
 *   npm run import:practical-xlsx -- --dry-run
 *   npm run import:practical-xlsx -- --file ../ready-upload.xlsx
 *   npm run import:practical-xlsx -- --branch-id 1
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

import { connectDatabase } from '../database/sequelize';
import PracticalFlatXlsxImportService from '../services/practical-flat-xlsx-import.service';

type CliArgs = {
  filePath: string;
  dryRun: boolean;
  forceBranchId: number | null;
};

function repoRoot(): string {
  return path.resolve(__dirname, '../../..');
}

function parseArgs(argv: string[]): CliArgs {
  let filePath = path.join(repoRoot(), 'ready-upload.xlsx');
  let dryRun = false;
  let forceBranchId: number | null = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--file' || arg === '-f') {
      const next = argv[++i];
      if (!next) throw new Error('--file requires a path');
      filePath = path.resolve(next);
      continue;
    }
    if (arg.startsWith('--file=')) {
      filePath = path.resolve(arg.slice('--file='.length));
      continue;
    }
    if (arg === '--branch-id') {
      const next = argv[++i];
      if (!next) throw new Error('--branch-id requires a number');
      forceBranchId = Number(next);
      if (!Number.isFinite(forceBranchId) || forceBranchId <= 0) {
        throw new Error(`Invalid --branch-id: ${next}`);
      }
      continue;
    }
    if (arg.startsWith('--branch-id=')) {
      forceBranchId = Number(arg.slice('--branch-id='.length));
      if (!Number.isFinite(forceBranchId) || forceBranchId <= 0) {
        throw new Error(`Invalid --branch-id: ${arg}`);
      }
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      console.log(`Usage: npx tsx src/scripts/import-practical-from-ready-xlsx.ts [options]

Options:
  --file, -f <path>   XLSX path (default: <repo>/ready-upload.xlsx)
  --dry-run           Parse + resolve branches only; do not write
  --branch-id <id>    Force one branch for all rows
  --help, -h          Show this help`);
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { filePath, dryRun, forceBranchId };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.filePath)) {
    throw new Error(`File not found: ${args.filePath}`);
  }

  console.log(`Reading ${args.filePath}${args.dryRun ? ' (dry-run)' : ''}…`);

  await connectDatabase();
  await import('../models');

  const buffer = fs.readFileSync(args.filePath);
  const result = await PracticalFlatXlsxImportService.importFromBuffer(buffer, {
    dryRun: args.dryRun,
    forceBranchId: args.forceBranchId,
  });

  console.log(`Parsed ${result.parsedRows} lesson rows (${result.parseIssues.length} parse issues)`);

  if (result.parseIssues.length > 0) {
    console.log('\nParse issues (first 30):');
    for (const issue of result.parseIssues.slice(0, 30)) console.log(`  - ${issue}`);
    if (result.parseIssues.length > 30) console.log(`  … and ${result.parseIssues.length - 30} more`);
  }

  console.log('\nInstructor → branch:');
  for (const m of result.instructorMappings) {
    console.log(
      m.branchId != null
        ? `  ${m.excelName} → ${m.canonicalName} @ ${m.branchName} (id=${m.branchId})`
        : `  ${m.excelName} → ${m.canonicalName} @ UNRESOLVED`,
    );
  }
  for (const w of result.resolveWarnings) console.log(`  WARN: ${w}`);
  for (const e of result.resolveErrors) console.log(`  ERROR: ${e}`);

  console.log(
    `\nImportable=${result.importableRows}; wouldImportOrImported=${result.imported}; duplicates=${result.skippedDuplicates}; skippedUnresolved=${result.skippedUnresolved}; dualPhones=${result.dualPhoneRows}; paid=${result.paidRows}`,
  );

  if (args.dryRun) {
    console.log('\nDry-run complete (no DB writes). Duplicates = instructor+date+time already in booking_slots.');
    process.exit(
      result.resolveErrors.length > 0 || result.parseIssues.some((i) => !i.startsWith('Header')) || result.skippedUnresolved > 0
        ? 1
        : 0,
    );
  }

  console.log('\n=== TOTAL ===');
  console.log(
    JSON.stringify(
      {
        imported: result.imported,
        skippedDuplicates: result.skippedDuplicates,
        newStudentsCreated: result.newStudentsCreated,
        errorCount: result.errors.length,
        unmappableInstructors: result.unmappableInstructors,
        skippedUnresolved: result.skippedUnresolved,
        parseIssues: result.parseIssues.length,
      },
      null,
      2,
    ),
  );

  if (result.errors.length > 0) {
    console.log('\nErrors (first 40):');
    for (const err of result.errors.slice(0, 40)) {
      console.log(`  - ${err.date} ${err.timeSlot} | ${err.instructorName} | ${err.studentName}: ${err.reason}`);
    }
    if (result.errors.length > 40) console.log(`  … and ${result.errors.length - 40} more`);
  }

  process.exit(result.errors.length > 0 || result.skippedUnresolved > 0 || result.resolveErrors.length > 0 ? 1 : 0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
