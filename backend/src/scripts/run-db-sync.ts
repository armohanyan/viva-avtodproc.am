/**
 * Applies schema migrations (syncModels) without starting the HTTP server.
 * Run after pulling code that adds tables/columns: npm run db:sync
 */
import 'dotenv/config';
import { connectDatabase } from '../database/sequelize';
import { syncModels } from '../models';

async function main() {
  await connectDatabase();
  await syncModels();
  console.log('Database sync completed (check server logs for [migrate] lines).');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
