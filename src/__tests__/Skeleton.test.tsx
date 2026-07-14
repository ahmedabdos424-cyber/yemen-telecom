/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, CardSkeleton, TableSkeleton } from '../components/shared/Skeleton';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, whileTap, layoutId, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

describe('Skeleton', () => {
  it('Skeleton: renders with default height', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el).toBeInTheDocument();
    expect(el.className).toContain('bg-slate-800');
    expect(el.className).toContain('animate-pulse');
  });

  it('Skeleton: renders with custom height/width', () => {
    const { container } = render(<Skeleton width="100px" height="20px" />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveStyle({ width: '100px', height: '20px' });
  });

  it('CardSkeleton: renders card skeleton', () => {
    const { container } = render(<CardSkeleton />);
    expect(container.querySelector('.rounded-2xl')).toBeInTheDocument();
    expect(container.querySelectorAll('.bg-slate-800').length).toBeGreaterThan(0);
  });

  it('TableSkeleton: renders table skeleton with rows', () => {
    const { container } = render(<TableSkeleton rows={3} />);
    const rows = container.querySelectorAll('.flex.gap-4.p-3');
    expect(rows.length).toBe(4);
  });
});
