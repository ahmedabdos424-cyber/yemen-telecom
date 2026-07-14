/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import SplashScreen from '../components/SplashScreen';

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
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('SplashScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders splash screen', () => {
    render(<SplashScreen onFinish={vi.fn()} />);
    expect(screen.getByText('يمن تليكوم')).toBeInTheDocument();
  });

  it('shows logo', () => {
    render(<SplashScreen onFinish={vi.fn()} />);
    const img = screen.getByAltText('يمن تليكوم');
    expect(img).toBeInTheDocument();
  });

  it('calls onComplete after animation', () => {
    const onFinish = vi.fn();
    render(<SplashScreen onFinish={onFinish} />);
    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('renders with Arabic text', () => {
    render(<SplashScreen onFinish={vi.fn()} />);
    expect(screen.getByText('يمن تليكوم')).toBeInTheDocument();
    expect(screen.getByText('v4.2.0')).toBeInTheDocument();
  });
});
