import fs from 'node:fs';
import path from 'node:path';
import winston from 'winston';
import config from '../config';
import { getRequestContext } from './request-context.util';

const { LOG_LEVEL, LOG_DIR, NODE_ENV } = config;
const isProduction = NODE_ENV === 'production';

function ensureLogDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const logDir = path.isAbsolute(LOG_DIR) ? LOG_DIR : path.join(process.cwd(), LOG_DIR);
ensureLogDir(logDir);

const injectContext = winston.format((info) => {
  const ctx = getRequestContext();
  if (ctx) {
    info.requestId = ctx.requestId;
    info.method = ctx.method;
    info.path = ctx.path;
    if (ctx.actorUserId != null) info.actorUserId = ctx.actorUserId;
    if (ctx.actorType) info.actorType = ctx.actorType;
    if (ctx.ip) info.ip = ctx.ip;
  }
  return info;
});

const jsonLineFormat = winston.format.combine(
  winston.format.timestamp(),
  injectContext(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  injectContext(),
  winston.format.printf((info) => {
    const rid = info.requestId ? ` [${info.requestId}]` : '';
    const actor =
      info.actorUserId != null ? ` user=${info.actorUserId}${info.actorType ? `:${info.actorType}` : ''}` : '';
    const base = `${info.timestamp} ${info.level}${rid}${actor}: ${info.message}`;
    if (info.stack) return `${base}\n${info.stack}`;
    return base;
  }),
);

const LoggerUtil = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    new winston.transports.Console({
      format: isProduction ? jsonLineFormat : consoleFormat,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      format: jsonLineFormat,
      maxsize: 20 * 1024 * 1024,
      maxFiles: 14,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      format: jsonLineFormat,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 30,
    }),
  ],
});

/** Structured HTTP access log (replaces morgan). */
export function logHttp(
  level: 'info' | 'warn' | 'error',
  message: string,
  meta?: Record<string, unknown>,
): void {
  LoggerUtil.log(level, message, { kind: 'http', ...meta });
}

export default LoggerUtil;
