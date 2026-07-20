import { randomBytes } from 'crypto';
import config from '../config';
import ErrorsUtil from './errors.util';
import HttpStatusCodesUtil from './http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

/** Real vPOS redirect flow is active when enabled and bank API credentials are present. */
export function isVposConfigured(): boolean {
  return config.VPOS.ENABLED && !!config.VPOS.USERNAME && !!config.VPOS.PASSWORD;
}

/** Simulated POS dialog + direct complete endpoints (local dev / missing creds). */
export function isVposSimulatedMode(): boolean {
  return !isVposConfigured();
}

export function assertDirectPaymentAllowed(): void {
  if (isVposConfigured()) {
    throw new InputValidationError(
      'Complete this purchase using online card payment.',
      HttpStatusCodesUtil.BAD_REQUEST,
    );
  }
}

/** AMD whole drams → EPG minor units (dram × 100). */
export function amdToMinorUnits(amountAmd: number): number {
  return Math.round(amountAmd) * 100;
}

export function minorUnitsToAmd(amountMinor: number): number {
  return Math.round(amountMinor / 100);
}

/** ACBA EPG orderNumber: alphanumeric only (AN..32), unique per merchant. */
export function buildEpgOrderNumber(): string {
  return `${Date.now()}${randomBytes(4).toString('hex')}`.slice(0, 32);
}
