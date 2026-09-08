import { test, expect } from '@playwright/test';

test.describe('Incident reporting flow', () => {
  test('reports a new incident and sees it in the list', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email address').fill('reporter@e2e.com');
    await page.getByLabel('Password').fill('e2e-password-123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await page.goto('/incidents');
    await page.getByRole('link', { name: 'Report Incident' }).click();

    await page.getByPlaceholder('Title').fill('E2E smoke incident');
    await page.getByPlaceholder('Description').fill('This incident was created by the Playwright smoke test.');
    await page.locator('select').nth(0).selectOption('MAINTENANCE');
    await page.locator('select').nth(1).selectOption('MEDIUM');
    await page.locator('select').nth(2).selectOption({ label: 'E2E Main Site' });

    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page).toHaveURL(/\/incidents$/);
    await expect(page.getByText('E2E smoke incident')).toBeVisible();
  });

  test('admin can access the triage queue', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email address').fill('admin@e2e.com');
    await page.getByLabel('Password').fill('e2e-password-123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await page.getByRole('link', { name: 'Admin' }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard/);

    await page.getByRole('link', { name: 'Go to Triage' }).click();
    await expect(page).toHaveURL(/\/admin\/triage/);
    await expect(page.getByText('Triage Queue (NEW)')).toBeVisible();
  });
});