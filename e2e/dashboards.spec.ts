import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * Dashboard E2E — smoke tests for each role's main dashboard.
 *
 * Verifies that after login, each role lands on the correct dashboard with
 * the expected key UI elements rendered (stat cards, headings, navigation,
 * quick actions). These are lightweight guards against UI regressions.
 */

test.describe('Manager Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'manager');
    await expect(page).toHaveURL(/\/manager\/dashboard/);
  });

  test('renders stat cards with correct labels', async ({ page }) => {
    await expect(page.getByText('إجمالي الشرائح').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('الشرائح المباعة').first()).toBeVisible();
    await expect(page.getByText('المخزون المتبقي').first()).toBeVisible();
    await expect(page.getByText('الوكلاء المعتمدين').first()).toBeVisible();
  });

  test('renders smart alerts section', async ({ page }) => {
    await expect(page.getByText('تنبيهات النظام الذكية')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /إدارة التنبيهات/ })).toBeVisible();
  });

  test('renders provider analytics section', async ({ page }) => {
    await expect(page.getByText('أداء شركات المزودين').first()).toBeVisible({ timeout: 15_000 });
  });

  test('renders recent operations section', async ({ page }) => {
    await expect(page.getByText('آخر العمليات والتوزيعات').first()).toBeVisible({ timeout: 15_000 });
  });

  test('search bar is functional', async ({ page }) => {
    const searchInput = page.getByPlaceholder('ابحث عن رقم شريحة، ICCID، وكيل، أو عملية...');
    await expect(searchInput).toBeVisible({ timeout: 15_000 });
    await searchInput.fill('test');
    await expect(searchInput).toHaveValue('test');
  });
});

test.describe('Agent Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'agent');
    await expect(page).toHaveURL(/\/agent\/home/);
  });

  test('renders quick actions section', async ({ page }) => {
    await expect(page.getByText('الإجراءات السريعة')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /تفعيل شريحة جديدة/ })).toBeVisible();
  });

  test('renders inventory summary cards', async ({ page }) => {
    await expect(page.getByText('إجمالي الشرائح المتوفرة').first()).toBeVisible({ timeout: 15_000 });
  });

  test('renders seller section', async ({ page }) => {
    await expect(page.getByText('البائعين ونقاط البيع').first()).toBeVisible({ timeout: 15_000 });
  });

  test('renders recent operations table', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'آخر العمليات' })).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Seller Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'seller');
    await expect(page).toHaveURL(/\/seller\/home/);
  });

  test('renders activate SIM button', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /تفعيل شريحة جديدة للمشتركين/ })
    ).toBeVisible({ timeout: 15_000 });
  });

  test('renders metric cards', async ({ page }) => {
    await expect(page.getByText('اجمالي الشرائح المباعة')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('إجمالي الشرائح المتبقية')).toBeVisible();
    await expect(page.getByText('إجمالي الشرائح تحت الإدارة')).toBeVisible();
  });

  test('renders recent operations table', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'العمليات والطلبات الأخيرة بالفرع' })
    ).toBeVisible({ timeout: 15_000 });
  });
});
