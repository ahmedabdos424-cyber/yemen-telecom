/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BottomNav from '../components/BottomNav';
import type { ViewType } from '../types';

vi.mock('../components/AdminMoreDrawer', () => ({
  default: ({ isMoreOpen, setIsMoreOpen }: any) =>
    isMoreOpen ? (
      <div data-testid="admin-more-drawer">
        <button onClick={() => setIsMoreOpen(false)}>close drawer</button>
      </div>
    ) : null,
}));

vi.mock('../components/shared/MobileBottomNav', () => ({
  default: ({ items, activeId, onChange, badgeCount, badgeOnId }: any) => (
    <nav data-testid="mobile-bottom-nav">
      {items.map((item: any) => (
        <button
          key={item.id}
          data-testid={`nav-item-${item.id}`}
          data-active={activeId === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
          {badgeCount > 0 && item.id === badgeOnId && (
            <span data-testid="badge">{badgeCount}</span>
          )}
        </button>
      ))}
    </nav>
  ),
}));

describe('BottomNav', () => {
  const mockSetView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation items', () => {
    render(
      <BottomNav
        currentView="dashboard"
        setView={mockSetView}
        unresolvedAlertsCount={0}
      />
    );
    expect(screen.getByText('الرئيسية')).toBeInTheDocument();
    expect(screen.getByText('الوكلاء')).toBeInTheDocument();
    expect(screen.getByText('شرائحي')).toBeInTheDocument();
    expect(screen.getByText('التقارير')).toBeInTheDocument();
    expect(screen.getByText('الإعدادات')).toBeInTheDocument();
    expect(screen.getByText('المزيد')).toBeInTheDocument();
  });

  it('calls onNavigate when item clicked', () => {
    render(
      <BottomNav
        currentView="dashboard"
        setView={mockSetView}
        unresolvedAlertsCount={0}
      />
    );
    fireEvent.click(screen.getByText('الوكلاء'));
    expect(mockSetView).toHaveBeenCalledWith('agents');
  });

  it('highlights active item', () => {
    render(
      <BottomNav
        currentView="sims"
        setView={mockSetView}
        unresolvedAlertsCount={0}
      />
    );
    const simsItem = screen.getByTestId('nav-item-sims');
    expect(simsItem.getAttribute('data-active')).toBe('true');
  });

  it('renders Arabic labels', () => {
    render(
      <BottomNav
        currentView="dashboard"
        setView={mockSetView}
        unresolvedAlertsCount={0}
      />
    );
    expect(screen.getByText('الرئيسية')).toBeInTheDocument();
    expect(screen.getByText('الإعدادات')).toBeInTheDocument();
  });
});
