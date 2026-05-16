import http from 'http';
import 'dotenv/config';
import App from './app';
import config from './config';
import { connectDatabase } from './database/sequelize';
import { syncModels } from './models';
import { seedDatabaseIfEmpty } from './seed/seed-database';
import BookingCronService from './services/booking-cron.service';
import { LoggerUtil } from './utils';

const { PORT } = config;

function startBookingCronIfEnabled(): void {
  if (process.env.BOOKING_CRON_ENABLED !== '1') {
    return;
  }
  const raw = Number(process.env.BOOKING_CRON_INTERVAL_MS);
  const ms = Number.isFinite(raw) && raw >= 30_000 ? raw : 3_600_000;
  const tick = () => {
    void BookingCronService.runDueJobs().catch((err) =>
      LoggerUtil.error(`Booking cron: ${err instanceof Error ? err.message : String(err)}`),
    );
  };
  tick();
  const handle = setInterval(tick, ms);
  if (typeof handle.unref === 'function') {
    handle.unref();
  }
  LoggerUtil.info(`Booking cron enabled (interval ${ms} ms)`);
}

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
    startBookingCronIfEnabled();
  };

  server.on('error', onError);
  server.on('listening', onListening);
  server.listen(PORT);
}

void start();
