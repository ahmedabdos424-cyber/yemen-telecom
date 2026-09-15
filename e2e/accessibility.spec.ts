import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * Accessibility E2E — read-only persona of the Manager chrome. Verifies that the
 * icon-only TopBar controls expose accessible names (ARIA labels) and that their
 * dropdown panels open/close, so automated + screen-reader users can operate the
 * notifications and profile menus. No write/DB mutating operations are performed.
 */
test.describe('TopBar — accessible controls', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'manager');
    await expect(page).toHaveURL(/\/manager\/dashboard/);
    const notificationsBtn = page.getByRole('button', { name: /الإشعارات/ });
    await notificationsBtn.waitFor({ state: 'visible', timeout: 15_000 });
  });

  test('Notifications button exposes an accessible name and toggles the panel', async ({ page }) => {
    const notificationsBtn = page.getByRole('button', { name: /الإشعارات/ });
    await expect(notificationsBtn).toBeVisible({ timeout: 15_000 });
    expect(await notificationsBtn.getAttribute('aria-expanded')).toBe('false');

    await notificationsBtn.click();
    await expect(page.getByText('التنبيهات الفورية').first()).toBeVisible({ timeout: 10_000 });
    expect(await notificationsBtn.getAttribute('aria-expanded')).toBe('true');

    // Toggling the button again closes the panel.
    await notificationsBtn.click();
    await expect(page.getByText('التنبيهات الفورية').first()).not.toBeVisible();
  });

  test('Profile menu button exposes an accessible name and opens logout', async ({ page }) => {
    const profileBtn = page.getByRole('button', { name: /قائمة المستخدم/ });
    await expect(profileBtn).toBeVisible({ timeout: 15_000 });
    expect(await profileBtn.getAttribute('aria-expanded')).toBe('false');

    await profileBtn.click();
    await expect(page.getByRole('button', { name: /تسجيل الخروج/ })).toBeVisible({ timeout: 10_000 });
    expect(await profileBtn.getAttribute('aria-expanded')).toBe('true');
  });
});