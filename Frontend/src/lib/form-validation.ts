/**
 * Reusable client-side form validation helpers.
 *
 * Enforces the same concerns the backend Zod schemas do:
 *   - required fields (non-empty after trimming)
 *   - value types (email, Tanzanian phone)
 *   - min / max length bounds
 *   - cross-field checks (password confirmation)
 *
 * Every validator returns an error string when invalid, or `null` when valid,
 * so callers can render per-field messages before any data is sent.
 */

export const EMAIL_RE = /\S+@\S+\.\S+/;
// Matches Tanzanian numbers: 0712... / +255 712... / 255712... / 6(12-20) 8 digits
export const TZ_PHONE_RE = /^(\+?255|0)?[67][0-9]{8}$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test((value ?? '').trim());
}

export function isTzPhone(value: string): boolean {
  return TZ_PHONE_RE.test((value ?? '').replace(/[\s-]/g, ''));
}

export interface FieldRule {
  label?: string;
  required?: boolean;
  min?: number;
  max?: number;
  type?: 'email' | 'phone';
  message?: string;
}

export interface CrossFieldCheck {
  field: string;
  matchWith: string;
  message: string;
}

/**
 * Validates a single field against a rule.
 * Returns an error message or `null`.
 */
export function validateField(
  field: string,
  value: string,
  rule: FieldRule = {}
): string | null {
  const label = rule.label ?? field;
  const v = ((value as string) ?? '').trim();

  if (rule.required && !v) {
    return `${label} is required.`;
  }

  if (v) {
    if (rule.type === 'email' && !isEmail(v)) {
      return rule.message ?? 'Please enter a valid email address.';
    }
    if (rule.type === 'phone' && !isTzPhone(v)) {
      return rule.message ?? 'Enter a valid Tanzanian phone number.';
    }
    if (rule.max != null && v.length > rule.max) {
      return `${label} must be ${rule.max} characters or fewer.`;
    }
    if (rule.min != null && v.length < rule.min) {
      return `${label} must be at least ${rule.min} characters.`;
    }
  }

  return null;
}

/**
 * Runs multiple cross-field checks (e.g. password confirmation).
 * Returns an object of field -> message for any failures.
 */
export function validateCrossFields(
  values: Record<string, string>,
  checks: CrossFieldCheck[]
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const check of checks) {
    if (values[check.field] !== values[check.matchWith]) {
      errors[check.field] = check.message;
    }
  }
  return errors;
}