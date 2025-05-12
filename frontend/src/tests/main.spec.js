// tests/main.spec.js
import { test, expect } from '@playwright/test';

test('MainPage отображается корректно', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('TeamForge');
    await expect(page.locator('p')).toContainText('Чат для программистов');
    await expect(page.locator('a.cta-button')).toHaveAttribute('href', '/register');
});
