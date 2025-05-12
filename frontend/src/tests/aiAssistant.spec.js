// tests/aiAssistant.spec.js
import { test, expect } from '@playwright/test';

test('AIAssistantPage содержит iframe внешнего ассистента', async ({ page }) => {
    await page.goto('/ai-assistant');
    await expect(page.locator('h2')).toHaveText('ИИ Помощник');
    const frame = page.locator('iframe');
    await expect(frame).toHaveAttribute('src', 'https://www.blackbox.ai/');
});
