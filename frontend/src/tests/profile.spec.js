// tests/profile.spec.js
import { test, expect } from '@playwright/test';

test('ProfilePage без логина редиректит на главную', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL('/');
});
