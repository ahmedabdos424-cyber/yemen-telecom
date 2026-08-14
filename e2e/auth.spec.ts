import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * Authentication E2E — verifies the login screen renders, each role
 * (Manager / Agent / Seller) can authenticate and land on its dashboard, that
 * invalid credentials are rejected without leaking into a dashboard, and that
 * the biometric quick-login control is gated by device availability.
 *
 * Note: the single login form serves all roles; the role is resolved by the
 * server from the credentials (the screen always submits as 'manager' and the
 * backend returns the real role).
 */
test.describe('Authentication — Login flows', () => {
  test('Login screen renders its core elements', async ({ page }) => {
    await page.goto('/');
    // The app shows a boot splash + server-awake gate before the login form,
    // so allow generous time for it to appear.
    await expect(page.getByPlaceholder('أدخل اسم المستخدم')).toBeVisible({ timeout: 60_000 });
    await expect(page.locator('#login-password')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole('button', { name: /تسجيل الدخول/ })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText('يمن تليكوم').first()).toBeVisible({ timeout: 60_000 });
  });

  test('Manager can log in and reach the manager dashboard', async ({ page }) => {
    await loginAs(page, 'manager');
    await expect(page).toHaveURL(/\/manager\/dashboard/);
  });

  test('Agent can log in and reach the agent home', async ({ page }) => {
    await loginAs(page, 'agent');
    await expect(page).toHaveURL(/\/agent\/home/);
  });

  test('Seller can log in and reach the seller home', async ({ page }) => {
    await loginAs(page, 'seller');
    await expect(page).toHaveURL(/\/seller\/home/);
  });

  test('Invalid credentials keep the user on the login screen', async ({ page }) => {
    await page.goto('/');
    const username = page.getByPlaceholder('أدخل اسم المستخدم');
    await username.waitFor({ state: 'visible' });
    await username.fill(`ghost_user_${Date.now()}`);
    await page.locator('#login-password').fill('wrongpass_123');
    await page.getByRole('button', { name: /تسجيل الدخول/ }).click();
    // Whether the backend responds 401 or 500, a failed login must NOT navigate
    // to any role dashboard — the login form must remain visible.
    await expect(username).toBeVisible({ timeout: 20_000 });
  });

  test.describe('Biometric quick-login UI', () => {
    test('Biometric toggle is gated by device availability', async ({ page }) => {
      await page.goto('/');
      await page.getByPlaceholder('أدخل اسم المستخدم').waitFor({ state: 'visible' });
      // A standard browser context has no WebAuthn sensor, so the
      // fingerprint quick-login control must NOT be rendered on the login
      // screen. (When a WebAuthn-capable context is supplied it appears.)
      expect(await page.getByRole('button', { name: /بصمة/ }).count()).toBe(0);
    });
  });
});
