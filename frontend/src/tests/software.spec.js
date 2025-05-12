// tests/software.spec.js
import { test, expect } from '@playwright/test';

test('SoftwarePage доступна без логина и без кнопок редактирования', async ({ page }) => {
    await page.goto('/software');
    await expect(page.locator('h2')).toHaveText('Программное обеспечение');
    // никаких кнопок «Редактировать» для не-админа
    await expect(page.locator('button:has-text("Редактировать")')).toHaveCount(0);
});
