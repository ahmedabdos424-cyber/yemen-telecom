import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * SIM Inventory E2E (Manager scope, /manager/sims).
 *
 * Covers:
 *  - The "Add batch (range)" entry point opens the batch modal.
 *  - Regression guard: the removed filter TABS (المحجوز / المخصص / التالف) must
 *    never re-appear as clickable tab controls. The status filter is a <select>,
 *    not a tab list.
 *  - Active-filter interactions: choosing a status shows the "نشط التصفية"
 *    (active filter) chip and "مسح تصفية الكل" (clear all) resets it.
 */
const REMOVED_FILTER_TABS = ['المحجوز', 'المخصص', 'التالف'];

test.describe('SIM Inventory', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'manager');
    await page.goto('/manager/sims');
    await page.getByText('إدارة ومخزن شرائح الاتصال').waitFor({ state: 'visible', timeout: 30_000 });
  });

  test('Batch (range) SIM addition opens the batch modal', async ({ page }) => {
    const batchBtn = page.getByRole('button', { name: /إضافة دفعة \(نطاق\)/ });
    await expect(batchBtn).toBeVisible();
    await batchBtn.click();
    await expect(page.getByText('إضافة دفعة شرائح (نطاق ICCID)')).toBeVisible({ timeout: 10_000 });
  });

  test('Removed filter tabs are NOT rendered (regression guard)', async ({ page }) => {
    for (const label of REMOVED_FILTER_TABS) {
      // These labels must never re-appear as clickable filter TABS.
      expect(await page.getByRole('tab', { name: label }).count()).toBe(0);
    }
    // The status filter is implemented as a <select>, confirming the old
    // tab-based filter UI was replaced.
    await expect(page.locator('select').filter({ hasText: 'متاح' })).toBeVisible();
  });

  test('Active filter interactions update the filter and can be cleared', async ({ page }) => {
    const statusSelect = page.locator('select').filter({ hasText: 'متاح' });
    await statusSelect.selectOption('available');

    // Selecting a status activates the "نشط التصفية" (active filter) chip.
    await expect(page.getByText(/نشط التصفية/)).toBeVisible();

    // "مسح تصفية الكل" (clear all) resets the active filter state.
    await page.getByRole('button', { name: /مسح تصفية الكل/ }).click();
    await expect(page.getByText(/نشط التصفية/)).toHaveCount(0);
  });
});
