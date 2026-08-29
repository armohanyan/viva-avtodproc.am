import { z } from 'zod';
import { DIRECTOR_PAYMENT_METHODS } from '../constants/director-payment-method';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function directorOptionalDate(input: unknown): string {
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  return todayIso();
}

export function directorOptionalAmd(input: unknown): number {
  if (input === '' || input == null) return 0;
  const n = typeof input === 'number' ? input : Number(String(input).replace(/[\s,]/g, ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n);
}

export function directorOptionalDecimal(input: unknown): number {
  if (input === '' || input == null) return 0;
  const n = typeof input === 'number' ? input : Number(String(input).replace(/[\s,]/g, ''));
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

export function directorOptionalPositiveId(input: unknown): number | null {
  if (input === '' || input == null) return null;
  const n = typeof input === 'number' ? input : Number(input);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function directorOptionalText(input: unknown, fallback = ''): string {
  if (input == null) return fallback;
  return String(input).trim() || fallback;
}

export function directorOptionalComment(input: unknown): string | null {
  if (input == null) return null;
  const t = String(input).trim();
  return t || null;
}

export function directorOptionalPayment(input: unknown): (typeof DIRECTOR_PAYMENT_METHODS)[number] {
  return input === 'cash' ? 'cash' : 'card';
}

export const directorDateField = z.preprocess(
  directorOptionalDate,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
);
export const directorAmdField = z.preprocess(directorOptionalAmd, z.number().int());
export const directorDecimalField = z.preprocess(directorOptionalDecimal, z.number());
export const directorOptionalIdField = z.preprocess(
  directorOptionalPositiveId,
  z.number().int().positive().nullable(),
);
export const directorTextField = z.preprocess((v) => directorOptionalText(v), z.string());
export const directorCommentField = z.preprocess(directorOptionalComment, z.string().nullable());
export function directorOptionalDecimalOrNull(input: unknown): number | null {
  if (input === '' || input == null) return null;
  return directorOptionalDecimal(input);
}

export function directorOptionalAmdOrNull(input: unknown): number | null {
  if (input === '' || input == null) return null;
  const n = directorOptionalAmd(input);
  return n;
}

export const directorNullableDecimalField = z.preprocess(
  directorOptionalDecimalOrNull,
  z.number().nullable(),
);
export const directorNullableAmdField = z.preprocess(
  directorOptionalAmdOrNull,
  z.number().int().nullable(),
);
export const directorPaymentField = z.preprocess(
  directorOptionalPayment,
  z.enum(DIRECTOR_PAYMENT_METHODS),
);
