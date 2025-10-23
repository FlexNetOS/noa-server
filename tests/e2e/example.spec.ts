import { test, expect } from '@playwright/test';

test.describe('Example E2E Test Suite', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Noa Server/);
  });

  test('should navigate between pages', async ({ page }) => {
    await page.goto('/');
    // Add your navigation tests here
  });
});
