import { expect, test } from '@playwright/test';

const loginEmail = process.env.MI_HOGAR_TEST_EMAIL ?? process.env.ADMIN_EMAIL;
const loginPassword = process.env.MI_HOGAR_TEST_PASSWORD ?? process.env.ADMIN_PASSWORD;

test.skip(!loginEmail || !loginPassword, 'ADMIN_EMAIL and ADMIN_PASSWORD are required for this navigation test.');

test('savings page does not get stuck loading after navigating away and back', async ({ page }) => {
  await page.goto('/apps/mi-hogar/login');

  await page.locator('input[type="email"]').fill(loginEmail!);
  await page.locator('input[type="password"]').fill(loginPassword!);
  await page.locator('button[type="submit"]').click();

  await page.waitForURL('**/apps/mi-hogar', { timeout: 20_000 });

  await page.goto('/apps/mi-hogar/savings');
  await expect(page).toHaveURL(/\/apps\/mi-hogar\/savings/);

  await page.waitForTimeout(1_500);
  await expect(page.getByText('Volver')).toBeVisible();

  await page.goto('/apps/mi-hogar');
  await expect(page).toHaveURL(/\/apps\/mi-hogar$/);

  await page.goto('/apps/mi-hogar/savings');
  await expect(page).toHaveURL(/\/apps\/mi-hogar\/savings/);
  await expect(page.getByText('Volver')).toBeVisible();

  const loadingText = page.getByText('Cargando');
  await expect(loadingText).toHaveCount(0);
});
