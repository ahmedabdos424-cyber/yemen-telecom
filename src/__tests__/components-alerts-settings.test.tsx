/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    dismissToast: vi.fn(),
    toastSuccess: vi.fn(),
    toastError: vi.fn(),
    toastWarning: vi.fn(),
    toastInfo: vi.fn(),
  }),
  ToastContainer: () => null,
}));

vi.mock('../components/shared/Skeleton', () => ({
  CardSkeleton: () => <div data-testid="card-skeleton" />,
}));

vi.mock('../components/shared/ConfirmModal', () => ({
  default: ({ open, onConfirm, onCancel, title, confirmLabel, cancelLabel }: any) =>
    open ? (
      <div data-testid="confirm-modal">
        <span>{title}</span>
        <button onClick={onConfirm}>{confirmLabel}</button>
        <button onClick={onCancel}>{cancelLabel}</button>
      </div>
    ) : null,
}));

vi.mock('../api/client', () => ({
  api: {
    getAuditLogs: vi.fn().mockResolvedValue([]),
    createBackup: vi.fn().mockResolvedValue({ filename: 'backup.json' }),
    downloadBackup: vi.fn().mockReturnValue('blob:http://localhost/backup'),
    toggleLockdown: vi.fn().mockResolvedValue({ locked: true }),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../lib/monitor', () => ({
  captureError: vi.fn(),
}));

vi.mock('lucide-react', () => ({
  Trash2: (props: any) => <svg data-testid="icon-trash" {...props} />,
}));

vi.mock('material-symbols', () => ({}));

import React from 'react';
import AlertsView from '../components/AlertsView';
import SettingsView from '../components/SettingsView';
import type { SystemAlert, SystemSettings } from '../types';

const defaultSettings: SystemSettings = {
  twoFAEnabled: true,
  email2FAEnabled: false,
  trustedDevicesEnabled: true,
  sessionTimeout: '15 دقيقة',
  passwordSpecialRequired: true,
  passwordExpiry90Days: false,
  passwordNoReuse5: true,
  maintenanceMode: false,
  language: 'ar',
  emailAlertsEnabled: true,
  smsAlertsEnabled: false,
  appNotificationsEnabled: true,
  stockShortageThreshold: 5,
  inactiveSimsThreshold: 90,
  maxFailedLoginsThreshold: 3,
  highRiskDuplicatesThreshold: 5,
  identityRemindersEnabled: false,
  identityRemindersFrequency: 'daily',
};

const mockAlerts: SystemAlert[] = [
  { id: '1', title: 'Stock Alert', description: 'Low stock warning', priority: 'high', time: '2h ago', category: 'مخزون' },
  { id: '2', title: 'Security Alert', description: 'Multiple failed logins', priority: 'medium', time: '1h ago', category: 'أمان' },
  { id: '3', title: 'Info Alert', description: 'System update available', priority: 'low', time: '30m ago', category: 'تحديث' },
];

// ==================== AlertsView Tests ====================
describe('AlertsView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the main heading', () => {
    render(<AlertsView alerts={mockAlerts} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    expect(screen.getByText('سجل التنبيهات والأمان العقدية')).toBeDefined();
  });

  it('displays all alerts', () => {
    render(<AlertsView alerts={mockAlerts} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    expect(screen.getByText('Stock Alert')).toBeDefined();
    expect(screen.getByText('Security Alert')).toBeDefined();
    expect(screen.getByText('Info Alert')).toBeDefined();
  });

  it('filters alerts by high priority', () => {
    render(<AlertsView alerts={mockAlerts} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByText('مرتفع'));
    expect(screen.getByText('Stock Alert')).toBeDefined();
    expect(screen.queryByText('Info Alert')).toBeNull();
  });

  it('filters alerts by medium priority', () => {
    render(<AlertsView alerts={mockAlerts} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByText('متوسط'));
    expect(screen.getByText('Security Alert')).toBeDefined();
    expect(screen.queryByText('Stock Alert')).toBeNull();
  });

  it('shows all alerts when "all" filter is selected', () => {
    render(<AlertsView alerts={mockAlerts} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByText('مرتفع'));
    fireEvent.click(screen.getByText('الكل'));
    expect(screen.getByText('Stock Alert')).toBeDefined();
    expect(screen.getByText('Security Alert')).toBeDefined();
  });

  it('shows "all stable" message when alerts exist but none match filter', () => {
    const onlyHigh: SystemAlert[] = [
      { id: '1', title: 'Stock Alert', description: 'Low stock', priority: 'high', time: '2h ago', category: 'مخزون' },
    ];
    render(<AlertsView alerts={onlyHigh} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByText('متوسط'));
    expect(screen.getByText('جميع الأنظمة مستقرة')).toBeDefined();
  });

  it('shows skeleton loaders when alerts array is empty', () => {
    render(<AlertsView alerts={[]} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    expect(screen.getAllByTestId('card-skeleton').length).toBe(3);
  });

  it('calls onResolveAlert when reorder button is clicked for high priority', () => {
    const onResolveAlert = vi.fn();
    render(<AlertsView alerts={mockAlerts} onResolveAlert={onResolveAlert} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    const reorderBtn = screen.getByText('إعادة طلب الكمية');
    fireEvent.click(reorderBtn);
    expect(onResolveAlert).toHaveBeenCalledWith('1');
  });

  it('calls onResolveAlert when security check is clicked for medium priority', () => {
    const onResolveAlert = vi.fn();
    render(<AlertsView alerts={mockAlerts} onResolveAlert={onResolveAlert} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    const securityBtn = screen.getByText('فحص الأمان والتحقق');
    fireEvent.click(securityBtn);
    expect(onResolveAlert).toHaveBeenCalledWith('2');
  });

  it('calls onResolveAlert when low priority alert dismiss is clicked', () => {
    const onResolveAlert = vi.fn();
    render(<AlertsView alerts={mockAlerts} onResolveAlert={onResolveAlert} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    const dismissBtn = screen.getByText('تجاهل وبلاغ مقروء');
    fireEvent.click(dismissBtn);
    expect(onResolveAlert).toHaveBeenCalledWith('3');
  });

  it('toggles SMS alerts setting', () => {
    const onUpdateSettings = vi.fn();
    render(<AlertsView alerts={mockAlerts} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    expect(onUpdateSettings).toHaveBeenCalled();
  });

  it('toggles email alerts setting', () => {
    const onUpdateSettings = vi.fn();
    render(<AlertsView alerts={mockAlerts} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]);
    expect(onUpdateSettings).toHaveBeenCalled();
  });

  it('toggles browser notifications setting', () => {
    const onUpdateSettings = vi.fn();
    render(<AlertsView alerts={mockAlerts} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[2]);
    expect(onUpdateSettings).toHaveBeenCalled();
  });

  it('displays system thresholds', () => {
    render(<AlertsView alerts={mockAlerts} onResolveAlert={vi.fn()} settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    expect(screen.getByText('5%')).toBeDefined();
    expect(screen.getByText('90 يوماً')).toBeDefined();
    expect(screen.getByText('3 محاولات')).toBeDefined();
    expect(screen.getByText('5 مرات')).toBeDefined();
  });
});

// ==================== SettingsView Tests ====================
describe('SettingsView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the main heading', () => {
    render(<SettingsView settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    expect(screen.getByText('بروتوكولات الأمان والولوج العقدي')).toBeDefined();
  });

  it('toggles 2FA setting', () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsView settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const toggle = screen.getAllByRole('checkbox')[0];
    fireEvent.click(toggle);
    expect(onUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ twoFAEnabled: false }));
  });

  it('toggles email 2FA setting', () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsView settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const toggle = screen.getAllByRole('checkbox')[1];
    fireEvent.click(toggle);
    expect(onUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ email2FAEnabled: true }));
  });

  it('toggles trusted devices setting', () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsView settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const toggle = screen.getAllByRole('checkbox')[2];
    fireEvent.click(toggle);
    expect(onUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ trustedDevicesEnabled: false }));
  });

  it('toggles maintenance mode', () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsView settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const toggle = screen.getAllByRole('checkbox')[6];
    fireEvent.click(toggle);
    expect(onUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ maintenanceMode: true }));
  });

  it('opens lockdown confirmation modal', () => {
    render(<SettingsView settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByText(/قفل الطوارئ الإجمالي فوراً/));
    expect(screen.getByTestId('confirm-modal')).toBeDefined();
  });

  it('changes session timeout', () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsView settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const select = screen.getByDisplayValue('15 دقيقة');
    fireEvent.change(select, { target: { value: '30 دقيقة' } });
    expect(onUpdateSettings).toHaveBeenCalled();
  });

  it('updates stock shortage threshold via slider', () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsView settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '10' } });
    expect(onUpdateSettings).toHaveBeenCalled();
  });

  it('updates inactive SIMs threshold via +/- buttons', () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsView settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const plusBtn = screen.getByText('+');
    fireEvent.click(plusBtn);
    expect(onUpdateSettings).toHaveBeenCalled();
  });

  it('updates max failed logins threshold', () => {
    const onUpdateSettings = vi.fn();
    render(<SettingsView settings={defaultSettings} onUpdateSettings={onUpdateSettings} />);
    const select = screen.getByDisplayValue('3 محاولات (موصى به)');
    fireEvent.change(select, { target: { value: '5' } });
    expect(onUpdateSettings).toHaveBeenCalled();
  });

  it('opens delete account confirmation', () => {
    render(<SettingsView settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByText('حذف الحساب'));
    expect(screen.getByText('هل أنت متأكد من حذف الحساب؟', { exact: false })).toBeDefined();
  });

  it('closes delete account modal on cancel', () => {
    render(<SettingsView settings={defaultSettings} onUpdateSettings={vi.fn()} />);
    fireEvent.click(screen.getByText('حذف الحساب'));
    fireEvent.click(screen.getByText('إلغاء'));
    expect(screen.queryByText('هل أنت متأكد من حذف الحساب؟')).toBeNull();
  });
});
