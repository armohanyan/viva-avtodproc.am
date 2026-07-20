/**
 * Smoke-test ACBA vPOS API credentials (register + status against test/live EPG).
 *
 * Usage (from backend/):
 *   npm run vpos:smoke-test
 *
 * Requires VPOS_USERNAME and VPOS_PASSWORD in backend/.env (or env).
 * Set VPOS_MODE=development for test EPG, VPOS_MODE=production for live.
 */
import 'dotenv/config';
import config from '../config';
import { buildEpgOrderNumber } from '../utils/vpos.util';

type EpgResponse = {
  errorCode?: string | number;
  errorMessage?: string;
  formUrl?: string;
  orderId?: string;
};

async function epgPost(endpoint: string, params: Record<string, string>): Promise<EpgResponse> {
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
    return JSON.parse(text) as EpgResponse;
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
  }
}

async function main(): Promise<void> {
  console.log('ACBA vPOS smoke test');
  console.log('  mode:       ', config.VPOS.MODE);
  console.log('  enabled:    ', config.VPOS.ENABLED);
  console.log('  api base:   ', config.VPOS.API_BASE_URL);
  console.log('  username:   ', config.VPOS.USERNAME || '(missing)');
  console.log('  password:   ', config.VPOS.PASSWORD ? `***set*** (${config.VPOS.PASSWORD.length} chars)` : '(missing)');

  if (!config.VPOS.USERNAME || !config.VPOS.PASSWORD) {
    console.error('\nSet VPOS_USERNAME and VPOS_PASSWORD in backend/.env');
    process.exit(1);
  }

  const orderNumber = buildEpgOrderNumber();
  const register = await epgPost('register.do', {
    orderNumber,
    amount: '10000',
    currency: config.VPOS.CURRENCY,
    returnUrl: `${config.API_PUBLIC_URL}/api/v1/payments/return`,
    failUrl: `${config.API_PUBLIC_URL}/api/v1/payments/fail`,
    description: 'Viva vPOS smoke test',
    language: 'en',
    sessionTimeoutSecs: '600',
  });

  const errorCode = String(register.errorCode ?? '0');
  console.log('\nregister.do response:');
  console.log('  errorCode:   ', errorCode);
  console.log('  errorMessage:', register.errorMessage ?? '');
  console.log('  orderId:     ', register.orderId ?? '');
  console.log('  formUrl:     ', register.formUrl ? `${register.formUrl.slice(0, 80)}…` : '');

  if (errorCode !== '0' || !register.orderId) {
    const msg = register.errorMessage?.trim() || 'Could not start payment with the bank.';
    if (errorCode === '5' && msg.toLowerCase().includes('password')) {
      console.error('\nSmoke test FAILED — API user must change password in the merchant portal first.');
      console.error('  1. Open https://testepg.arca.am/epg_gui/#login');
      console.error('  2. Log in (web user: vivaavtodprocam_web) and change the API user password');
      console.error('  3. Update VPOS_PASSWORD in backend/.env and re-run this script');
    } else if (errorCode === '5' && msg.toLowerCase().includes('access denied')) {
      console.error('\nSmoke test FAILED — ACBA rejected the API login (Access denied).');
      console.error('  App config looks OK (mode, username, password length). The bank does not accept this password.');
      console.error('  Fix in merchant portal:');
      console.error('  1. https://testepg.arca.am/epg_gui/#login  (web user: vivaavtodprocam_web)');
      console.error('  2. Reset password for API user vivaavtodprocam_api (not the web user)');
      console.error('  3. Put exact password in backend/.env — use quotes if it contains # or $');
      console.error('     VPOS_PASSWORD="your-new-password"');
      console.error('  4. Restart backend (yarn dev does not reload .env) and re-run: npm run vpos:smoke-test');
      console.error('  Tip: choose a password without # to avoid .env parsing issues.');
    } else {
      console.error('\nSmoke test FAILED — check API credentials and VPOS_MODE.');
    }
    process.exit(1);
  }

  const status = await epgPost('getOrderStatusExtended.do', {
    orderId: register.orderId,
    language: 'en',
  });
  console.log('\ngetOrderStatusExtended.do response:');
  console.log('  errorCode:  ', String(status.errorCode ?? '0'));
  console.log('  orderStatus:', (status as { orderStatus?: number }).orderStatus ?? '');

  console.log('\nSmoke test PASSED — API login works. Open formUrl in a browser to pay with a test card.');
  if (register.formUrl) {
    console.log('\nPayment page:\n', register.formUrl);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
