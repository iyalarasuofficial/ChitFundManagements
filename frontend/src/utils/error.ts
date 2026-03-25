const SAFE_MESSAGE_PATTERNS: RegExp[] = [
  /invalid credentials/i,
  /phone must be a valid 10-digit number/i,
  /name, phone, and password are required/i,
  /user with this phone number already exists/i,
  /user with this email already exists/i,
  /insufficient wallet balance/i,
  /insufficient money in wallet/i,
  /overpayment not allowed/i,
  /payment amount must be a positive number/i,
  /not authorized to record this payment/i,
  /no groups found/i,
  /group not found/i,
  /contribution not found/i,
  /no active auction/i,
  /cannot start auction\. pot amount is 0/i,
  /minimum required pot/i,
  /no active members available to start auction/i,
  /already has an active auction/i,
  /bid amount/i,
  /cannot bid/i,
  /no active auction to end/i,
  /only organizer/i,
  /already paid/i,
  /valid 10-digit phone number/i,
  /request timeout/i,
  /unable to reach server/i,
  /group has completed all cycles/i,
];

const SENSITIVE_MESSAGE_PATTERNS: RegExp[] = [
  /prisma/i,
  /stack/i,
  /jwt/i,
  /token/i,
  /sql/i,
  /database/i,
  /undefined/i,
  /cannot read/i,
  /internal/i,
  /exception/i,
  /econn/i,
  /timeout/i,
];

export const getClientErrorMessage = (
  error: unknown,
  fallbackMessage: string
): string => {
  const err = error as any;
  const status = err?.response?.status as number | undefined;

  const apiMessage =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message;

  if (typeof apiMessage === 'string' && apiMessage.trim()) {
    const cleanedMessage = apiMessage.trim();

    if (SAFE_MESSAGE_PATTERNS.some((pattern) => pattern.test(cleanedMessage))) {
      return cleanedMessage;
    }

    if (SENSITIVE_MESSAGE_PATTERNS.some((pattern) => pattern.test(cleanedMessage))) {
      return fallbackMessage;
    }
  }

  if (status === 401) return 'Your session expired. Please log in again.';
  if (status === 403) return 'You are not allowed to perform this action.';
  if (status === 404) return 'The requested data was not found.';
  if (status === 409) return 'This action conflicts with existing data.';
  if (status === 422) return 'Please verify your input and try again.';
  if (status && status >= 500) return 'Something went wrong on our side. Please try again.';

  return fallbackMessage;
};