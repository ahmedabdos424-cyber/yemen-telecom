// تكوين مشغّلي الشرائح الموحّد (يمن موبايل / YOU / سبأفون) وأصناف العلامة التجارية.
// يُستخدم من شاشات الشرائح القائمة على نوع Sim لإزالة المصفوفات المكررة
// وتراكيب التحويل اليدوية (sim.operator === 'yemen_mobile' ? ...).

export interface OperatorMeta {
  key: string;
  name: string;
  brandBg: string;
  brandBorder: string;
  brandShadow: string;
  brandText: string;
  brandInactiveHover: string;
}

export const OPERATORS: OperatorMeta[] = [
  { key: 'yemen_mobile', name: 'يمن موبايل', brandBg: 'bg-op-ym', brandBorder: 'border-op-ym', brandShadow: 'shadow-lg', brandText: 'text-white', brandInactiveHover: 'hover:border-op-ym/60 hover:bg-op-ym-light' },
  { key: 'you', name: 'YOU', brandBg: 'bg-op-you', brandBorder: 'border-op-you', brandShadow: 'shadow-lg', brandText: 'text-you-text', brandInactiveHover: 'hover:border-op-you/60 hover:bg-op-you-light' },
  { key: 'sabafon', name: 'سبأفون', brandBg: 'bg-op-sf', brandBorder: 'border-op-sf', brandShadow: 'shadow-lg', brandText: 'text-white', brandInactiveHover: 'hover:border-op-sf/60 hover:bg-op-sf-light' },
];

export function operatorName(key: string): string {
  switch (key) {
    case 'yemen_mobile':
      return 'يمن موبايل';
    case 'you':
      return 'YOU';
    case 'sabafon':
      return 'سبأفون';
    default:
      return key;
  }
}

// صنف شارة الحالة لنوع Sim (متوفر/مباع/محجوز/مخصص/تالف).
export function simBadgeClass(status: string): string {
  return (
    status === 'available' ? 'badge-available' :
    status === 'sold' ? 'badge-sold' :
    status === 'reserved' ? 'badge-reserved' :
    status === 'allocated' || status === 'suspended' ? 'badge-pending' :
    'badge-damaged'
  );
}

export function simStatusLabel(status: string): string {
  return (
    status === 'available' ? 'متوفر' :
    status === 'sold' ? 'مباع' :
    status === 'reserved' ? 'محجوز' :
    status === 'allocated' || status === 'suspended' ? 'مخصص' :
    'تالف'
  );
}
