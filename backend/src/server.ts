import http from 'http';
import 'dotenv/config';
import App from './app';
import config from './config';
import { connectDatabase } from './database/sequelize';
import { syncModels } from './models';
import { seedDatabaseIfEmpty } from './seed/seed-database';
import MarketingService from './services/marketing.service';
import { LoggerUtil } from './utils';

const { PORT } = config;

async function start() {
  try {
    await connectDatabase();
    LoggerUtil.info('MySQL connection established');
    await syncModels();
    LoggerUtil.info('Database models synchronized');
    if (config.MYSQL.AUTO_SEED) {
      await seedDatabaseIfEmpty();
      LoggerUtil.info('Seed check completed');
    }
    await MarketingService.ensureMarketingDefaults();
    LoggerUtil.info('Marketing defaults ensured');
  } catch (e) {
    LoggerUtil.error(`Database startup failed: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }

  App.init();

  const server = http.createServer(App.app);

  const onError = (error: NodeJS.ErrnoException) => {
    if (error.syscall !== 'listen') {
      throw error;
    }
    LoggerUtil.error(error.message);
  };

  const onListening = () => {
    const address = server.address();
    const bind =
      typeof address === 'string' ? `pipe ${address}` : String(address?.port ?? PORT);

    LoggerUtil.info('Viva API listening');
    LoggerUtil.info(`Port: ${bind}`);
    LoggerUtil.info(`Started at: ${new Date().toUTCString()}`);
  };

  server.on('error', onError);
  server.on('listening', onListening);
  server.listen(PORT);
}

void start();
