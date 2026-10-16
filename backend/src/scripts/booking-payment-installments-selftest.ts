import assert from 'node:assert/strict';
import { resolveAdminPaymentInstallments } from '../utils/booking-admin-payment.util';

const partial = resolveAdminPaymentInstallments(10000, [
  { amountAmd: 4000, recordedAt: '2026-01-01T10:00:00.000Z', method: 'cash', note: 'first' },
]);
assert.equal(partial.paymentStatus, 'partial');
assert.equal(partial.paidAmountAmd, 4000);
assert.equal(partial.installments.length, 1);
assert.equal(partial.paymentNotes, 'first');

const paid = resolveAdminPaymentInstallments(10000, [
  { id: 1, amountAmd: 4000, recordedAt: '2026-01-01T10:00:00.000Z', method: 'cash', note: 'a' },
  { amountAmd: 6000, recordedAt: '2026-01-02T10:00:00.000Z', method: 'card', note: 'b' },
]);
assert.equal(paid.paymentStatus, 'paid');
assert.equal(paid.paidAmountAmd, 10000);
assert.equal(paid.installments[0]?.id, 1);
assert.equal(paid.installments[1]?.id, undefined);
assert.equal(paid.paymentNotes, 'a\nb');

const unpaid = resolveAdminPaymentInstallments(10000, [
  { amountAmd: 0, recordedAt: '2026-01-01T10:00:00.000Z', method: 'cash', note: 'skip' },
]);
assert.equal(unpaid.paymentStatus, 'unpaid');
assert.equal(unpaid.paidAmountAmd, 0);
assert.equal(unpaid.installments.length, 0);

assert.throws(() =>
  resolveAdminPaymentInstallments(10000, [
    { amountAmd: 10001, recordedAt: '2026-01-01T10:00:00.000Z', method: 'cash' },
  ]),
);

assert.throws(() =>
  resolveAdminPaymentInstallments(10000, [
    { amountAmd: 1000, recordedAt: 'not-a-date', method: 'cash' },
  ]),
);

const free = resolveAdminPaymentInstallments(0, [
  { amountAmd: 500, recordedAt: '2026-01-01T10:00:00.000Z', method: 'cash' },
]);
assert.equal(free.paymentStatus, 'paid');
assert.equal(free.paidAmountAmd, 0);
assert.equal(free.installments.length, 0);

console.log('payment installment selftest ok');
