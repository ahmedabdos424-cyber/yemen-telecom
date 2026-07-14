/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import NavBar from '../components/NavBar';

vi.mock('../components/shared/MobileBottomNav', () => ({
  default: ({ items, activeId, onChange }: any) => (
    <nav data-testid="mobile-bottom-nav">
      {items.map((item: any) => (
        <button
          key={item.id}
          data-testid={`mobile-nav-${item.id}`}
          data-active={activeId === item.id}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  ),
}));

vi.mock('../components/shared/ProfileAvatar', () => ({
  default: ({ name, size }: any) => (
    <div data-testid="profile-avatar" data-name={name} data-size={size}>
      avatar
    </div>
  ),
}));

vi.mock('lucide-react', () => ({
  Home: (props: any) => <svg data-testid="icon-home" {...props} />,
  PlusCircle: (props: any) => <svg data-testid="icon-plus" {...props} />,
  UserPlus: (props: any) => <svg data-testid="icon-user-plus" {...props} />,
  Users: (props: any) => <svg data-testid="icon-users" {...props} />,
  Cpu: (props: any) => <svg data-testid="icon-cpu" {...props} />,
  UserCircle: (props: any) => <svg data-testid="icon-user-circle" {...props} />,
  LogOut: (props: any) => <svg data-testid="icon-logout" {...props} />,
}));

describe('NavBar', () => {
  const mockSetActiveTab = vi.fn();
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation items', () => {
    render(
      <NavBar
        role="agent"
        activeTab="home"
        setActiveTab={mockSetActiveTab}
        username="أحمد"
        onLogout={mockOnLogout}
      />
    );
    expect(screen.getAllByText('الرئيسية').length).toBeGreaterThan(0);
    expect(screen.getAllByText('تفعيل شريحة').length).toBeGreaterThan(0);
    expect(screen.getAllByText('البائعين').length).toBeGreaterThan(0);
    expect(screen.getAllByText('شرائحي').length).toBeGreaterThan(0);
  });

  it('calls onNavigate when item clicked', () => {
    render(
      <NavBar
        role="agent"
        activeTab="home"
        setActiveTab={mockSetActiveTab}
        username="أحمد"
        onLogout={mockOnLogout}
      />
    );
    const homeBtn = screen.getAllByText('الرئيسية')[0];
    fireEvent.click(homeBtn);
    expect(mockSetActiveTab).toHaveBeenCalledWith('home');
  });

  it('highlights active item', () => {
    render(
      <NavBar
        role="agent"
        activeTab="sellers"
        setActiveTab={mockSetActiveTab}
        username="أحمد"
        onLogout={mockOnLogout}
      />
    );
    const sellersText = screen.getAllByText('البائعين')[0];
    const sellersBtn = sellersText.closest('button') || sellersText.parentElement?.closest('button');
    expect(sellersBtn).not.toBeNull();
    expect(sellersBtn!.className).toContain('bg-red-600/10');
  });

  it('renders Arabic labels', () => {
    render(
      <NavBar
        role="agent"
        activeTab="home"
        setActiveTab={mockSetActiveTab}
        username="أحمد"
        onLogout={mockOnLogout}
      />
    );
    expect(screen.getAllByText('نظام التوزيع الموحد').length).toBeGreaterThan(0);
    expect(screen.getAllByText('تسجيل الخروج').length).toBeGreaterThan(0);
  });
});
