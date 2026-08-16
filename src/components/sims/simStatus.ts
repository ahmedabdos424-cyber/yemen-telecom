/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const SIM_STATUS_LABELS: Record<string, string> = {
  available: 'متاح',
  assigned: 'مسندة',
  activated: 'مفعّلة',
  sold: 'مباع',
  reserved: 'محجوز',
  inactive: 'غير نشط',
  suspended: 'معلّقة',
};

export function statusBadgeClass(status: string): string {
  switch (status) {
    case 'available': return 'badge-available';
    case 'sold':
    case 'activated': return 'badge-sold';
    case 'reserved':
    case 'assigned': return 'badge-reserved';
    default: return 'badge-inactive';
  }
}

export function statusLabel(status: string): string {
  return SIM_STATUS_LABELS[status] || 'تالف';
}