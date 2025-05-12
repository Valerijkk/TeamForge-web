// tests/login.spec.js
import { test, expect } from '@playwright/test';

// Задайте реальные креды в переменных окружения или замените тут
const USERNAME = process.env.PLAYWRIGHT_USERNAME || 'testuser';
const PASSWORD = process.env.PLAYWRIGHT_PASSWORD || 'password';

test.describe('LoginPage', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });

    test('форма входа отображается', async ({ page }) => {
        await expect(page.locator('h2')).toHaveText('Вход');
        await expect(page.locator('input[placeholder="Имя пользователя"]')).toBeVisible();
        await expect(page.locator('input[placeholder="Пароль"]')).toBeVisible();
        await expect(page.locator('button:has-text("Войти")')).toBeVisible();
    });

    test('успешный логин ведёт в чаты', async ({ page }) => {
        await page.fill('input[placeholder="Имя пользователя"]', USERNAME);
        await page.fill('input[placeholder="Пароль"]', PASSWORD);
        await page.click('button:has-text("Войти")');
        await expect(page).toHaveURL(/\/chats$/);
        // возвращаемся к профилю и выходим, чтобы не портить состояние следующих тестов
        await page.click('text=Профиль');
        await page.click('button:has-text("Выйти")');
    });
});
