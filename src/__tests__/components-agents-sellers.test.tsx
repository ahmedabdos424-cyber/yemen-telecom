/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const toastWarningFn = vi.fn();
const toastSuccessFn = vi.fn();
const toastErrorFn = vi.fn();

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({
    toasts: [],
    dismissToast: vi.fn(),
    toastSuccess: toastSuccessFn,
    toastError: toastErrorFn,
    toastWarning: toastWarningFn,
    toastInfo: vi.fn(),
  }),
  ToastContainer: () => null,
}));

vi.mock('../hooks/useOcr', () => ({
  useOcr: () => ({
    recognize: vi.fn().mockResolvedValue('Test Name'),
    recognizeRaw: vi.fn().mockResolvedValue(''),
    progress: { visible: false, progress: 0, stage: '' },
    setProgress: vi.fn(),
  }),
}));

vi.mock('../api/client', () => ({
  api: {
    createSeller: vi.fn().mockResolvedValue({ id: '1', credentials: { username: 'testuser', password: 'pass123' } }),
  },
}));

vi.mock('../components/shared/CameraCapture', () => ({
  default: (props: any) => <button data-testid="camera-capture" onClick={() => props.onCapture?.('fake-image')} />,
  DocumentCapture: (props: any) => <div data-testid="document-capture" />,
}));

vi.mock('../components/shared/OperatorLogo', () => ({
  default: (props: any) => <div data-testid="operator-logo" />,
}));

vi.mock('motion/react', () => ({
  motion: new Proxy({}, { get: (_: any, prop: string) => {
    if (prop === 'div' || prop === 'span' || prop === 'button') {
      return ({ children, ...props }: any) => React.createElement(prop, props, children);
    }
    return new Proxy({}, { get: (_2: any, prop2: string) => (...args: any[]) => args[1] ? args[1].children : null });
  }}),
  AnimatePresence: ({ children }: any) => children,
}));

vi.mock('lucide-react', () => {
  const icons = ['Check', 'Camera', 'RefreshCw', 'Lock', 'MapPin', 'Phone', 'CreditCard', 'ShoppingBag', 'User', 'X', 'Eye', 'EyeOff', 'Copy', 'CircleCheck'];
  const result: any = {};
  icons.forEach(name => { result[name] = (props: any) => <svg data-testid={`icon-${name.toLowerCase()}`} {...props} />; });
  return result;
});

vi.mock('material-symbols', () => ({}));

vi.mock('../assets/profile.png', () => ({ default: 'profile.png' }));

import React from 'react';
import AgentsView from '../components/AgentsView';
import SellersView from '../components/SellersView';
import AddAgentView from '../components/AddAgentView';
import AddSellerForm from '../components/AddSellerForm';
import type { Agent, Seller } from '../types';

const mockAgents: Agent[] = [
  { id: 'a1', name: 'Agent Alpha', region: 'أمانة العاصمة', phone: '777111111', sellersCount: 5, simsCount: 200, status: 'active' },
  { id: 'a2', name: 'Agent Beta', region: 'عدن', phone: '777222222', sellersCount: 3, simsCount: 100, status: 'inactive' },
];

const mockSellers: Seller[] = [
  { id: 's1', name: 'Seller One', region: 'صنعاء', phone: '777333333', simsCount: 50, sales30Days: 1000, salesGrowth: 12, activityRate: 95, status: 'active', storeName: 'Store A', idNumber: '12345' },
  { id: 's2', name: 'Seller Two', region: 'عدن', phone: '777444444', simsCount: 30, sales30Days: 500, salesGrowth: -3, activityRate: 80, status: 'suspended', storeName: 'Store B', idNumber: '67890' },
];

const mockSims = [
  { id: '1', iccid: '89967001', provider: 'Yemen Mobile' as const, status: 'available' as const, dateAdded: '2026-01-01', phone: '777123456', owner: 'Seller One', packageType: 'Basic' },
];

// ==================== AgentsView Tests ====================
describe('AgentsView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the main heading', () => {
    render(<AgentsView agents={mockAgents} setView={vi.fn()} onUpdateAgent={vi.fn()} />);
    expect(screen.getByText('إدارة شبكة الوكلاء المعتمدين')).toBeDefined();
  });

  it('displays correct stats counts', () => {
    render(<AgentsView agents={mockAgents} setView={vi.fn()} onUpdateAgent={vi.fn()} />);
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByText('1')).toBeDefined();
  });

  it('renders agent cards with names', () => {
    render(<AgentsView agents={mockAgents} setView={vi.fn()} onUpdateAgent={vi.fn()} />);
    expect(screen.getByText(/Agent Alpha/)).toBeDefined();
    expect(screen.getByText(/Agent Beta/)).toBeDefined();
  });

  it('searches agents by name', async () => {
    const { container } = render(<AgentsView agents={mockAgents} setView={vi.fn()} onUpdateAgent={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/ابحث عن وكيل/);
    fireEvent.change(searchInput, { target: { value: 'Alpha' } });
    await waitFor(() => {
      expect(container.textContent).toContain('Agent Alpha');
    });
  });

  it('shows empty message when no agents match filter', () => {
    render(<AgentsView agents={mockAgents} setView={vi.fn()} onUpdateAgent={vi.fn()} />);
    const searchInput = screen.getByPlaceholderText(/ابحث عن وكيل/);
    fireEvent.change(searchInput, { target: { value: 'NonExistent' } });
    expect(screen.getByText(/لا توجد فروع أو وكلاء/)).toBeDefined();
  });

  it('navigates to add-agent view', () => {
    const setView = vi.fn();
    render(<AgentsView agents={mockAgents} setView={setView} onUpdateAgent={vi.fn()} />);
    const addBtn = screen.getByText(/إضافة وكيل نظام جديد/);
    fireEvent.click(addBtn);
    expect(setView).toHaveBeenCalledWith('add-agent');
  });

  it('opens edit modal when edit is clicked', () => {
    render(<AgentsView agents={mockAgents} setView={vi.fn()} onUpdateAgent={vi.fn()} />);
    const editBtns = screen.getAllByText('edit');
    fireEvent.click(editBtns[0].closest('button')!);
    expect(screen.getByText('تعديل بيانات الوكيل')).toBeDefined();
  });

  it('calls onUpdateAgent when edit form is submitted', () => {
    const onUpdateAgent = vi.fn();
    render(<AgentsView agents={mockAgents} setView={vi.fn()} onUpdateAgent={onUpdateAgent} />);
    const editBtns = screen.getAllByText('edit');
    fireEvent.click(editBtns[0].closest('button')!);
    fireEvent.click(screen.getByText('حفظ التعديلات'));
    expect(onUpdateAgent).toHaveBeenCalled();
  });

  it('toggles agent status', () => {
    const onUpdateAgent = vi.fn();
    render(<AgentsView agents={mockAgents} setView={vi.fn()} onUpdateAgent={onUpdateAgent} />);
    const deactivateBtns = screen.getAllByText('تعطيل');
    fireEvent.click(deactivateBtns[0]);
    expect(onUpdateAgent).toHaveBeenCalledWith('a1', { status: 'inactive' });
  });

  it('filters by status', () => {
    render(<AgentsView agents={mockAgents} setView={vi.fn()} onUpdateAgent={vi.fn()} />);
    const statusSelect = screen.getByDisplayValue('جميع الحالات');
    fireEvent.change(statusSelect, { target: { value: 'active' } });
    expect(screen.getByText('Agent Alpha')).toBeDefined();
  });

  it('opens PDF export modal', () => {
    render(<AgentsView agents={mockAgents} setView={vi.fn()} onUpdateAgent={vi.fn()} />);
    const pdfBtn = screen.getByText(/تصدير تقرير الوكلاء/);
    fireEvent.click(pdfBtn);
    expect(screen.getByText(/معاينة التقرير الرسمي/)).toBeDefined();
  });
});

// ==================== SellersView Tests ====================
describe('SellersView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders loading state', () => {
    render(<SellersView sellers={[]} sims={[]} onUpdateSeller={vi.fn()} onAddBalance={vi.fn()} loading={true} />);
    expect(screen.getByText('جاري التحميل...')).toBeDefined();
  });

  it('renders error state with retry button', () => {
    const onRetry = vi.fn();
    render(<SellersView sellers={[]} sims={[]} onUpdateSeller={vi.fn()} onAddBalance={vi.fn()} error="Network Error" onRetry={onRetry} />);
    expect(screen.getByText('Network Error')).toBeDefined();
    fireEvent.click(screen.getByText('إعادة المحاولة'));
    expect(onRetry).toHaveBeenCalled();
  });

  it('renders empty state when no sellers', () => {
    render(<SellersView sellers={[]} sims={[]} onUpdateSeller={vi.fn()} onAddBalance={vi.fn()} />);
    expect(screen.getByText('لا توجد بيانات')).toBeDefined();
  });

  it('renders seller profile card with name', () => {
    render(<SellersView sellers={mockSellers} sims={[]} onUpdateSeller={vi.fn()} onAddBalance={vi.fn()} />);
    expect(screen.getAllByText('Seller One').length).toBeGreaterThan(0);
  });

  it('renders all stat cards', () => {
    render(<SellersView sellers={mockSellers} sims={[]} onUpdateSeller={vi.fn()} onAddBalance={vi.fn()} />);
    expect(screen.getByText('إجمالي مبيعات البائع (30 يوم)')).toBeDefined();
    expect(screen.getByText('المخزون الجاهز بعهدته')).toBeDefined();
    expect(screen.getByText('معدل نشاط الأجهزة والبيع')).toBeDefined();
  });

  it('opens add balance modal', () => {
    render(<SellersView sellers={mockSellers} sims={[]} onUpdateSeller={vi.fn()} onAddBalance={vi.fn()} />);
    const addBtn = screen.getByText(/شحن وتعبئة رصيد البائع/);
    fireEvent.click(addBtn);
    expect(screen.getByText('شحن رصيد لوكيل التوزيع')).toBeDefined();
  });

  it('calls onAddBalance when balance form is submitted', () => {
    const onAddBalance = vi.fn();
    render(<SellersView sellers={mockSellers} sims={[]} onUpdateSeller={vi.fn()} onAddBalance={onAddBalance} />);
    fireEvent.click(screen.getByText(/شحن وتعبئة رصيد البائع/));
    const amountInput = screen.getByPlaceholderText('مبلغ الشحن');
    fireEvent.change(amountInput, { target: { value: '500' } });
    fireEvent.click(screen.getByText('تأكيد وإضافة الرصيد'));
    expect(onAddBalance).toHaveBeenCalledWith('s1', 500);
  });

  it('toggles seller status between active and suspended', () => {
    const onUpdateSeller = vi.fn();
    render(<SellersView sellers={mockSellers} sims={[]} onUpdateSeller={onUpdateSeller} onAddBalance={vi.fn()} />);
    fireEvent.click(screen.getByText('تعليق البائع'));
    expect(onUpdateSeller).toHaveBeenCalledWith('s1', { status: 'suspended' });
  });

  it('switches between sellers using quick selector', () => {
    render(<SellersView sellers={mockSellers} sims={[]} onUpdateSeller={vi.fn()} onAddBalance={vi.fn()} />);
    const seller2Btn = screen.getByText('Seller Two');
    fireEvent.click(seller2Btn);
    expect(screen.getByText('777444444')).toBeDefined();
  });

  it('displays inventory tab with SIMs', () => {
    render(<SellersView sellers={mockSellers} sims={mockSims} onUpdateSeller={vi.fn()} onAddBalance={vi.fn()} />);
    expect(screen.getByText('777123456')).toBeDefined();
  });
});

// ==================== AddAgentView Tests ====================
describe('AddAgentView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the form heading', () => {
    render(<AddAgentView onAddAgent={vi.fn()} setView={vi.fn()} />);
    expect(screen.getByText(/تسجيل وكيل أو فرع توزيع معتمد/)).toBeDefined();
  });

  it('calls setView when cancel is clicked', () => {
    const setView = vi.fn();
    render(<AddAgentView onAddAgent={vi.fn()} setView={setView} />);
    fireEvent.click(screen.getByText('إلغاء التراجع'));
    expect(setView).toHaveBeenCalledWith('agents');
  });

  it('shows warning when submitting without name and phone', () => {
    const { container } = render(<AddAgentView onAddAgent={vi.fn()} setView={vi.fn()} />);
    const form = container.querySelector('form')!;
    fireEvent.submit(form);
    expect(toastWarningFn).toHaveBeenCalledWith('الرجاء إدخال الاسم ورقم الجوال لتسجيل وكيل التوزيع المعتمد.');
  });

  it('calls onAddAgent with correct data on valid submission', async () => {
    const onAddAgent = vi.fn().mockResolvedValue(undefined);
    const setView = vi.fn();
    render(<AddAgentView onAddAgent={onAddAgent} setView={setView} />);

    const nameInput = screen.getByPlaceholderText('الاسم التجاري');
    fireEvent.change(nameInput, { target: { value: 'New Agent' } });

    const phoneInput = screen.getByPlaceholderText('7xxxxxx');
    fireEvent.change(phoneInput, { target: { value: '777999999' } });

    fireEvent.click(screen.getByText(/تأكيد وتسجيل الوكيل/));
    expect(onAddAgent).toHaveBeenCalled();
  });

  it('navigates back to agents when close button is clicked', () => {
    const setView = vi.fn();
    render(<AddAgentView onAddAgent={vi.fn()} setView={setView} />);
    const closeBtn = screen.getByTitle('رجوع للوكلاء');
    fireEvent.click(closeBtn);
    expect(setView).toHaveBeenCalledWith('agents');
  });
});

// ==================== AddSellerForm Tests ====================
describe('AddSellerForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the form heading', () => {
    render(<AddSellerForm onSellerAdded={vi.fn()} agentName="Test Agent" />);
    expect(screen.getByText('بيانات حساب البائع الجديد')).toBeDefined();
  });

  it('shows warning when submitting empty form', () => {
    render(<AddSellerForm onSellerAdded={vi.fn()} />);
    fireEvent.click(screen.getByText(/إنشاء حساب بائع معتمد جديد/));
    expect(toastWarningFn).toHaveBeenCalledWith('الرجاء كتابة الاسم الكامل للبائع');
  });

  it('fills and submits the form successfully', async () => {
    const onSellerAdded = vi.fn();
    render(<AddSellerForm onSellerAdded={onSellerAdded} agentName="Test Agent" />);

    fireEvent.change(screen.getByLabelText(/الاسم الكامل للبائع/), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/اسم المستخدم الجديد للبائع/), { target: { value: 'johndoe' } });
    fireEvent.change(screen.getByLabelText(/كلمة المرور للحساب/), { target: { value: 'pass123' } });
    fireEvent.change(screen.getByLabelText(/اسم المحل/), { target: { value: 'My Store' } });
    fireEvent.change(screen.getByLabelText(/رقم الهوية الوطنية/), { target: { value: '1234567890' } });
    fireEvent.change(screen.getByLabelText(/رقم الهاتف الجوال/), { target: { value: '777123456' } });
    fireEvent.change(screen.getByLabelText(/المنطقة/), { target: { value: 'Sanaa' } });

    fireEvent.click(screen.getByText(/إنشاء حساب بائع معتمد جديد/));
    await waitFor(() => expect(onSellerAdded).toHaveBeenCalled());
  });

  it('toggles password visibility', () => {
    render(<AddSellerForm onSellerAdded={vi.fn()} />);
    const toggleBtn = screen.getByTestId('icon-eye');
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId('icon-eyeoff')).toBeDefined();
  });

  it('shows success credentials dialog after successful submission', async () => {
    render(<AddSellerForm onSellerAdded={vi.fn()} agentName="Test Agent" />);

    fireEvent.change(screen.getByLabelText(/الاسم الكامل للبائع/), { target: { value: 'Jane Doe' } });
    fireEvent.change(screen.getByLabelText(/اسم المستخدم الجديد للبائع/), { target: { value: 'janedoe' } });
    fireEvent.change(screen.getByLabelText(/كلمة المرور للحساب/), { target: { value: 'pass456' } });
    fireEvent.change(screen.getByLabelText(/اسم المحل/), { target: { value: 'Store 2' } });
    fireEvent.change(screen.getByLabelText(/رقم الهوية الوطنية/), { target: { value: '9876543210' } });
    fireEvent.change(screen.getByLabelText(/رقم الهاتف الجوال/), { target: { value: '777654321' } });
    fireEvent.change(screen.getByLabelText(/المنطقة/), { target: { value: 'Aden' } });

    fireEvent.click(screen.getByText(/إنشاء حساب بائع معتمد جديد/));
    await waitFor(() => expect(screen.getByText('تم إنشاء الحساب بنجاح')).toBeDefined());
  });
});
