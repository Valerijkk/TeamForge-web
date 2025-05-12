// tests/register.spec.js
import { test, expect } from '@playwright/test';

test.describe('RegisterPage', () => {
    // каждый запуск – уникальный логин/емейл
    const suffix = Date.now();
    const USERNAME = `user_${suffix}`;
    const EMAIL = `user_${suffix}@example.com`;
    const PASSWORD = 'password';

    test.beforeEach(async ({ page }) => {
        await page.goto('/register');
    });

    test('форма регистрации отображается', async ({ page }) => {
        await expect(page.locator('h2')).toHaveText('Регистрация');
        await expect(page.locator('input[placeholder="Имя пользователя"]')).toBeVisible();
        await expect(page.locator('input[placeholder="Ваша почта"]')).toBeVisible();
        await expect(page.locator('input[placeholder="Пароль"]')).toBeVisible();
        await expect(page.locator('button:has-text("Зарегистрироваться")')).toBeVisible();
    });

    test('успешная регистрация ведёт в чаты', async ({ page }) => {
        await page.fill('input[placeholder="Имя пользователя"]', USERNAME);
        await page.fill('input[placeholder="Ваша почта"]', EMAIL);
        await page.fill('input[placeholder="Пароль"]', PASSWORD);
        await page.click('button:has-text("Зарегистрироваться")');
        await expect(page).toHaveURL(/\/chats$/);
        // выходим
        await page.click('text=Профиль');
        await page.click('button:has-text("Выйти")');
    });
});
