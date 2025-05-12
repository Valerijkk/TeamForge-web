// tests/chats.spec.js
import { test, expect } from '@playwright/test';

test('ChatsPage без логина редиректит на главную', async ({ page }) => {
    await page.goto('/chats');
    await expect(page).toHaveURL('/');
});
