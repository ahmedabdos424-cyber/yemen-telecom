/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('motion/react', () => ({
  motion: new Proxy({}, { get: (_: any, prop: string) => {
    if (prop === 'div' || prop === 'span' || prop === 'button') {
      return ({ children, onClick, ...props }: any) => React.createElement(prop, { onClick, ...props }, children);
    }
    return new Proxy({}, { get: (_2: any, prop2: string) => (...args: any[]) => args[1] ? args[1].children : null });
  }}),
}));

vi.mock('../components/shared/OperatorLogo', () => ({
  default: (props: any) => <div data-testid="operator-logo" data-provider={props.provider} />,
}));

vi.mock('material-symbols', () => ({}));

import React from 'react';
import DashboardView from '../components/DashboardView';
import type { SIM, Agent, Seller, SystemAlert, Transaction, ViewType } from '../types';

const defaultStats = {
  total_sims: 100,
  sold_sims: 60,
  remaining_sims: 40,
  active_sims: 55,
  total_agents: 10,
  total_sellers: 25,
  sales_growth: 12,
  sales_weekly: 8,
  total_sims_growth: 5,
  sold_sims_growth: 10,
  active_sims_growth: 8,
  agent_growth: 2,
  seller_growth: 3,
  sims_added_30d: 20,
  activations_30d: 15,
  agents_added_30d: 2,
  sellers_added_30d: 5,
  operators: [
    { provider: 'Yemen Mobile', count: 60, percentage: 60 },
    { provider: 'Sabafon', count: 25, percentage: 25 },
    { provider: 'YOU', count: 15, percentage: 15 },
  ],
};

const mockSims: SIM[] = [
  { id: '1', iccid: '89967001', provider: 'Yemen Mobile', status: 'available', dateAdded: '2026-01-01', phone: '777123456', owner: 'Agent A', packageType: 'Basic' },
];

const mockAlerts: SystemAlert[] = [
  { id: '1', title: 'Low Stock', description: 'Stock below threshold', priority: 'high', time: '2 hours ago', category: 'مخزون' },
  { id: '2', title: 'Security Alert', description: 'Failed login attempts', priority: 'medium', time: '1 hour ago', category: 'أمان' },
];

const mockTransactions: Transaction[] = [
  { id: '1', clientName: 'Client A', provider: 'Yemen Mobile', simsCount: 5, status: 'completed', relativeTime: '5 min ago' },
  { id: '2', clientName: 'Client B', provider: 'Sabafon', simsCount: 3, status: 'pending', relativeTime: '10 min ago' },
];

function renderDashboard(overrides = {}) {
  const defaultProps = {
    stats: defaultStats,
    alerts: mockAlerts,
    transactions: mockTransactions,
    sims: mockSims,
    setView: vi.fn(),
    setSelectedEntity: vi.fn(),
    onSearch: vi.fn(),
    onRefresh: vi.fn(),
    ...overrides,
  };
  return { ...defaultProps, ...render(<DashboardView {...defaultProps} />) };
}

describe('DashboardView', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders all 6 stat cards with correct values', () => {
    renderDashboard();
    expect(screen.getByText('إجمالي الشرائح')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('الشرائح المباعة')).toBeDefined();
    expect(screen.getByText('60')).toBeDefined();
    expect(screen.getByText('المخزون المتبقي')).toBeDefined();
    expect(screen.getByText('40')).toBeDefined();
    expect(screen.getByText('الهواتف النشطة')).toBeDefined();
    expect(screen.getByText('55')).toBeDefined();
    expect(screen.getByText('الوكلاء المعتمدين')).toBeDefined();
    expect(screen.getByText('10')).toBeDefined();
    expect(screen.getByText('نقاط بيع البائعين')).toBeDefined();
    expect(screen.getByText('25')).toBeDefined();
  });

  it('renders search input with placeholder', () => {
    renderDashboard();
    const input = screen.getByPlaceholderText(/ابحث عن رقم شريحة/);
    expect(input).toBeDefined();
  });

  it('calls onSearch when search query is entered and Enter is pressed', () => {
    const onSearch = vi.fn();
    renderDashboard({ onSearch });
    const input = screen.getByPlaceholderText(/ابحث عن رقم شريحة/);
    fireEvent.change(input, { target: { value: 'test query' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('navigates to sims view when search is empty and Enter is pressed', () => {
    const setView = vi.fn();
    renderDashboard({ setView });
    const input = screen.getByPlaceholderText(/ابحث عن رقم شريحة/);
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(setView).toHaveBeenCalledWith('sims');
  });

  it('calls onRefresh when refresh button is clicked', () => {
    const onRefresh = vi.fn();
    renderDashboard({ onRefresh });
    const refreshBtn = screen.getByTitle('تحديث البيانات');
    fireEvent.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('renders alerts section', () => {
    renderDashboard();
    expect(screen.getByText('تنبيهات النظام الذكية')).toBeDefined();
    expect(screen.getByText('Low Stock')).toBeDefined();
    expect(screen.getByText('2 نشطة')).toBeDefined();
  });

  it('shows empty alerts message when no alerts', () => {
    renderDashboard({ alerts: [] });
    expect(screen.getByText('لا توجد تنبيهات نشطة حالياً')).toBeDefined();
  });

  it('calls setView when manage alerts button is clicked', () => {
    const setView = vi.fn();
    renderDashboard({ setView });
    const btn = screen.getByText(/إدارة التنبيهات والأمان/);
    fireEvent.click(btn);
    expect(setView).toHaveBeenCalledWith('alerts');
  });

  it('renders operators section', () => {
    renderDashboard();
    expect(screen.getByText('أداء شركات المزودين والشرائح المفعّلة')).toBeDefined();
    expect(screen.getByText(/Yemen Mobile/)).toBeDefined();
  });

  it('shows empty operators message when no operators', () => {
    renderDashboard({ stats: { ...defaultStats, operators: [] } });
    expect(screen.getByText('لا توجد بيانات مشغلين متاحة حالياً')).toBeDefined();
  });

  it('renders recent transactions', () => {
    renderDashboard();
    expect(screen.getByText('Client A')).toBeDefined();
    expect(screen.getByText('Client B')).toBeDefined();
    expect(screen.getByText('مكتمل')).toBeDefined();
    expect(screen.getByText('قيد المعالجة')).toBeDefined();
  });

  it('calls setView when stat card is clicked', () => {
    const setView = vi.fn();
    renderDashboard({ setView });
    const simsCards = screen.getAllByText('إجمالي الشرائح');
    fireEvent.click(simsCards[0].closest('.stat-card')!);
    expect(setView).toHaveBeenCalledWith('sims');
  });

  it('renders with zero/default stats when stats are empty', () => {
    renderDashboard({ stats: {} });
    expect(screen.getByText('إجمالي الشرائح')).toBeDefined();
    expect(screen.getByText('الوكلاء المعتمدين')).toBeDefined();
  });

  it('shows growth percentage with correct sign', () => {
    renderDashboard({ stats: { ...defaultStats, total_sims_growth: -5 } });
    expect(screen.getByText('-5%')).toBeDefined();
  });
});
