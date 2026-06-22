import { randomBytes } from 'crypto';
import { Op, Transaction } from 'sequelize';
import config from '../config';
import { API_VERSION_PREFIX } from '../constants';
import { sequelize } from '../database/sequelize';
import { Booking, Package, PaymentSession, StudentProfile, User } from '../models';
import type { PaymentSessionKind } from '../models/payment-session.model';
import BookingService, { normalizeBookingStatus } from './booking.service';
import StudentEntitlementsService from './student-entitlements.service';
import { bookingTotalPriceAmd } from '../utils/booking-admin-payment.util';
import { parseAmdFromPriceDisplay } from '../utils/price-display.util';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import { amdToMinorUnits, isVposConfigured, minorUnitsToAmd } from '../utils/vpos.util';

const { InputValidationError } = ErrorsUtil;

const PAYMENT_HOLD_MS = 10 * 60 * 1000;
const EPG_PAID_ORDER_STATUS = 2;

export type VposInitiateInput =
  | { kind: 'booking'; bookingId: number; language?: string }
  | { kind: 'package'; packageId: number; language?: string }
  | { kind: 'extra_practical'; practicalTotal?: number; language?: string };

export type VposInitiateResult = {
  sessionId: number;
  orderNumber: string;
  redirectUrl: string;
};

export type VposFulfillmentResult = {
  sessionId: number;
  kind: PaymentSessionKind;
  referenceId: number | null;
  status: 'paid' | 'failed';
};

type EpgRegisterResponse = {
  errorCode?: string | number;
  errorMessage?: string;
  formUrl?: string;
  orderId?: string;
};

type EpgStatusResponse = {
  errorCode?: string | number;
  errorMessage?: string;
  orderStatus?: number;
  amount?: number;
  orderNumber?: string;
};

function epgLanguage(lang?: string): string {
  const raw = (lang ?? 'en').toLowerCase();
  if (raw.startsWith('hy') || raw === 'am') return 'hy';
  if (raw.startsWith('ru')) return 'ru';
  return 'en';
}

function buildOrderNumber(kind: PaymentSessionKind, referenceId: number | null): string {
  const ref = referenceId != null ? String(referenceId) : 'x';
  const suffix = randomBytes(4).toString('hex');
  return `viva-${kind}-${ref}-${Date.now()}-${suffix}`.slice(0, 36);
}

function apiPaymentsUrl(path: string): string {
  return `${config.API_PUBLIC_URL}${API_VERSION_PREFIX}/payments/${path}`;
}

function panelResultUrl(params: Record<string, string>): string {
  const q = new URLSearchParams(params);
  return `${config.PANEL_DEFAULT_ORIGIN}/dashboard/payments/result?${q.toString()}`;
}

async function epgPost<T extends Record<string, unknown>>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = `${config.VPOS.API_BASE_URL}${endpoint}`;
  const body = new URLSearchParams({
    userName: config.VPOS.USERNAME,
    password: config.VPOS.PASSWORD,
    ...params,
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new InputValidationError('Payment gateway returned an invalid response.', HttpStatusCodesUtil.BAD_GATEWAY);
  }
}

export default class VposPaymentService {
  static getPublicConfig() {
    return {
      enabled: isVposConfigured(),
      testMode: config.VPOS.TEST_MODE,
      simulated: !isVposConfigured(),
    };
  }

  static async initiate(studentUserId: number, input: VposInitiateInput): Promise<VposInitiateResult> {
    if (!isVposConfigured()) {
      throw new InputValidationError('Online card payment is not configured.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const language = epgLanguage(input.language);
    const prepared = await this.prepareInitiateContext(studentUserId, input);

    const orderNumber = buildOrderNumber(prepared.kind, prepared.referenceId);
    const returnUrl = apiPaymentsUrl('return');
    const failUrl = apiPaymentsUrl('fail');

    const session = await PaymentSession.create({
      orderNumber,
      studentUserId,
      kind: prepared.kind,
      referenceId: prepared.referenceId,
      amountAmd: prepared.amountAmd,
      amountMinor: prepared.amountMinor,
      currency: config.VPOS.CURRENCY,
      status: 'pending',
      language,
      meta: prepared.meta ?? null,
    });

    const register = await epgPost<EpgRegisterResponse>('register.do', {
      orderNumber,
      amount: String(prepared.amountMinor),
      currency: config.VPOS.CURRENCY,
      returnUrl,
      failUrl,
      description: prepared.description.slice(0, 512),
      language,
      sessionTimeoutSecs: String(Math.floor(PAYMENT_HOLD_MS / 1000)),
    });

    await session.update({ rawRegisterResponse: register as Record<string, unknown> });

    const errorCode = String(register.errorCode ?? '0');
    if (errorCode !== '0' || !register.formUrl || !register.orderId) {
      await session.update({ status: 'failed' });
      throw new InputValidationError(
        register.errorMessage?.trim() || 'Could not start payment with the bank.',
        HttpStatusCodesUtil.BAD_GATEWAY,
      );
    }

    await session.update({
      epgOrderId: register.orderId,
      providerRef: register.orderId,
    });

    return {
      sessionId: session.id,
      orderNumber,
      redirectUrl: register.formUrl,
    };
  }

  private static async prepareInitiateContext(
    studentUserId: number,
    input: VposInitiateInput,
  ): Promise<{
    kind: PaymentSessionKind;
    referenceId: number | null;
    amountAmd: number;
    amountMinor: number;
    description: string;
    meta?: Record<string, unknown>;
  }> {
    if (input.kind === 'booking') {
      const row = await Booking.findOne({
        where: { id: input.bookingId, studentUserId, lessonType: { [Op.in]: ['practical', 'theory', 'theory_personal'] } },
      });
      if (!row) {
        throw new InputValidationError('Booking not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      const st = normalizeBookingStatus(row.status);
      if ((st !== 'pending' && st !== 'pending_payment') || row.paidAt != null) {
        throw new InputValidationError('This booking is not awaiting payment.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      if (row.holdExpiresAt == null || new Date(row.holdExpiresAt).getTime() <= Date.now()) {
        throw new InputValidationError(
          'Payment window is not active or has expired. Start payment again if your booking is still reserved.',
          HttpStatusCodesUtil.BAD_REQUEST,
        );
      }
      const amountAmd = bookingTotalPriceAmd(row);
      if (amountAmd <= 0) {
        throw new InputValidationError('This booking has no payable amount.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      const lessonLabel =
        row.lessonType === 'theory'
          ? 'Group theory'
          : row.lessonType === 'theory_personal'
            ? '1:1 theory'
            : 'Practical lesson';
      return {
        kind: 'booking',
        referenceId: row.id,
        amountAmd,
        amountMinor: amdToMinorUnits(amountAmd),
        description: `${lessonLabel} #${row.id}`,
      };
    }

    if (input.kind === 'package') {
      const user = await User.findByPk(studentUserId);
      if (!user || user.accountType !== 'student') {
        throw new InputValidationError('Student not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      const pkg = await Package.findByPk(input.packageId);
      if (!pkg) {
        throw new InputValidationError('Package not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      const amountAmd = parseAmdFromPriceDisplay(pkg.priceDisplay);
      if (amountAmd <= 0) {
        throw new InputValidationError('This package does not have a valid price for online payment.', HttpStatusCodesUtil.BAD_REQUEST);
      }
      return {
        kind: 'package',
        referenceId: pkg.id,
        amountAmd,
        amountMinor: amdToMinorUnits(amountAmd),
        description: `Driving package: ${pkg.name}`,
      };
    }

    const practicalTotal = input.practicalTotal ?? 3;
    if (!Number.isFinite(practicalTotal) || practicalTotal <= 0) {
      throw new InputValidationError('Invalid extra lesson count.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    const user = await User.findByPk(studentUserId);
    if (!user || user.accountType !== 'student') {
      throw new InputValidationError('Student not found.', HttpStatusCodesUtil.NOT_FOUND);
    }
    const profile = await StudentProfile.findOne({ where: { userId: studentUserId } });
    if (!profile) {
      throw new InputValidationError('Student profile required for add-on lessons.', HttpStatusCodesUtil.NOT_FOUND);
    }
    const amountAmd = parseAmdFromPriceDisplay('12,000 ֏');
    if (amountAmd <= 0) {
      throw new InputValidationError('Extra practical block price is not configured.', HttpStatusCodesUtil.BAD_REQUEST);
    }
    return {
      kind: 'extra_practical',
      referenceId: null,
      amountAmd,
      amountMinor: amdToMinorUnits(amountAmd),
      description: `Extra practical lessons (${practicalTotal})`,
      meta: { practicalTotal },
    };
  }

  static async handleReturn(orderId: string | undefined, orderNumber: string | undefined): Promise<string> {
    const session = await this.findSession(orderId, orderNumber);
    if (!session) {
      return panelResultUrl({ status: 'failed', reason: 'not_found' });
    }
    if (session.status === 'paid') {
      return panelResultUrl({
        status: 'success',
        kind: session.kind,
        referenceId: session.referenceId != null ? String(session.referenceId) : '',
        sessionId: String(session.id),
      });
    }

    try {
      const result = await this.verifyAndFulfill(session);
      return panelResultUrl({
        status: result.status === 'paid' ? 'success' : 'failed',
        kind: session.kind,
        referenceId: session.referenceId != null ? String(session.referenceId) : '',
        sessionId: String(session.id),
      });
    } catch {
      await session.update({ status: 'failed' });
      return panelResultUrl({
        status: 'failed',
        kind: session.kind,
        referenceId: session.referenceId != null ? String(session.referenceId) : '',
        sessionId: String(session.id),
      });
    }
  }

  static async handleFail(orderId: string | undefined, orderNumber: string | undefined): Promise<string> {
    const session = await this.findSession(orderId, orderNumber);
    if (session && session.status === 'pending') {
      await session.update({ status: 'failed' });
    }
    return panelResultUrl({
      status: 'failed',
      kind: session?.kind ?? '',
      referenceId: session?.referenceId != null ? String(session.referenceId) : '',
      sessionId: session ? String(session.id) : '',
      reason: 'cancelled',
    });
  }

  private static async findSession(orderId?: string, orderNumber?: string): Promise<PaymentSession | null> {
    if (orderId?.trim()) {
      const byEpg = await PaymentSession.findOne({ where: { epgOrderId: orderId.trim() } });
      if (byEpg) return byEpg;
    }
    if (orderNumber?.trim()) {
      return PaymentSession.findOne({ where: { orderNumber: orderNumber.trim() } });
    }
    return null;
  }

  private static async verifyAndFulfill(session: PaymentSession): Promise<VposFulfillmentResult> {
    if (session.status === 'paid') {
      return {
        sessionId: session.id,
        kind: session.kind,
        referenceId: session.referenceId,
        status: 'paid',
      };
    }

    const epgOrderId = session.epgOrderId?.trim();
    if (!epgOrderId) {
      throw new InputValidationError('Payment session is missing gateway reference.', HttpStatusCodesUtil.BAD_REQUEST);
    }

    const status = await epgPost<EpgStatusResponse>('getOrderStatusExtended.do', {
      orderId: epgOrderId,
      language: session.language ?? 'en',
    });

    await session.update({ rawStatusResponse: status as Record<string, unknown> });

    const errorCode = String(status.errorCode ?? '0');
    const orderStatus = Number(status.orderStatus);
    const paidAmountMinor = Number(status.amount ?? 0);

    if (errorCode !== '0' || orderStatus !== EPG_PAID_ORDER_STATUS) {
      await session.update({ status: 'failed' });
      return {
        sessionId: session.id,
        kind: session.kind,
        referenceId: session.referenceId,
        status: 'failed',
      };
    }

    if (paidAmountMinor > 0 && paidAmountMinor !== session.amountMinor) {
      const paidAmd = minorUnitsToAmd(paidAmountMinor);
      if (paidAmd !== session.amountAmd) {
        await session.update({ status: 'failed' });
        throw new InputValidationError('Paid amount does not match the order.', HttpStatusCodesUtil.CONFLICT);
      }
    }

    return sequelize.transaction(async (transaction) => {
      const locked = await PaymentSession.findByPk(session.id, {
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!locked) {
        throw new InputValidationError('Payment session not found.', HttpStatusCodesUtil.NOT_FOUND);
      }
      if (locked.status === 'paid') {
        return {
          sessionId: locked.id,
          kind: locked.kind,
          referenceId: locked.referenceId,
          status: 'paid' as const,
        };
      }

      const providerRef = locked.providerRef ?? epgOrderId;
      await this.fulfillLockedSession(locked, providerRef, transaction);

      await locked.update(
        {
          status: 'paid',
          paidAt: new Date(),
          providerRef,
        },
        { transaction },
      );

      return {
        sessionId: locked.id,
        kind: locked.kind,
        referenceId: locked.referenceId,
        status: 'paid' as const,
      };
    });
  }

  private static async fulfillLockedSession(
    session: PaymentSession,
    providerRef: string,
    transaction: Transaction,
  ): Promise<void> {
    const studentUserId = session.studentUserId;
    if (session.kind === 'booking' && session.referenceId != null) {
      await BookingService.completePracticalStudentPayment(session.referenceId, studentUserId, {
        providerRef,
        transaction,
      });
      return;
    }
    if (session.kind === 'package' && session.referenceId != null) {
      await StudentEntitlementsService.purchasePackageAfterOnlinePayment(studentUserId, session.referenceId, {
        providerRef,
        transaction,
      });
      return;
    }
    if (session.kind === 'extra_practical') {
      const meta = session.meta as { practicalTotal?: number } | null;
      const practicalTotal = Number(meta?.practicalTotal ?? 3);
      await StudentEntitlementsService.purchaseExtraPracticalAfterOnlinePayment(studentUserId, practicalTotal, {
        providerRef,
        transaction,
      });
    }
  }
}
