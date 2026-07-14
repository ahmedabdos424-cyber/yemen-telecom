/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';

const mockToastFns = {
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
  toastInfo: vi.fn(),
  dismissToast: vi.fn(),
};

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    ...mockToastFns,
  }),
  ToastContainer: () => null,
}));

vi.mock('../hooks/useOcr', () => ({
  useOcr: () => ({
    recognize: vi.fn().mockResolvedValue('Recognized Name'),
    recognizeRaw: vi.fn().mockResolvedValue(''),
    progress: { visible: false, progress: 0, stage: '' },
    setProgress: vi.fn(),
  }),
}));

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    getAgentPerformance: vi.fn().mockResolvedValue([
      { id: '1', agent_name: 'Agent 1', region: 'Sanaa', seller_count: 5, sales_30_days: 1000 },
    ]),
    getDailySales: vi.fn().mockResolvedValue([
      { id: '1', activations: 10 },
    ]),
    getSellerPerformance: vi.fn().mockResolvedValue([
      { id: '1', name: 'Seller 1', store_name: 'Store 1', region: 'Aden', sales_30_days: 500, efficiency: 85 },
    ]),
    getOperatorDistribution: vi.fn().mockResolvedValue({ yemen_mobile: 60 }),
    getDuplicateIdentities: vi.fn().mockResolvedValue([
      { idNo: '111', name: 'Person A', region: 'Sanaa', risk: 'مرتفع جداً', simsCount: 5, duplicatesCount: 3, avatarInitials: 'PA' },
      { idNo: '222', name: 'Person B', region: 'Aden', risk: 'متوسط', simsCount: 2, duplicatesCount: 2, avatarInitials: 'PB' },
    ]),
    getAuditLogs: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('../api/client', () => ({ api: mockApi }));

vi.mock('../components/shared/CameraCapture', () => ({
  default: (props: any) => <button data-testid="camera-capture" onClick={() => props.onCapture?.('fake-image')} />,
  DocumentCapture: (props: any) => <div data-testid="document-capture" />,
}));

vi.mock('../components/shared/OperatorLogo', () => ({
  default: (props: any) => <div data-testid="operator-logo" />,
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

vi.mock('motion/react', () => ({
  motion: new Proxy({}, {
    get: (_: any, prop: string) => {
      if (typeof prop === 'string') {
        return React.forwardRef(({ children, ...props }: any, ref: any) =>
          React.createElement(prop, { ...props, ref }, children)
        );
      }
      return undefined;
    }
  }),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', () => {
  const icons = [
    'Check', 'Camera', 'RefreshCw', 'Save', 'X', 'Phone', 'User', 'Shield', 'CreditCard', 'Layers',
    'Network', 'ShieldAlert', 'MapPin', 'Activity', 'HelpCircle',
    'CheckCircle', 'AlertTriangle', 'Search', 'Download', 'ZoomIn', 'ZoomOut', 'Maximize',
    'FileText', 'Lock', 'Eye', 'EyeOff', 'ChevronLeft', 'Smartphone', 'Copy', 'CircleCheck',
  ];
  const result: any = {};
  icons.forEach(name => { result[name] = (props: any) => <svg data-testid={`icon-${name.toLowerCase()}`} {...props} />; });
  return result;
});

vi.mock('material-symbols', () => ({}));

vi.mock('d3', () => {
  const select = vi.fn(() => ({
    selectAll: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    join: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    call: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    transition: vi.fn().mockReturnThis(),
  }));
  const forceLinkInstance = {
    id: vi.fn().mockReturnThis(),
    distance: vi.fn().mockReturnThis(),
  };
  const forceManyBodyInstance = {
    strength: vi.fn().mockReturnThis(),
  };
  return {
    select,
    zoom: vi.fn(() => ({
      scaleExtent: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
    })),
    zoomIdentity: {},
    forceSimulation: vi.fn(() => ({
      force: vi.fn().mockReturnThis(),
      on: vi.fn().mockReturnThis(),
      alpha: vi.fn().mockReturnThis(),
      restart: vi.fn().mockReturnThis(),
      stop: vi.fn(),
    })),
    forceLink: vi.fn(() => forceLinkInstance),
    forceManyBody: vi.fn(() => forceManyBodyInstance),
    forceCenter: vi.fn().mockReturnThis(),
    forceCollide: vi.fn(() => ({
      radius: vi.fn().mockReturnThis(),
    })),
    drag: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
    })),
  };
});

import ReportsView from '../components/ReportsView';
import ActivateSimForm from '../components/ActivateSimForm';
import LoginScreen from '../components/LoginScreen';
import GeographicRiskView from '../components/GeographicRiskView';

function makePending() {
  let resolve: (v: any) => void;
  const p = new Promise(r => { resolve = r; });
  return { promise: p, resolve: resolve! };
}

// ==================== ReportsView Tests ====================
describe('ReportsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getAgentPerformance.mockResolvedValue([
      { id: '1', agent_name: 'Agent 1', region: 'Sanaa', seller_count: 5, sales_30_days: 1000 },
    ]);
    mockApi.getDailySales.mockResolvedValue([{ id: '1', activations: 10 }]);
    mockApi.getSellerPerformance.mockResolvedValue([
      { id: '1', name: 'Seller 1', store_name: 'Store 1', region: 'Aden', sales_30_days: 500, efficiency: 85 },
    ]);
    mockApi.getOperatorDistribution.mockResolvedValue({ yemen_mobile: 60 });
  });

  it('shows loading state initially', () => {
    const blocker = makePending();
    mockApi.getAgentPerformance.mockReturnValue(blocker.promise);
    mockApi.getDailySales.mockReturnValue(blocker.promise);
    mockApi.getSellerPerformance.mockReturnValue(blocker.promise);
    mockApi.getOperatorDistribution.mockReturnValue(blocker.promise);
    render(<ReportsView />);
    expect(screen.getByText('جاري تحميل التقارير...')).toBeDefined();
    blocker.resolve([]);
  });

  it('renders report summary after loading', async () => {
    await act(async () => {
      render(<ReportsView />);
    });
    expect(screen.getByText('إجمالي المبيعات المحقّقة (شهري)')).toBeDefined();
    expect(screen.getByText('الشرائح الموزّعة المفعّلة')).toBeDefined();
  });

  it('opens filter drawer', async () => {
    await act(async () => {
      render(<ReportsView />);
    });
    fireEvent.click(screen.getByTitle('تصفية الفلاتر'));
    expect(screen.getByText('خيارات تصفية وتجهيز التقارير')).toBeDefined();
  });

  it('closes filter drawer on cancel', async () => {
    await act(async () => {
      render(<ReportsView />);
    });
    fireEvent.click(screen.getByTitle('تصفية الفلاتر'));
    fireEvent.click(screen.getByText('إلغاء'));
    expect(screen.queryByText('خيارات تصفية وتجهيز التقارير')).toBeNull();
  });

  it('calls export when export button is clicked', async () => {
    mockToastFns.toastInfo.mockClear();
    await act(async () => {
      render(<ReportsView />);
    });
    fireEvent.click(screen.getByText(/تصدير التقرير/));
    expect(mockToastFns.toastInfo).toHaveBeenCalled();
  });

  it('shows agent performance list', async () => {
    await act(async () => {
      render(<ReportsView />);
    });
    expect(screen.getByText('Agent 1')).toBeDefined();
  });

  it('shows seller performance list', async () => {
    await act(async () => {
      render(<ReportsView />);
    });
    expect(screen.getByText('Store 1')).toBeDefined();
  });
});

// ==================== ActivateSimForm Tests ====================
describe('ActivateSimForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the form heading', () => {
    render(<ActivateSimForm onSimActivated={vi.fn()} />);
    expect(screen.getByText('تفعيل شريحة جديدة')).toBeDefined();
  });

  it('renders operator selection cards', () => {
    render(<ActivateSimForm onSimActivated={vi.fn()} />);
    expect(screen.getByText('يمن موبايل')).toBeDefined();
    expect(screen.getByText('سبأفون')).toBeDefined();
    expect(screen.getByText('YOU')).toBeDefined();
  });

  it('selects Sabafon operator when clicked', () => {
    render(<ActivateSimForm onSimActivated={vi.fn()} />);
    fireEvent.click(screen.getByText('سبأفون'));
    expect(screen.getByText('سبأفون')).toBeDefined();
  });

  it('selects YOU operator when clicked', () => {
    render(<ActivateSimForm onSimActivated={vi.fn()} />);
    fireEvent.click(screen.getByText('YOU'));
    expect(screen.getByText('YOU')).toBeDefined();
  });

  it('shows warning when submitting empty form', async () => {
    mockToastFns.toastWarning.mockClear();
    render(<ActivateSimForm onSimActivated={vi.fn()} />);
    fireEvent.click(screen.getByText(/حفظ البيانات وتفعيل الشريحة/));
    await waitFor(() => {
      expect(mockToastFns.toastWarning).toHaveBeenCalled();
    });
  });

  it('fills form and submits successfully', async () => {
    const onSimActivated = vi.fn().mockResolvedValue(undefined);
    render(<ActivateSimForm onSimActivated={onSimActivated} />);

    fireEvent.change(screen.getByPlaceholderText('أدخل الاسم الثلاثي واللقب'), { target: { value: 'Ahmed Ali' } });
    fireEvent.change(screen.getByPlaceholderText('10xxxxxxxxxx'), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByPlaceholderText('89967XXXXXXXXXXXX'), { target: { value: '8996700123456789' } });
    fireEvent.change(screen.getByPlaceholderText('05xxxxxxxx'), { target: { value: '777123456' } });

    fireEvent.click(screen.getByText(/حفظ البيانات وتفعيل الشريحة/));
    expect(onSimActivated).toHaveBeenCalled();
  });

  it('clears form when clear button is clicked', async () => {
    render(<ActivateSimForm onSimActivated={vi.fn()} />);
    const nameInput = screen.getByPlaceholderText('أدخل الاسم الثلاثي واللقب');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('مسح البيانات'));
    expect((nameInput as HTMLInputElement).value).toBe('');
  });

  it('shows phone length validation', async () => {
    render(<ActivateSimForm onSimActivated={vi.fn()} />);
    const phoneInput = screen.getByPlaceholderText('05xxxxxxxx');
    fireEvent.change(phoneInput, { target: { value: '777' } });
    expect(screen.getByText('يجب أن يتكون الرقم من 9 أرقام')).toBeDefined();
  });
});

// ==================== LoginScreen Tests ====================
describe('LoginScreen', () => {
  const defaultProps = {
    onLogin: vi.fn().mockResolvedValue({ role: 'manager', commit: vi.fn() }),
    darkMode: false,
    setDarkMode: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('renders the login form', () => {
    render(<LoginScreen {...defaultProps} />);
    expect(screen.getByText('يمن تليكوم')).toBeDefined();
    expect(screen.getByText('تسجيل الدخول')).toBeDefined();
  });

  it('shows error when submitting with empty username', async () => {
    render(<LoginScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('تسجيل الدخول'));
    expect(screen.getByText('الرجاء إدخال اسم المستخدم')).toBeDefined();
  });

  it('shows error when submitting with empty password', async () => {
    render(<LoginScreen {...defaultProps} />);
    const usernameInput = screen.getByPlaceholderText('أدخل اسم المستخدم');
    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.click(screen.getByText('تسجيل الدخول'));
    expect(screen.getByText('الرجاء إدخال كلمة المرور')).toBeDefined();
  });

  it('toggles password visibility', () => {
    render(<LoginScreen {...defaultProps} />);
    const toggleBtn = screen.getByLabelText(/إظهار/);
    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText(/إخفاء/)).toBeDefined();
  });

  it('calls onLogin with correct credentials', async () => {
    const onLogin = vi.fn().mockResolvedValue({ role: 'manager', commit: vi.fn() });
    render(<LoginScreen {...defaultProps} onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('أدخل اسم المستخدم'), { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'pass123' } });
    fireEvent.click(screen.getByText('تسجيل الدخول'));

    expect(onLogin).toHaveBeenCalledWith('manager', 'admin', 'pass123');
  });

  it('shows error message when login fails', async () => {
    const onLogin = vi.fn().mockResolvedValue(null);
    render(<LoginScreen {...defaultProps} onLogin={onLogin} />);

    fireEvent.change(screen.getByPlaceholderText('أدخل اسم المستخدم'), { target: { value: 'wrong' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'wrong' } });
    await act(async () => {
      fireEvent.click(screen.getByText('تسجيل الدخول'));
    });

    expect(screen.getByText('اسم المستخدم أو كلمة المرور غير صحيحة')).toBeDefined();
  });

  it('toggles dark mode', () => {
    const setDarkMode = vi.fn();
    render(<LoginScreen {...defaultProps} setDarkMode={setDarkMode} />);
    fireEvent.click(screen.getByText('الوضع الداكن'));
    expect(setDarkMode).toHaveBeenCalledWith(true);
  });

  it('shows "forgot password" toast', async () => {
    mockToastFns.toastInfo.mockClear();
    render(<LoginScreen {...defaultProps} />);
    fireEvent.click(screen.getByText('نسيت كلمة المرور؟'));
    await waitFor(() => {
      expect(mockToastFns.toastInfo).toHaveBeenCalled();
    });
  });
});

// ==================== GeographicRiskView Tests ====================
describe('GeographicRiskView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.getDuplicateIdentities.mockResolvedValue([
      { idNo: '111', name: 'Person A', region: 'Sanaa', risk: 'مرتفع جداً', simsCount: 5, duplicatesCount: 3, avatarInitials: 'PA' },
      { idNo: '222', name: 'Person B', region: 'Aden', risk: 'متوسط', simsCount: 2, duplicatesCount: 2, avatarInitials: 'PB' },
    ]);
    mockApi.getAuditLogs.mockResolvedValue([]);
  });

  it('shows loading state initially', () => {
    const blocker = makePending();
    mockApi.getDuplicateIdentities.mockReturnValue(blocker.promise);
    mockApi.getAuditLogs.mockReturnValue(blocker.promise);
    render(<GeographicRiskView />);
    expect(screen.getByText('جاري تحميل بيانات الهويات المكررة...')).toBeDefined();
    blocker.resolve([]);
  });

  it('shows empty state when no identities', async () => {
    mockApi.getDuplicateIdentities.mockResolvedValue([]);
    await act(async () => {
      render(<GeographicRiskView />);
    });
    expect(screen.getByText('لا توجد بيانات مخاطر حالياً')).toBeDefined();
  });

  it('renders risk indicators grid', async () => {
    await act(async () => {
      render(<GeographicRiskView />);
    });

    expect(screen.getByText('مستوى المخاطر التكرارية العالمي')).toBeDefined();
    expect(screen.getByText('Person A')).toBeDefined();
  });

  it('opens search input', async () => {
    await act(async () => {
      render(<GeographicRiskView />);
    });

    const searchInput = screen.getByPlaceholderText(/البحث برقم الهوية/);
    expect(searchInput).toBeDefined();
  });

  it('filters identities by search word', async () => {
    await act(async () => {
      render(<GeographicRiskView />);
    });

    const searchInput = screen.getByPlaceholderText(/البحث برقم الهوية/);
    fireEvent.change(searchInput, { target: { value: 'Person A' } });
    expect(screen.getByText('Person A')).toBeDefined();
  });
});
