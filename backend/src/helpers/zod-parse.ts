import type { ZodSchema, ZodType, ZodTypeDef } from 'zod';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    const msg = r.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new InputValidationError(msg || 'Invalid request body', HttpStatusCodesUtil.BAD_REQUEST);
  }
  return r.data;
}

export function parseQuery<T>(schema: ZodType<T, ZodTypeDef, unknown>, query: unknown): T {
  const r = schema.safeParse(query);
  if (!r.success) {
    const msg = r.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new InputValidationError(msg || 'Invalid query', HttpStatusCodesUtil.BAD_REQUEST);
  }
  return r.data;
}

export function parseParams<T>(schema: ZodType<T, ZodTypeDef, unknown>, params: unknown): T {
  const r = schema.safeParse(params);
  if (!r.success) {
    const msg = r.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new InputValidationError(msg || 'Invalid route parameters', HttpStatusCodesUtil.BAD_REQUEST);
  }
  return r.data;
}
