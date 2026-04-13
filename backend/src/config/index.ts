import { z } from 'zod';
import type { CorsOptions } from 'cors';

const rawEnvSchema = z.object({
  /** When not `production`, or when `EXPOSE_ERROR_DETAILS=1`, 500 responses include message/stack for debugging. */
  NODE_ENV: z.string().optional(),
  EXPOSE_ERROR_DETAILS: z.string().optional(),
  PORT: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return 3002;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 3002;
  }, z.number().int().positive()),
  LOG_LEVEL: z.string().default('info'),
  DISABLE_REQUEST_LOG: z.string().optional(),
  CORS_ORIGINS: z.string().optional(),
  CORS: z.string().optional(),
  ONE_WAY_HASH_SECRET: z.string().optional(),
  /** MySQL — primary application database */
  MYSQL_HOST: z.string().default('127.0.0.1'),
  MYSQL_PORT: z.string().optional(),
  MYSQL_USER: z.string().default('root'),
  MYSQL_PASSWORD: z.string().default(''),
  MYSQL_DATABASE: z.string().default('viva'),
  MYSQL_LOGGING: z.string().optional(),
  /** Set to `1` to run sequelize.sync({ alter: true }) on startup (dev only). */
  DB_SYNC_ALTER: z.string().optional(),
  /** Auto-seed when DB is empty (cities count === 0). Set to `0` to disable. */
  DB_AUTO_SEED: z.string().optional(),
  PSQL_URL: z.string().optional(),
  PSQL_PORT: z.string().optional(),
  PSQL_HOST: z.string().optional(),
  PSQL_USER: z.string().optional(),
  PSQL_DATABASE: z.string().optional(),
  PSQL_PASSWORD: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),
  ACCESS_TOKEN_ACTIVE_TIME: z.string().optional(),
  REFRESH_TOKEN_ACTIVE_TIME: z.string().optional(),
});

function parseCorsOrigins(primary?: string, fallback?: string): CorsOptions['origin'] {
  const raw = primary ?? fallback;
  if (!raw || raw.trim() === '*') {
    return true;
  }
  const list = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) {
    return true;
  }
  if (list.length === 1) {
    return list[0];
  }
  return list;
}

const raw = rawEnvSchema.parse(process.env);

const mysqlPort = (() => {
  const n = Number(raw.MYSQL_PORT);
  return Number.isFinite(n) && n > 0 ? n : 3306;
})();

const isProduction = raw.NODE_ENV === 'production';
const exposeErrorDetails = !isProduction || raw.EXPOSE_ERROR_DETAILS === '1';

const config = {
  NODE_ENV: raw.NODE_ENV,
  /** Safe to enable in dev/staging; never rely on it in production unless debugging. */
  EXPOSE_ERROR_DETAILS: exposeErrorDetails,
  LOG_LEVEL: raw.LOG_LEVEL,
  PORT: raw.PORT,
  DISABLE_REQUEST_LOG: raw.DISABLE_REQUEST_LOG,
  ONE_WAY_HASH_SECRET: raw.ONE_WAY_HASH_SECRET,
  CORS_ORIGINS: parseCorsOrigins(raw.CORS_ORIGINS, raw.CORS),
  MYSQL: {
    HOST: raw.MYSQL_HOST,
    PORT: mysqlPort,
    USER: raw.MYSQL_USER,
    PASSWORD: raw.MYSQL_PASSWORD,
    DATABASE: raw.MYSQL_DATABASE,
    LOGGING: raw.MYSQL_LOGGING === '1' ? console.log : false,
    SYNC_ALTER: raw.DB_SYNC_ALTER === '1',
    AUTO_SEED: raw.DB_AUTO_SEED !== '0',
  },
  PSQL: {
    URL: raw.PSQL_URL,
    PORT: (() => {
      const n = Number(raw.PSQL_PORT);
      return Number.isFinite(n) && n > 0 ? n : 5432;
    })(),
    HOST: raw.PSQL_HOST || 'localhost',
    USER: raw.PSQL_USER,
    DATABASE: raw.PSQL_DATABASE,
    PASSWORD: raw.PSQL_PASSWORD,
  },
  AUTH: {
    JWT_ACCESS_SECRET: raw.JWT_ACCESS_SECRET || 'viva-dev-jwt-secret-change-me',
    JWT_REFRESH_SECRET: raw.JWT_REFRESH_SECRET,
    ACCESS_TOKEN_ACTIVE_TIME: raw.ACCESS_TOKEN_ACTIVE_TIME || '15m',
    REFRESH_TOKEN_ACTIVE_TIME: raw.REFRESH_TOKEN_ACTIVE_TIME || '7d',
  },
};

export default config;
