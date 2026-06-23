import ErrorsUtil from '../utils/errors.util';
import HttpStatusCodesUtil from '../utils/http-status-codes.util';

const { InputValidationError } = ErrorsUtil;

/** Keep in sync with `client/app` `STUDENT_SELF_SERVICE_BOOKING_ENABLED`. */
export const STUDENT_SELF_SERVICE_BOOKING_ENABLED = true;

export function assertStudentSelfServiceBookingEnabled(): void {
  if (STUDENT_SELF_SERVICE_BOOKING_ENABLED) return;
  throw new InputValidationError(
    'Online lesson booking is temporarily unavailable. Please contact the office.',
    HttpStatusCodesUtil.SERVICE_UNAVAILABLE,
  );
}
