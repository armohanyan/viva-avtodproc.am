import http from 'http';
import type { NextFunction, Request, Response } from 'express';
import config from '../config';
import { HttpStatusCodesUtil } from '../utils';

type AppError = Error & {
  status?: number;
  code?: string | number;
  data?: unknown;
};

const ERROR_CASES: Record<string | number | symbol, { status: number; code: string; message?: string }> = {
  400: {
    status: HttpStatusCodesUtil.BAD_REQUEST,
    code: http.STATUS_CODES[HttpStatusCodesUtil.BAD_REQUEST]!,
  },
  ExpiredTokenConfirmError: {
    status: HttpStatusCodesUtil.BAD_REQUEST,
    code: http.STATUS_CODES[HttpStatusCodesUtil.BAD_REQUEST]!,
  },
  ExpiredEmailConfirmError: {
    status: HttpStatusCodesUtil.BAD_REQUEST,
    code: http.STATUS_CODES[HttpStatusCodesUtil.BAD_REQUEST]!,
  },
  InputValidationError: {
    status: HttpStatusCodesUtil.BAD_REQUEST,
    code: http.STATUS_CODES[HttpStatusCodesUtil.BAD_REQUEST]!,
  },
  InvalidEmailConfirmError: {
    status: HttpStatusCodesUtil.BAD_REQUEST,
    code: http.STATUS_CODES[HttpStatusCodesUtil.BAD_REQUEST]!,
  },
  SyntaxError: {
    status: HttpStatusCodesUtil.BAD_REQUEST,
    code: http.STATUS_CODES[HttpStatusCodesUtil.BAD_REQUEST]!,
  },
  11000: {
    status: HttpStatusCodesUtil.BAD_REQUEST,
    code: http.STATUS_CODES[HttpStatusCodesUtil.BAD_REQUEST]!,
    message: 'Duplicate entry.',
  },
  DocumentNotFoundError: {
    status: HttpStatusCodesUtil.NOT_FOUND,
    code: http.STATUS_CODES[HttpStatusCodesUtil.NOT_FOUND]!,
    message: 'Document Not Found.',
  },
  CastError: {
    status: HttpStatusCodesUtil.BAD_REQUEST,
    code: http.STATUS_CODES[HttpStatusCodesUtil.BAD_REQUEST]!,
  },
  ValidationError: {
    status: HttpStatusCodesUtil.BAD_REQUEST,
    code: http.STATUS_CODES[HttpStatusCodesUtil.BAD_REQUEST]!,
  },
  401: {
    status: HttpStatusCodesUtil.UNAUTHORIZED,
    code: http.STATUS_CODES[HttpStatusCodesUtil.UNAUTHORIZED]!,
  },
  UnauthorizedError: {
    status: HttpStatusCodesUtil.UNAUTHORIZED,
    code: http.STATUS_CODES[HttpStatusCodesUtil.UNAUTHORIZED]!,
  },
  Forbidden: {
    status: HttpStatusCodesUtil.FORBIDDEN,
    code: http.STATUS_CODES[HttpStatusCodesUtil.FORBIDDEN]!,
  },
  ForbiddenError: {
    status: HttpStatusCodesUtil.FORBIDDEN,
    code: http.STATUS_CODES[HttpStatusCodesUtil.FORBIDDEN]!,
  },
  PermissionError: {
    status: HttpStatusCodesUtil.FORBIDDEN,
    code: http.STATUS_CODES[HttpStatusCodesUtil.FORBIDDEN]!,
  },
  404: {
    status: HttpStatusCodesUtil.NOT_FOUND,
    code: http.STATUS_CODES[HttpStatusCodesUtil.NOT_FOUND]!,
  },
  ResourceNotFoundError: {
    status: HttpStatusCodesUtil.NOT_FOUND,
    code: http.STATUS_CODES[HttpStatusCodesUtil.NOT_FOUND]!,
  },
  ConflictError: {
    status: HttpStatusCodesUtil.CONFLICT,
    code: http.STATUS_CODES[HttpStatusCodesUtil.CONFLICT]!,
  },
  MicroserviceError: {
    status: HttpStatusCodesUtil.FAILED_DEPENDENCY,
    code: http.STATUS_CODES[HttpStatusCodesUtil.FAILED_DEPENDENCY]!,
  },
  DEFAULT: {
    status: HttpStatusCodesUtil.INTERNAL_SERVER_ERROR,
    code: http.STATUS_CODES[HttpStatusCodesUtil.INTERNAL_SERVER_ERROR]!,
    message: 'The server encountered an internal error. Try again later.',
  },
};

export default class ErrorHandlerMiddleware {
  static init(error: unknown, _request: Request, response: Response, _next: NextFunction) {
    const err = error as AppError;
    const ERROR_CASE =
      ERROR_CASES[err.status as string | number | symbol] ||
      ERROR_CASES[err.code as string | number | symbol] ||
      ERROR_CASES[err.name as string | number | symbol] ||
      ERROR_CASES.DEFAULT;

    const { status, code, message: caseMessage } = ERROR_CASE;

    const isServerError = status >= 500;
    const message =
      isServerError && config.EXPOSE_ERROR_DETAILS && err.message
        ? err.message
        : caseMessage || err.message;

    const result: Record<string, unknown> = {
      status,
      code,
      message,
      ...(err.data !== undefined ? { data: err.data } : {}),
    };

    if (isServerError && config.EXPOSE_ERROR_DETAILS && err instanceof Error) {
      if (err.stack) {
        result.stack = err.stack;
      }
      if (err.name) {
        result.name = err.name;
      }
      const parent = (err as Error & { parent?: { message?: string; sql?: string } }).parent;
      if (parent?.message) {
        result.dbMessage = parent.message;
      }
      if (parent?.sql && typeof parent.sql === 'string') {
        result.sql = parent.sql;
      }
    }

    if (isServerError) {
      console.error('Server error:', err);
      if (err instanceof Error && err.stack) {
        console.error(err.stack);
      }
    }

    response.status(status).json(result);
  }
}
