/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingScreen from '../components/shared/LoadingScreen';

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => {
      const { initial, animate, transition, whileHover, whileTap, layoutId, ...rest } = props;
      return <div {...rest}>{children}</div>;
    },
    h1: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <h1 {...rest}>{children}</h1>;
    },
    p: ({ children, ...props }: any) => {
      const { initial, animate, transition, ...rest } = props;
      return <p {...rest}>{children}</p>;
    },
  },
}));

describe('LoadingScreen', () => {
  it('renders loading indicator', () => {
    const { container } = render(<LoadingScreen />);
    expect(container.querySelector('.bg-red-500')).toBeTruthy();
  });

  it('renders with custom message', () => {
    render(<LoadingScreen message="جاري تحميل البيانات..." />);
    expect(screen.getByText('جاري تحميل البيانات...')).toBeInTheDocument();
  });
});
