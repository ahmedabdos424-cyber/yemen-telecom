/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TopBar from '../components/TopBar';
import type { ViewType } from '../types';

vi.mock('../components/shared/ProfileAvatar', () => ({
  default: ({ name, size }: any) => (
    <div data-testid="profile-avatar" data-name={name} data-size={size}>
      avatar
    </div>
  ),
}));

describe('TopBar', () => {
  const mockSetView = vi.fn();
  const mockOnMenuToggle = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders title', () => {
    render(
      <TopBar
        currentView="dashboard"
        setView={mockSetView}
        onMenuToggle={mockOnMenuToggle}
        unresolvedAlertsCount={0}
      />
    );
    expect(screen.getByText(/لوحة التحكم المركزية/)).toBeInTheDocument();
  });

  it('renders back button when onBack provided', () => {
    render(
      <TopBar
        currentView="dashboard"
        setView={mockSetView}
        onMenuToggle={mockOnMenuToggle}
        unresolvedAlertsCount={0}
      />
    );
    const menuBtn = screen.getByLabelText('القائمة');
    expect(menuBtn).toBeInTheDocument();
  });

  it('calls onMenuToggle when menu button clicked', () => {
    render(
      <TopBar
        currentView="dashboard"
        setView={mockSetView}
        onMenuToggle={mockOnMenuToggle}
        unresolvedAlertsCount={0}
      />
    );
    const menuBtn = screen.getByLabelText('القائمة');
    fireEvent.click(menuBtn);
    expect(mockOnMenuToggle).toHaveBeenCalledTimes(1);
  });

  it('renders notification badge', () => {
    render(
      <TopBar
        currentView="dashboard"
        setView={mockSetView}
        onMenuToggle={mockOnMenuToggle}
        unresolvedAlertsCount={5}
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders profile avatar', () => {
    render(
      <TopBar
        currentView="dashboard"
        setView={mockSetView}
        onMenuToggle={mockOnMenuToggle}
        unresolvedAlertsCount={0}
        displayName="أحمد"
      />
    );
    const avatar = screen.getByTestId('profile-avatar');
    expect(avatar).toBeInTheDocument();
    expect(avatar.getAttribute('data-name')).toBe('أحمد');
  });
});
