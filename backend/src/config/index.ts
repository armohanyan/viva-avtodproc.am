import { z } from 'zod';
import type { CorsOptions } from 'cors';

const rawEnvSchema = z.object({
  /** When not `production`, or when `EXPOSE_ERROR_DETAILS=1`, 500 responses include message/stack for debugging. */
  NODE_ENV: z.string().optional(),
  EXPOSE_ERROR_DETAILS: z.string().optional(),
  PORT: z.preprocess((v) => {
    if (v === undefined || v === null || v === '') return 3001;
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 3001;
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
  /** Auto-seed when `users` is empty (initial super admin). Set to `0` to disable. */
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
  /** Browser-reachable base URL of this API (no trailing slash). Used for OAuth redirect_uri. */
  API_PUBLIC_URL: z.string().optional(),
  /** Browser origin of the accounts panel (Vite/SPA). Used in email links and OAuth return when state omits `ro`. */
  PANEL_DEFAULT_ORIGIN: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_ID: z.string().optional(),
  OAUTH_GOOGLE_CLIENT_SECRET: z.string().optional(),
  OAUTH_FACEBOOK_APP_ID: z.string().optional(),
  OAUTH_FACEBOOK_APP_SECRET: z.string().optional(),
  /** Sign in with Apple — Services ID (client id). */
  OAUTH_APPLE_CLIENT_ID: z.string().optional(),
  OAUTH_APPLE_TEAM_ID: z.string().optional(),
  OAUTH_APPLE_KEY_ID: z.string().optional(),
  /** ES256 private key (.p8) PEM; use literal \\n in .env for newlines. */
  OAUTH_APPLE_PRIVATE_KEY: z.string().optional(),
  /** Brevo transactional email API key (https://app.brevo.com/). */
  BREVO_API_KEY: z.string().optional(),
  /** From address — must be a verified sender in Brevo. */
  SENDER_EMAIL: z.string().optional(),
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

const apiPublicUrl = (raw.API_PUBLIC_URL?.trim() || `http://127.0.0.1:${raw.PORT}`).replace(/\/+$/, '');
/** Default matches Vite dev (`client`); Docker/production should set `PANEL_DEFAULT_ORIGIN` explicitly. */
const panelDefaultOrigin = (raw.PANEL_DEFAULT_ORIGIN?.trim() || 'http://localhost:5173').replace(/\/+$/, '');

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
  API_PUBLIC_URL: apiPublicUrl,
  PANEL_DEFAULT_ORIGIN: panelDefaultOrigin,
  AUTH: {
    JWT_ACCESS_SECRET: raw.JWT_ACCESS_SECRET || 'viva-dev-jwt-secret-change-me',
    JWT_REFRESH_SECRET:
      raw.JWT_REFRESH_SECRET || raw.JWT_ACCESS_SECRET || 'viva-dev-jwt-refresh-change-me',
    ACCESS_TOKEN_ACTIVE_TIME: raw.ACCESS_TOKEN_ACTIVE_TIME || '15m',
    REFRESH_TOKEN_ACTIVE_TIME: raw.REFRESH_TOKEN_ACTIVE_TIME || '7d',
    OAUTH: {
      google: {
        clientId: raw.OAUTH_GOOGLE_CLIENT_ID?.trim(),
        clientSecret: raw.OAUTH_GOOGLE_CLIENT_SECRET?.trim(),
      },
      facebook: {
        appId: raw.OAUTH_FACEBOOK_APP_ID?.trim(),
        appSecret: raw.OAUTH_FACEBOOK_APP_SECRET?.trim(),
      },
      apple: {
        clientId: raw.OAUTH_APPLE_CLIENT_ID?.trim(),
        teamId: raw.OAUTH_APPLE_TEAM_ID?.trim(),
        keyId: raw.OAUTH_APPLE_KEY_ID?.trim(),
        privateKey: raw.OAUTH_APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n').trim(),
      },
    },
  },
  MAIL: {
    BREVO_API_KEY: raw.BREVO_API_KEY?.trim() || '',
    SENDER_EMAIL: raw.SENDER_EMAIL?.trim() || '',
  },
};

export default config;
