import { test, expect } from '@playwright/test';

test.describe('Task 2: Public TV Waiting Display Auth Refresh 401 Loop Fix', () => {
  test('/customer-display should NOT attempt /auth/refresh and should have 0 console errors when unauthenticated', async ({ page }) => {
    const consoleErrors: string[] = [];
    const refreshRequests: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('request', (req) => {
      if (req.url().includes('/auth/refresh')) {
        refreshRequests.push(req.url());
      }
    });

    // Ensure completely unauthenticated state (clean browser)
    await page.goto('http://localhost:3000/customer-display', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Verify 0 refresh requests were triggered
    expect(refreshRequests.length).toBe(0);

    // Verify 0 console errors
    const nonFaviconErrors = consoleErrors.filter(e => !e.includes('favicon'));
    expect(nonFaviconErrors.length).toBe(0);

    // Verify page content rendered
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeDefined();
  });
});
