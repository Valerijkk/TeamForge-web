// playwright.config.js
/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
    use: {
        baseURL: 'http://localhost:3000',    // ваш dev-сервер
        headless: true,
        viewport: { width: 1280, height: 720 },
        actionTimeout: 5000,
        ignoreHTTPSErrors: true,
    },
    testDir: 'tests',                      // папка с тестами
    timeout: 30_000,
    retries: 1,
    reporter: [['list'], ['html', { open: 'never' }]],
};
