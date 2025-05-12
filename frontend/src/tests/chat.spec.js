// tests/chat.spec.js
import { test, expect } from '@playwright/test';

test('ChatPage без логина редиректит на главную', async ({ page }) => {
    await page.goto('/chat/123');
    await expect(page).toHaveURL('/');
});
