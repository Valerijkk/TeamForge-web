// tests/calls.spec.js
import { test, expect } from '@playwright/test';

test('CallsPage без логина редиректит на главную', async ({ page }) => {
    await page.goto('/calls');
    await expect(page).toHaveURL('/');
});
