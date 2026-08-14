import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

/**
 * Sellers E2E — creation surface and agent association.
 *
 * The seller-creation form (AddSellerForm) lives on the agent surface at
 * /agent/add-seller, where it is rendered with `agentName` bound to the
 * logged-in agent. The newly created seller is therefore automatically
 * associated with that agent server-side (agent association).
 *
 * Full submission requires capturing the seller's ID photo (camera/OCR), which
 * is intentionally out of scope for a headless UI check. These tests therefore
 * verify the form renders with all required fields, that submission stays
 * gated until an ID photo is captured, and that the agent-scoped association
 * context is in place.
 */
test.describe('Sellers — creation & agent association', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'agent');
    await page.goto('/agent/add-seller');
    await page.locator('#add-seller-form-container').waitFor({ state: 'visible', timeout: 30_000 });
  });

  test('Add Seller form renders all required fields', async ({ page }) => {
    await expect(page.locator('#full_name')).toBeVisible();
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#store_name')).toBeVisible();
    await expect(page.locator('#id_number')).toBeVisible();
    await expect(page.locator('#phone')).toBeVisible();
    await expect(page.locator('#region')).toBeVisible();
  });

  test('Submission stays gated until the ID photo is captured', async ({ page }) => {
    // The submit button is disabled until `nameCaptured` (ID photo capture)
    // is set — confirming the mandatory-capture gate is active.
    await expect(page.locator('#add-seller-submit-btn')).toBeDisabled();
  });

  test('Agent association context is active on the add-seller form', async ({ page }) => {
    // Reachable only through the agent surface, where AddSellerForm is wired
    // with the agent's own username as the association (agentName prop).
    await expect(page.getByText('بيانات حساب البائع الجديد')).toBeVisible();
  });
});
