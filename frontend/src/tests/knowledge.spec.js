// tests/knowledge.spec.js
import { test, expect } from '@playwright/test';

test('KnowledgeBasePage отображает статьи и работает разворачивание', async ({ page }) => {
    await page.goto('/knowledge');
    await expect(page.locator('h2')).toHaveText('База знаний');

    const first = page.locator('.knowledge-item').first();
    // заголовок первой статьи
    await expect(first.locator('h3')).toHaveText('Основы HTML');
    // кнопка Подробнее и iframe
    await first.locator('button:has-text("Подробнее")').click();
    await expect(first.locator('iframe')).toHaveAttribute(
        'src',
        'https://rivilart.github.io/html-basics.html'
    );
});
