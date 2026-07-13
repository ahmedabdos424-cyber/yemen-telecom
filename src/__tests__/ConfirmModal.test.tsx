/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmModal from '../components/shared/ConfirmModal';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...filterMotionProps(props)}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

function filterMotionProps(props: Record<string, any>) {
  const { initial, animate, exit, transition, whileHover, whileTap, layoutId, ...rest } = props;
  return rest;
}

describe('ConfirmModal', () => {
  const defaultProps = {
    open: true,
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    title: 'تأكيد الحذف',
    message: 'هل أنت متأكد من حذف هذا العنصر؟',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with title and message', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('تأكيد الحذف')).toBeInTheDocument();
    expect(screen.getByText('هل أنت متأكد من حذف هذا العنصر؟')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    const confirmBtn = screen.getByText('تأكيد');
    fireEvent.click(confirmBtn);
    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', () => {
    render(<ConfirmModal {...defaultProps} />);
    const cancelBtn = screen.getByText('إلغاء');
    fireEvent.click(cancelBtn);
    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders danger variant correctly', () => {
    render(<ConfirmModal {...defaultProps} variant="danger" />);
    const confirmBtn = screen.getByText('تأكيد');
    expect(confirmBtn.className).toContain('bg-red-600');
  });

  it('renders warning variant correctly', () => {
    render(<ConfirmModal {...defaultProps} variant="warning" />);
    const confirmBtn = screen.getByText('تأكيد');
    expect(confirmBtn.className).toContain('bg-amber-500');
  });

  it('does not render when isOpen is false', () => {
    render(<ConfirmModal {...defaultProps} open={false} />);
    expect(screen.queryByText('تأكيد الحذف')).not.toBeInTheDocument();
    expect(screen.queryByText('تأكيد')).not.toBeInTheDocument();
    expect(screen.queryByText('إلغاء')).not.toBeInTheDocument();
  });
});
