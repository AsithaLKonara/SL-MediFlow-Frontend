import { test, expect } from '@playwright/test';

test.describe('Production Login & CORS Audit: https://amazhospital.lk/login', () => {
  test('Production login must execute cleanly without CORS blocks or Failed to fetch errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const failedRequests: string[] = [];
    let loginResponseStatus: number | null = null;
    let loginResponseHeaders: Record<string, string> = {};

    // 1. Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // 2. Listen for request failures
    page.on('requestfailed', (req) => {
      failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`);
    });

    // 3. Intercept and inspect login API response
    page.on('response', (res) => {
      if (res.url().includes('/api/auth/login')) {
        loginResponseStatus = res.status();
        loginResponseHeaders = res.headers();
      }
    });

    // 4. Navigate to live production login page
    await page.goto('https://amazhospital.lk/login', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Assert login form loaded
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    const submitButton = page.locator('button[type="submit"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitButton).toBeVisible();

    // 5. Fill credentials matching user scenario
    await emailInput.fill('sadunika@amazhospital.lk');
    await passwordInput.fill('TestAudit123!@#');

    // 6. Click Sign In
    await submitButton.click();

    // Wait for network response to complete
    await page.waitForResponse((res) => res.url().includes('/api/auth/login'), { timeout: 15000 });
    await page.waitForTimeout(1000);

    // 7. Verify Network and CORS assertions:
    // Ensure the response was received (not network error / failed to fetch)
    expect(loginResponseStatus).not.toBeNull();
    expect(loginResponseStatus).not.toBe(502); // Must NOT be 502 Bad Gateway
    expect(loginResponseStatus).not.toBe(500);

    // Verify Access-Control-Allow-Origin header is present
    const corsOrigin = loginResponseHeaders['access-control-allow-origin'];
    expect(corsOrigin).toBe('https://amazhospital.lk');

    // 8. Verify Console has NO CORS or ERR_FAILED errors
    const corsErrors = consoleErrors.filter((err) =>
      err.toLowerCase().includes('cors') ||
      err.includes('net::ERR_FAILED') ||
      err.includes('Access-Control-Allow-Origin')
    );
    expect(corsErrors).toEqual([]);

    // 9. Verify UI state:
    // Must NOT contain "Failed to fetch"
    const failedToFetchBanner = page.locator('text="Failed to fetch"');
    const isFailedToFetchVisible = await failedToFetchBanner.isVisible().catch(() => false);
    expect(isFailedToFetchVisible).toBe(false);

    // Capture screenshot of live production state
    await page.screenshot({
      path: '/Users/asithalakmal/.gemini/antigravity/brain/8b155b0a-0552-44d2-8612-1384f7263570/screenshot-production-login-audit.png',
      fullPage: false
    });
  });
});
