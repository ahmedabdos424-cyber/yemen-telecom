export function getErrorMessage(error: unknown, fallback = 'حدث خطأ غير متوقع'): string {
  if (error instanceof Error) {
    if (error.message && !error.message.includes('{}') && !error.message.includes('[object Object]')) {
      return error.message;
    }
    return error.name !== 'Error' ? error.name : fallback;
  }
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    if (typeof obj.title === 'string') return obj.title;
  }
  return fallback;
}