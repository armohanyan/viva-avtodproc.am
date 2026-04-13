import 'dotenv/config';
import { connectDatabase } from '../database/sequelize';
import { syncModels } from '../models';
import { seedDatabaseIfEmpty } from '../seed/seed-database';
import { LoggerUtil } from '../utils';

async function main() {
  await connectDatabase();
  await syncModels();
  await seedDatabaseIfEmpty();
  LoggerUtil.info('Seed script finished (skipped if data already exists)');
  process.exit(0);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
