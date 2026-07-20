import { Op, Transaction, type WhereOptions } from 'sequelize';
import config from '../config';
import { API_VERSION_PREFIX } from '../constants';
import { sequelize } from '../database/sequelize';
import { Booking, Package, PackageOrder, PaymentSession, StudentProfile, User } from '../models';
import type { PaymentSessionKind } from '../models/payment-session.model';
import BookingService, { normalizeBookingStatus } from './booking.service';
import StudentEntitlementsService from './student-entitlements.service';
import { bookingTotalPriceAmd } from '../utils/booking-admin-payment.util';
import { parseAmdFromPriceDisplay } from '../utils/price-display.util';
import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';
import LoggerUtil from '../utils/logger.util';
import { amdToMinorUnits, buildEpgOrderNumber, isVposConfigured, minorUnitsToAmd } from '../utils/vpos.util';

const { InputValidationError } = ErrorsUtil;

const PAYMENT_HOLD_MS = 10 * 60 * 1000;
/** Wait before polling the bank for abandoned checkout tabs. */
const RECONCILE_MIN_AGE_MS = 60 * 1000;
const EPG_PAID_ORDER_STATUS = 2;
const ACTIVE_PACKAGE_STATUSES = ['paid', 'active', 'confirmed'] as const;

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

type VposAppError = InstanceType<typeof InputValidationError> & { data?: unknown };

function throwVposEpgError(
  endpoint: string,
  response: Pick<EpgRegisterResponse, 'errorCode' | 'errorMessage'>,
  hint = '',
): never {
  const errorCode = String(response.errorCode ?? '');
  const errorMessage = response.errorMessage?.trim() || 'Could not start payment with the bank.';
  const err = new InputValidationError(
    `[ACBA ${errorCode || '?'}] ${errorMessage}${hint}`,
    HttpStatusCodesUtil.BAD_GATEWAY,
  ) as VposAppError;
  err.data = {
    acba: {
      endpoint,
      errorCode,
      errorMessage,
    },
  };
  throw err;
}

function epgLanguage(lang?: string): string {
  const raw = (lang ?? 'en').toLowerCase();
  if (raw.startsWith('hy') || raw === 'am') return 'hy';
  if (raw.startsWith('ru')) return 'ru';
  return 'en';
}

function apiPaymentsUrl(path: string): string {
  return `${config.API_PUBLIC_URL}${API_VERSION_PREFIX}/payments/${path}`;
}

function panelResultUrl(params: Record<string, string>): string {
  const q = new URLSearchParams(params);
  return `${config.PANEL_DEFAULT_ORIGIN}/dashboard/payments/result?${q.toString()}`;
}

function sessionResultParams(
  session: PaymentSession,
  status: 'success' | 'failed',
  extra?: Record<string, string>,
): Record<string, string> {
  return {
    status,
    kind: session.kind,
    referenceId: session.referenceId != null ? String(session.referenceId) : '',
    sessionId: String(session.id),
    orderNumber: session.orderNumber,
    amountAmd: String(session.amountAmd),
    ...extra,
  };
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
      mode: config.VPOS.MODE,
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

    const reusable = await this.findReusablePendingSession(
      studentUserId,
      prepared.kind,
      prepared.referenceId,
      prepared.meta,
    );
    if (reusable) {
      const formUrl = (reusable.rawRegisterResponse as EpgRegisterResponse | null)?.formUrl;
      if (formUrl) {
        return {
          sessionId: reusable.id,
          orderNumber: reusable.orderNumber,
          redirectUrl: formUrl,
        };
      }
    }

    await this.expireStalePendingSessions(studentUserId, prepared.kind, prepared.referenceId, prepared.meta);
    await this.expireDuplicatePendingSessions(studentUserId, prepared.kind, prepared.referenceId, prepared.meta);

    const orderNumber = buildEpgOrderNumber();
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
      const hint =
        errorCode === '1' && register.errorMessage?.toLowerCase().includes('order number')
          ? ' ACBA orderNumber must be alphanumeric (no hyphens/underscores) and at most 32 characters.'
          : errorCode === '5'
            ? register.errorMessage?.toLowerCase().includes('password')
              ? ` Log into the ACBA test merchant portal (https://testepg.arca.am/epg_gui/#login) as the API user and set a new password, then update VPOS_PASSWORD in backend/.env. (VPOS_MODE=${config.VPOS.MODE} — test EPG still requires test API credentials.)`
              : ` VPOS_MODE=${config.VPOS.MODE} only switches the bank host (test vs live); with VPOS_ENABLED=1 you still need valid test credentials in VPOS_USERNAME/VPOS_PASSWORD. Reset the API user in the merchant portal or contact ACBA.`
            : '';
      throwVposEpgError('register.do', register, hint);
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
      await this.assertPackagePurchaseAllowed(studentUserId);
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
      return panelResultUrl(sessionResultParams(session, 'success'));
    }

    try {
      const result = await this.verifyAndFulfill(session);
      return panelResultUrl(
        sessionResultParams(session, result.status === 'paid' ? 'success' : 'failed'),
      );
    } catch {
      await session.update({ status: 'failed' });
      return panelResultUrl(sessionResultParams(session, 'failed'));
    }
  }

  static async handleFail(orderId: string | undefined, orderNumber: string | undefined): Promise<string> {
    const session = await this.findSession(orderId, orderNumber);
    if (!session) {
      return panelResultUrl({ status: 'failed', reason: 'not_found' });
    }
    if (session.status === 'paid') {
      return panelResultUrl(sessionResultParams(session, 'success'));
    }

    // Bank may redirect to failUrl even when payment succeeded — verify before marking failed.
    try {
      const result = await this.verifyAndFulfill(session);
      if (result.status === 'paid') {
        return panelResultUrl(sessionResultParams(session, 'success'));
      }
    } catch {
      // Fall through to cancelled UX.
    }

    if (session.status === 'pending') {
      await session.reload();
      if (session.status === 'pending') {
        await session.update({ status: 'failed' });
      }
    }
    return panelResultUrl(sessionResultParams(session, 'failed', { reason: 'cancelled' }));
  }

  /** Student-initiated recovery when the bank redirect was missed or is still processing. */
  static async syncSessionForStudent(
    sessionId: number,
    studentUserId: number,
  ): Promise<VposFulfillmentResult & { orderNumber: string; amountAmd: number }> {
    const session = await PaymentSession.findOne({ where: { id: sessionId, studentUserId } });
    if (!session) {
      throw new InputValidationError('Payment session not found.', HttpStatusCodesUtil.NOT_FOUND);
    }
    if (session.status === 'expired') {
      throw new InputValidationError(
        'This payment session has expired. Start checkout again.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
    if (session.status === 'paid') {
      return {
        sessionId: session.id,
        kind: session.kind,
        referenceId: session.referenceId,
        status: 'paid',
        orderNumber: session.orderNumber,
        amountAmd: session.amountAmd,
      };
    }

    const result = await this.verifyAndFulfill(session);
    await session.reload();
    return {
      ...result,
      orderNumber: session.orderNumber,
      amountAmd: session.amountAmd,
    };
  }

  /** Poll pending sessions with the bank — run from cron. */
  static async reconcilePendingSessions(): Promise<{ checked: number; fulfilled: number; expired: number }> {
    if (!isVposConfigured()) {
      return { checked: 0, fulfilled: 0, expired: 0 };
    }

    const holdCutoff = new Date(Date.now() - PAYMENT_HOLD_MS);
    const [expired] = await PaymentSession.update(
      { status: 'expired' },
      { where: { status: 'pending', createdAt: { [Op.lt]: holdCutoff } } },
    );

    const reconcileBefore = new Date(Date.now() - RECONCILE_MIN_AGE_MS);
    const pending = await PaymentSession.findAll({
      where: {
        status: 'pending',
        createdAt: { [Op.lt]: reconcileBefore },
        epgOrderId: { [Op.ne]: null },
      },
      order: [['createdAt', 'ASC']],
      limit: 40,
    });

    let fulfilled = 0;
    for (const session of pending) {
      try {
        const result = await this.verifyAndFulfill(session);
        if (result.status === 'paid') fulfilled += 1;
      } catch (err) {
        LoggerUtil.warn(
          `vPOS reconcile: session ${session.id} — ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (expired > 0 || fulfilled > 0) {
      LoggerUtil.info(`vPOS reconcile: checked=${pending.length} fulfilled=${fulfilled} expired=${expired}`);
    }

    return { checked: pending.length, fulfilled, expired };
  }

  /** Booking IDs with an open bank checkout — do not delete holds while payment may be in flight. */
  static async bookingIdsWithPendingPayment(): Promise<number[]> {
    const rows = await PaymentSession.findAll({
      where: {
        kind: 'booking',
        status: 'pending',
        referenceId: { [Op.ne]: null },
      },
      attributes: ['referenceId'],
    });
    return rows
      .map((r) => Number(r.referenceId))
      .filter((id) => Number.isFinite(id) && id > 0);
  }

  private static async assertPackagePurchaseAllowed(studentUserId: number): Promise<void> {
    const existing = await PackageOrder.findOne({
      where: {
        studentUserId,
        status: { [Op.in]: [...ACTIVE_PACKAGE_STATUSES] },
      },
    });
    if (existing) {
      throw new InputValidationError(
        'You already have an active driving package. Contact the office if you need to change packages.',
        HttpStatusCodesUtil.BAD_REQUEST,
      );
    }
  }

  private static pendingSessionWhere(
    studentUserId: number,
    kind: PaymentSessionKind,
    referenceId: number | null,
  ): WhereOptions {
    const holdCutoff = new Date(Date.now() - PAYMENT_HOLD_MS);
    const where: WhereOptions = {
      studentUserId,
      kind,
      status: 'pending',
      createdAt: { [Op.gte]: holdCutoff },
    };
    if (referenceId != null) {
      where.referenceId = referenceId;
    } else if (kind === 'extra_practical') {
      where.referenceId = { [Op.is]: null };
    }
    return where;
  }

  private static extraPracticalTotal(session: PaymentSession): number {
    return Number((session.meta as { practicalTotal?: number } | null)?.practicalTotal ?? 3);
  }

  private static matchesExtraPracticalMeta(session: PaymentSession, meta?: Record<string, unknown>): boolean {
    const want = Number(meta?.practicalTotal ?? 3);
    return this.extraPracticalTotal(session) === want;
  }

  private static async findReusablePendingSession(
    studentUserId: number,
    kind: PaymentSessionKind,
    referenceId: number | null,
    meta?: Record<string, unknown>,
  ): Promise<PaymentSession | null> {
    const sessions = await PaymentSession.findAll({
      where: this.pendingSessionWhere(studentUserId, kind, referenceId),
      order: [['createdAt', 'DESC']],
      limit: kind === 'extra_practical' ? 8 : 3,
    });
    for (const session of sessions) {
      if (kind === 'extra_practical' && !this.matchesExtraPracticalMeta(session, meta)) continue;
      const raw = session.rawRegisterResponse as EpgRegisterResponse | null;
      if (session.epgOrderId?.trim() && raw?.formUrl?.trim()) {
        return session;
      }
    }
    return null;
  }

  private static async expireStalePendingSessions(
    studentUserId: number,
    kind: PaymentSessionKind,
    referenceId: number | null,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    const holdCutoff = new Date(Date.now() - PAYMENT_HOLD_MS);
    const where: WhereOptions = {
      studentUserId,
      kind,
      status: 'pending',
      createdAt: { [Op.lt]: holdCutoff },
    };
    if (referenceId != null) {
      where.referenceId = referenceId;
    } else if (kind === 'extra_practical') {
      where.referenceId = { [Op.is]: null };
    }

    if (kind !== 'extra_practical') {
      await PaymentSession.update({ status: 'expired' }, { where });
      return;
    }

    const stale = await PaymentSession.findAll({ where, limit: 20 });
    const ids = stale.filter((s) => this.matchesExtraPracticalMeta(s, meta)).map((s) => s.id);
    if (ids.length > 0) {
      await PaymentSession.update({ status: 'expired' }, { where: { id: { [Op.in]: ids } } });
    }
  }

  /** Prevent parallel EPG orders for the same checkout target. */
  private static async expireDuplicatePendingSessions(
    studentUserId: number,
    kind: PaymentSessionKind,
    referenceId: number | null,
    meta?: Record<string, unknown>,
  ): Promise<void> {
    const active = await PaymentSession.findAll({
      where: this.pendingSessionWhere(studentUserId, kind, referenceId),
      limit: 20,
    });
    const ids = active
      .filter((s) => kind !== 'extra_practical' || this.matchesExtraPracticalMeta(s, meta))
      .map((s) => s.id);
    if (ids.length > 0) {
      await PaymentSession.update({ status: 'expired' }, { where: { id: { [Op.in]: ids } } });
    }
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
      const row = await Booking.findOne({
        where: {
          id: session.referenceId,
          studentUserId,
          lessonType: { [Op.in]: ['practical', 'theory', 'theory_personal'] },
        },
        transaction,
        lock: Transaction.LOCK.UPDATE,
      });
      if (!row) {
        throw new InputValidationError(
          'Booking for this payment no longer exists. Contact support with your payment reference.',
          HttpStatusCodesUtil.CONFLICT,
        );
      }
      if (row.paidAt != null) {
        return;
      }
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
