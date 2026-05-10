import type { ZodTypeAny } from 'zod';
import type { z } from 'zod';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

/** Parsed output type (defaults/coercion applied), not Zod input inference. */
export function parseBody<S extends ZodTypeAny>(schema: S, body: unknown): z.output<S> {
  const r = schema.safeParse(body);
  if (!r.success) {
    const msg = r.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new InputValidationError(msg || 'Invalid request body', HttpStatusCodesUtil.BAD_REQUEST);
  }
  return r.data;
}

export function parseQuery<S extends ZodTypeAny>(schema: S, query: unknown): z.output<S> {
  const r = schema.safeParse(query);
  if (!r.success) {
    const msg = r.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new InputValidationError(msg || 'Invalid query', HttpStatusCodesUtil.BAD_REQUEST);
  }
  return r.data;
}

export function parseParams<S extends ZodTypeAny>(schema: S, params: unknown): z.output<S> {
  const r = schema.safeParse(params);
  if (!r.success) {
    const msg = r.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ');
    throw new InputValidationError(msg || 'Invalid route parameters', HttpStatusCodesUtil.BAD_REQUEST);
  }
  return r.data;
}
