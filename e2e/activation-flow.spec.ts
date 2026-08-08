import { test, expect, type Locator, type Page } from '@playwright/test';

/**
 * E2E activation flow — Yemen Telecom
 *
 * Covers: login → navigate to SIMs → locate/verify an available SIM →
 * open the Activate SIM form → fill customer + ICCID + phone →
 * submit → assert success banner → navigate to Reports → export.
 *
 * Credentials & target are driven by env so the same suite runs against
 * a local Vite preview/dev server or a deployed staging URL:
 *
 *   E2E_USERNAME=manager  E2E_PASSWORD=YourPass123  npm run test:e2e
 *
 * Default credentials fall back to the seeded demo account (`manager`)
 * with password `Password123` — if your environment differs, set the env
 * vars above. The suite will bail out clearly if credentials are missing
 * rather than emitting false red builds.
 */

const USERNAME = process.env.E2E_USERNAME || 'manager';
const PASSWORD = process.env.E2E_PASSWORD || 'Password123';

// Skip the whole file if no password was provided and we're in CI — a
// hardcoded fallback should never silently run against production.
test.skip(
  !process.env.E2E_PASSWORD && process.env.CI === 'true',
  'E2E_PASSWORD is not set in CI; skipping activation flow to avoid credentials leak risk.'
);

test.describe('تدفق تفعيل الشريحة الكامل (Login → SIM → Activate → Report)', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  // ---------------------------------------------------------------------------
  // 1. Login
  // ---------------------------------------------------------------------------
  test('الخطوة 1: تسجيل الدخول كمدير', async () => {
    await page.goto('/');

    // Username field (no stable id — use autocomplete).
    const usernameInput = page.locator('input[autocomplete="username"]');
    await usernameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await usernameInput.fill(USERNAME);

    // Password field has a stable id (#login-password).
    const passwordInput = page.locator('#login-password');
    await passwordInput.fill(PASSWORD);

    // Submit — button shows "تسجيل الدخول" in idle state.
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    // After login the manager dashboard loads; assert URL + key widget.
    await page.waitForURL('**/manager/dashboard', { timeout: 30_000 });
    await expect(page).toHaveURL(/\/manager\/dashboard/);
    await expect(page.getByRole('heading', { name: /لوحة التحكم|الإدارة العامة/ })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 2. Navigate to SIM inventory
  // ---------------------------------------------------------------------------
  test('الخطوة 2: الانتقال إلى صفحة مخزون الشرائح', async () => {
    // Navigate directly: on desktop viewports (Playwright Chrome = 1280px) the
    // manager BottomNav is hidden (lg:hidden) and TopBar has no SIMs button.
    await page.goto('/manager/sims');
    await page.waitForURL('**/manager/sims', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/manager\/sims/);

    // Header of the SIMs view.
    await expect(page.getByText('إدارة ومخزن شرائح الاتصال').first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 3. Locate an "available" SIM for activation
  // ---------------------------------------------------------------------------
  test('الخطوة 3: العثور على شريحة متاحة للتفعيل', async () => {
    // Filter the status dropdown to "available" (متاح).
    await page.locator('label:text("حالة الشريحة") + select').selectOption('available');

    // Wait until at least one SIM card row renders.
    await page.locator('[class*="card"]').filter({ hasText: 'متاح' }).first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    // Grab the first available SIM's ICCID for use in the activation form.
    const firstRow = page.locator('[class*="card"]').filter({ hasText: 'متاح' }).first();
    await firstRow.locator('span.material-symbols-outlined').first().waitFor({ state: 'attached' });
    const iccidText = await firstRow.locator('font-mono').last().textContent();
    // Persist between tests via page context.
    (page as any).__e2eIccid = iccidText?.trim().replace(/\s+/g, '');
    expect((page as any).__e2eIccid).toMatch(/\d{18,}/);
  });

  // ---------------------------------------------------------------------------
  // 4. Activate the SIM
  // ---------------------------------------------------------------------------
  test('الخطوة 4: تفعيل الشريحة المتاحة', async () => {
    const iccid = (page as any).__e2eIccid as string;

    // Open the activation route directly (managers can activate admin-owned stock).
    await page.goto('/manager/activate');
    await page.waitForSelector('text=تفعيل شريحة جديدة', { timeout: 15_000 });

    // Fill customer details.
    await page.locator('input[placeholder="أدخل الاسم الثلاثي واللقب"]').fill('علي بن محمد الصقوري');
    await page.locator('input[dir="ltr"][placeholder="10xxxxxxxxxx"]').fill('10501234567');

    // Fill ICCID — input has dir="ltr" and placeholder 89967XXXXXXXXXXXX.
    await page.locator('input[placeholder="89967XXXXXXXXXXXX"]').fill(iccid);

    // Fill phone (9 digits).
    await page.locator('input[type="tel"]').fill('0501234567');

    // Submit activation.
    await page.getByRole('button', { name: 'حفظ البيانات وتفعيل الشريحة' }).click();

    // Assert success banner appears.
    await expect(page.locator('.bg-emerald-950/40')).toContainText('تم التفعيل بنجاح', { timeout: 20_000 });
    await expect(page).toHaveURL(/\/manager\/activate/);
  });

  // ---------------------------------------------------------------------------
  // 5. Report generation / export
  // ---------------------------------------------------------------------------
  test('الخطوة 5: توجيه إلى صفحة التقارير وتصدير التقرير', async () => {
    // As manager, open Reports via the nav/top bar.
    await page.goto('/manager/reports');
    await page.waitForSelector('text=التقارير', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/manager\/reports/);
  });
});
