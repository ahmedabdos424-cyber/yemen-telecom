import { type Page } from '@playwright/test';

export type Role = 'manager' | 'agent' | 'seller';

interface Creds {
  user: string;
  pass: string;
}

const env = process.env;

/**
 * Credentials for each role. Defaults to the seeded demo accounts; override via
 * environment variables so secrets are never hard-coded in the suite.
 */
const CREDENTIALS: Record<Role, Creds> = {
  manager: { user: env.E2E_MANAGER_USER ?? 'manager', pass: env.E2E_MANAGER_PASS ?? 'Test@123' },
  agent: { user: env.E2E_AGENT_USER ?? 'agent', pass: env.E2E_AGENT_PASS ?? 'Test@123' },
  seller: { user: env.E2E_SELLER_USER ?? 'seller', pass: env.E2E_SELLER_PASS ?? 'Test@123' },
};

/** Role-scoped landing route the SPA redirects to after a successful login. */
export const LANDING: Record<Role, RegExp> = {
  manager: /\/manager\/dashboard/,
  agent: /\/agent\/home/,
  seller: /\/seller\/home/,
};

/**
 * Performs a full UI login: waits for the login screen (after the splash /
 * server-awake gate), fills the username & password, submits, and waits for the
 * role-specific dashboard to load. Relies on the JWT httpOnly cookie set by the
 * server, so subsequent `page.goto` calls stay authenticated.
 */
export async function loginAs(page: Page, role: Role): Promise<void> {
  const { user, pass } = CREDENTIALS[role];
  await page.goto('/');
  const username = page.getByPlaceholder('أدخل اسم المستخدم');
  await username.waitFor({ state: 'visible', timeout: 60_000 });
  await username.fill(user);
  await page.locator('#login-password').fill(pass);
  await page.getByRole('button', { name: /تسجيل الدخول/ }).click();
  await page.waitForURL(LANDING[role], { timeout: 45_000 });
}
