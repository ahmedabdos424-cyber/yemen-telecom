/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../components/shared/ErrorBoundary';

vi.mock('../../lib/monitor.ts', () => ({
  captureError: vi.fn(),
}));

function ThrowingChild() {
  throw new Error('Test error');
}

function SafeChild() {
  return <div>Child content</div>;
}

function ConditionalThrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>Child content</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <SafeChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('حدث خطأ غير متوقع')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('renders retry button', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <ThrowingChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('إعادة المحاولة')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('resets error state on retry click', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const onRetry = vi.fn();

    function Wrapper() {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <>
          <ErrorBoundary onRetry={onRetry}>
            <ConditionalThrower shouldThrow={shouldThrow} />
          </ErrorBoundary>
          <button onClick={() => setShouldThrow(false)} data-testid="fix-btn">Fix</button>
        </>
      );
    }

    render(<Wrapper />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText('Child content')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('fix-btn'));

    fireEvent.click(screen.getByText('إعادة المحاولة'));
    expect(onRetry).toHaveBeenCalledTimes(1);

    expect(screen.getByText('Child content')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});
