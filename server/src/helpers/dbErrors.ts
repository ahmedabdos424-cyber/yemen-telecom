/**
 * Shared database error handling utilities
 * Handles PostgreSQL unique constraint violations (error code 23505)
 */

export type UniqueViolationKind = 'phone' | 'username' | 'email' | null;

/**
 * Extracts the type of unique constraint violation from a PostgreSQL error
 * @param err - The error object from a database operation
 * @returns The type of violation ('phone', 'username', 'email') or null if not a unique violation
 */
export function getUniqueViolationKind(err: unknown): UniqueViolationKind {
  if (!err || typeof err !== 'object') return null;

  const e = err as { code?: string; message?: string };

  // Check for PostgreSQL unique violation error code
  if (e.code !== '23505') return null;

  const msg = e.message ?? '';

  // Check for phone-related constraints
  if (
    msg.includes('idx_agents_phone_unique') ||
    msg.includes('agents_phone_key') ||
    msg.includes('phone')
  ) {
    return 'phone';
  }

  // Check for username-related constraints
  if (
    msg.includes('users_username_key') ||
    msg.includes('idx_users_username') ||
    msg.includes('users_pkey') ||
    msg.includes('username')
  ) {
    return 'username';
  }

  // Check for email-related constraints
  if (
    msg.includes('email') ||
    msg.includes('users_email_key')
  ) {
    return 'email';
  }

  return null;
}

/**
 * Formats a database error message for unique constraint violations
 * @param kind - The type of violation
 * @param fieldName - The field name in Arabic for user display
 * @returns Localized error message
 */
export function formatUniqueViolationMessage(kind: UniqueViolationKind, _fieldName: string = 'الحقل'): string {
  switch (kind) {
    case 'phone':
      return 'رقم الهاتف مستخدم بالفعل، يرجى استخدام رقم مختلف';
    case 'username':
      return 'اسم المستخدم غير متاح؛ يرجى اختيار اسم مستخدم آخر';
    case 'email':
      return 'البريد الإلكتروني مستخدم بالفعل؛ يرجى استخدام بريد آخر';
    default:
      return 'حدث تعارض في البيانات؛ يرجى التحقق من المدخلات';
  }
}