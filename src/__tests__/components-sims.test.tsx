/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

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

vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (val: any) => val,
}));

vi.mock('../hooks/useOcr', () => ({
  useOcr: () => ({
    recognize: vi.fn(),
    recognizeRaw: vi.fn().mockResolvedValue(''),
    progress: { visible: false, progress: 0, stage: '' },
    setProgress: vi.fn(),
  }),
}));

vi.mock('../components/shared/OperatorLogo', () => ({
  default: (props: any) => <div data-testid="operator-logo" data-provider={props.provider} />,
}));

vi.mock('../components/shared/CameraCapture', () => ({
  default: (props: any) => <button data-testid="camera-capture" onClick={() => props.onCapture?.('fake-image')} />,
  DocumentCapture: (props: any) => <div data-testid="document-capture" />,
}));

vi.mock('../components/shared/Skeleton', () => ({
  StatsCardSkeleton: () => <div data-testid="stats-card-skeleton" />,
}));

vi.mock('motion/react', () => ({
  motion: new Proxy({}, { get: (_: any, prop: string) => {
    if (prop === 'div' || prop === 'span' || prop === 'button') {
      return ({ children, ...props }: any) => React.createElement(prop, props, children);
    }
    return new Proxy({}, { get: (_2: any, prop2: string) => (...args: any[]) => args[1] ? args[1].children : null });
  }}),
}));

vi.mock('lucide-react', () => ({
  Upload: (props: any) => <svg data-testid="icon-upload" {...props} />,
  RefreshCw: (props: any) => <svg data-testid="icon-refresh" {...props} />,
  Check: (props: any) => <svg data-testid="icon-check" {...props} />,
}));

import React from 'react';
import SIMsView from '../components/SIMsView';
import type { SIM } from '../types';

const mockSims: SIM[] = [
  { id: '1', iccid: '89967001001', provider: 'Yemen Mobile', status: 'available', dateAdded: '2026-01-01', phone: '777123456', owner: 'Agent A', packageType: 'Basic Package' },
  { id: '2', iccid: '89967001002', provider: 'Sabafon', status: 'sold', dateAdded: '2026-01-02', phone: '777654321', owner: 'Agent B', packageType: 'Premium Package' },
  { id: '3', iccid: '89967001003', provider: 'YOU', status: 'reserved', dateAdded: '2026-01-03', phone: '777987654', owner: 'Agent A', packageType: 'Basic Package' },
];

function renderSIMs(overrides = {}) {
  const defaultProps = {
    sims: mockSims,
    onAddSIM: vi.fn(),
    initialSearch: '',
    onUpdateSIM: vi.fn(),
    ...overrides,
  };
  return { ...defaultProps, ...render(<SIMsView {...defaultProps} />) };
}

describe('SIMsView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the main heading', () => {
    renderSIMs();
    expect(screen.getByText('إدارة ومخزن شرائح الاتصال')).toBeDefined();
  });

  it('renders all 3 SIM cards when data is provided', () => {
    renderSIMs();
    expect(screen.getByText('777123456')).toBeDefined();
    expect(screen.getByText('777654321')).toBeDefined();
    expect(screen.getByText('777987654')).toBeDefined();
  });

  it('displays correct stats counters', () => {
    renderSIMs();
    expect(screen.getByText('إجمالي الشرائح')).toBeDefined();
    expect(screen.getByText('3')).toBeDefined();
  });

  it('shows skeleton loaders when sims array is empty', () => {
    renderSIMs({ sims: [] });
    expect(screen.getAllByTestId('stats-card-skeleton').length).toBe(4);
  });

  it('opens add SIM modal when button is clicked', () => {
    renderSIMs();
    const addBtn = screen.getByText('إضافة شريحة يدوياً');
    fireEvent.click(addBtn);
    expect(screen.getByText('إضافة شريحة نظام جديدة')).toBeDefined();
  });

  it('opens CSV import modal when button is clicked', () => {
    renderSIMs();
    const importBtn = screen.getByText('استيراد CSV');
    fireEvent.click(importBtn);
    expect(screen.getByText('استيراد شرائح من ملف CSV')).toBeDefined();
  });

  it('calls onAddSIM when add form is submitted', () => {
    const onAddSIM = vi.fn();
    renderSIMs({ onAddSIM });
    fireEvent.click(screen.getByText('إضافة شريحة يدوياً'));

    const phoneInput = screen.getAllByRole('textbox')[1];
    fireEvent.change(phoneInput, { target: { value: '777111222' } });

    const iccidInput = screen.getAllByRole('textbox')[2];
    fireEvent.change(iccidInput, { target: { value: '8996700999' } });

    const submitBtn = screen.getByText('حفظ الشريحة بالمستودع');
    fireEvent.click(submitBtn);
    expect(onAddSIM).toHaveBeenCalled();
  });

  it('filters SIMs when search term is entered', () => {
    const { container } = renderSIMs();
    const searchInput = screen.getByPlaceholderText(/البحث برقم الهاتف/);
    fireEvent.change(searchInput, { target: { value: '777123' } });
    expect(container.textContent).toContain('777123456');
    expect(container.textContent).not.toContain('777654321');
  });

  it('shows "no matching SIMs" message when filter returns empty', () => {
    renderSIMs();
    const searchInput = screen.getByPlaceholderText(/البحث برقم الهاتف/);
    fireEvent.change(searchInput, { target: { value: 'nonexistent999' } });
    expect(screen.getByText(/لا توجد شرائح مطابقة/)).toBeDefined();
  });

  it('filters by provider when provider button is clicked', () => {
    renderSIMs();
    const sabafonBtn = screen.getByText('سبأفون');
    fireEvent.click(sabafonBtn);
    expect(screen.getByText('777654321')).toBeDefined();
    expect(screen.queryByText('777123456')).toBeNull();
  });

  it('filters by status using dropdown', () => {
    renderSIMs();
    const statusSelect = screen.getByDisplayValue('كل الحالات');
    fireEvent.change(statusSelect, { target: { value: 'available' } });
    expect(screen.getByText('777123456')).toBeDefined();
  });

  it('opens detail modal when view button is clicked', () => {
    renderSIMs();
    const viewBtns = screen.getAllByText('visibility');
    fireEvent.click(viewBtns[0].closest('button')!);
    expect(screen.getByText('تفاصيل الشريحة')).toBeDefined();
  });

  it('opens edit modal when edit button is clicked', () => {
    renderSIMs();
    const editBtns = screen.getAllByText('edit_note');
    fireEvent.click(editBtns[0].closest('button')!);
    expect(screen.getByText('تعديل الشريحة')).toBeDefined();
  });

  it('displays correct count in results text', () => {
    renderSIMs();
    expect(screen.getByText(/إظهار 3 من 3/)).toBeDefined();
  });
});
