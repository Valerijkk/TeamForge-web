// tests/calendar.spec.js
import { test, expect } from '@playwright/test';

test('CalendarPage без логина показывает приглашение войти', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page.locator('text=Пожалуйста, войдите, чтобы увидеть календарь!')).toBeVisible();
});
