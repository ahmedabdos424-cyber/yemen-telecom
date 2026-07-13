/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../components/shared/EmptyState';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, whileTap, layoutId, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
  },
}));

vi.mock('lucide-react', () => ({
  PackageOpen: (props: any) => (
    <svg data-testid="package-open-icon" {...props} />
  ),
}));

describe('EmptyState', () => {
  it('renders with message', () => {
    render(<EmptyState title="لا توجد بيانات" />);
    expect(screen.getByText('لا توجد بيانات')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    render(<EmptyState title="لا توجد بيانات" icon={<span data-testid="custom-icon">★</span>} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('renders Arabic text correctly', () => {
    render(
      <EmptyState
        title="لا توجد سجلات متاحة"
        description="لم يتم العثور على أي سجلات مطابقة لمعايير البحث"
      />
    );
    expect(screen.getByText('لا توجد سجلات متاحة')).toBeInTheDocument();
    expect(screen.getByText('لم يتم العثور على أي سجلات مطابقة لمعايير البحث')).toBeInTheDocument();
  });
});
