import { test, expect } from '@playwright/test';

test.describe('Authentication flows', () => {
  test('logs in an existing user and lands on the dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Email address').fill('reporter@e2e.com');
    await page.getByLabel('Password').fill('e2e-password-123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Welcome back, E2E Reporter.')).toBeVisible();
  });

  test('registers a new user with the join code, verifies, and logs in', async ({ page }) => {
    const email = `newuser-${Date.now()}@e2e.com`;

    await page.goto('/register');

    await page.getByLabel('Display Name').fill('New User');
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill('e2e-password-123');
    await page.getByLabel('Organization Join Code').fill('E2E-JOIN-CODE');
    await page.getByRole('button', { name: 'Register' }).click();

    // Auto-captured verification token from register response (MVP shortcut)
    await expect(page).toHaveURL(/\/verify/);
    const tokenInput = page.locator('input#token');
    await expect(tokenInput).not.toHaveValue('');
    const token = await tokenInput.inputValue();
    expect(token.length).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Verify' }).click();

    // Redirects to login after verification
    await expect(page).toHaveURL(/\/login/);

    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill('e2e-password-123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText('Welcome back, New User.')).toBeVisible();
  });
});