export type OperatorName = 'Yemen Mobile' | 'Sabafon' | 'YOU';

export function useOperatorClass(operator: OperatorName) {
  const key = operator === 'Yemen Mobile' ? 'ym' : operator === 'Sabafon' ? 'sf' : 'you';
  return {
    op: `op-${key}`,
    bgLight: `bg-op-${key}-light`,
    bg: `bg-op-${key}`,
    badge: `badge-${key}`,
    pill: `op-pill-${key}`,
    statCard: `stat-card-${key}`,
    border: `border-op-${key}`,
  };
}
