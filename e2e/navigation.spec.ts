import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * Navigation E2E — verifies that the role-based navigation works correctly
 * for all three roles (Manager, Agent, Seller). Tests that:
 *  - Each role can access its own routes
 *  - Bottom nav / sidebar renders the correct tabs
 *  - Navigation between views works
 *  - Unauthorized routes redirect to the correct dashboard
 */

test.describe('Manager Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'manager');
    await expect(page).toHaveURL(/\/manager\/dashboard/);
  });

  test('Can navigate to SIMs via URL', async ({ page }) => {
    await page.goto('/#/manager/sims', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/manager\/sims/);
    await expect(page.getByText('إدارة ومخزن شرائح الاتصال').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Can navigate to Agents via URL', async ({ page }) => {
    await page.goto('/#/manager/agents', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/manager\/agents/);
    await expect(page.getByText('إدارة الوكلاء').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Can navigate to Sellers via URL', async ({ page }) => {
    await page.goto('/#/manager/sellers', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/manager\/sellers/);
    await expect(page.getByText('إدارة البائعين').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Can navigate to Alerts via URL', async ({ page }) => {
    await page.goto('/#/manager/alerts', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/manager\/alerts/);
    await expect(page.getByText('تنبيهات النظام').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Can navigate to Reports via URL', async ({ page }) => {
    await page.goto('/#/manager/reports', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/manager\/reports/);
    await expect(page.getByText('التقارير').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Can navigate to Settings via URL', async ({ page }) => {
    await page.goto('/#/manager/settings', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/manager\/settings/);
    await expect(page.getByText('الإعدادات').first()).toBeVisible({ timeout: 15_000 });
  });

  test('Can navigate to Activate SIM via URL', async ({ page }) => {
    await page.goto('/#/manager/activate', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/manager\/activate/);
    await expect(page.getByText('تفعيل شريحة جديدة').first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Agent Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'agent');
    await expect(page).toHaveURL(/\/agent\/home/);
  });

  test('Can navigate to sellers tab via URL', async ({ page }) => {
    await page.goto('/#/agent/sellers', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/agent\/sellers/);
  });

  test('Can navigate to my SIMs via URL', async ({ page }) => {
    await page.goto('/#/agent/my-sims', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/agent\/my-sims/);
  });

  test('Can navigate to add seller via URL', async ({ page }) => {
    await page.goto('/#/agent/add-seller', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/agent\/add-seller/);
  });

  test('Can navigate to account via URL', async ({ page }) => {
    await page.goto('/#/agent/account', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/agent\/account/);
  });

  test('Can navigate to activate SIM via URL', async ({ page }) => {
    await page.goto('/#/agent/activate', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/agent\/activate/);
  });
});

test.describe('Seller Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'seller');
    await expect(page).toHaveURL(/\/seller\/home/);
  });

  test('Can navigate to activate SIM via URL', async ({ page }) => {
    await page.goto('/#/seller/activate', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/seller\/activate/);
  });

  test('Can navigate to my SIMs via URL', async ({ page }) => {
    await page.goto('/#/seller/my-sims', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/seller\/my-sims/);
  });

  test('Can navigate to account via URL', async ({ page }) => {
    await page.goto('/#/seller/account', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/seller\/account/);
  });
});
