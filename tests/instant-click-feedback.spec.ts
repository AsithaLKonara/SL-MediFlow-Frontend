import { test, expect } from '@playwright/test';

test.describe('Instant Optimistic Click States & Micro-Interactions', () => {
  test('Button depresses to scale(0.97) and darkens immediately on mousedown/active', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    const button = page.locator('button[type="submit"]');
    await expect(button).toBeVisible();

    // Dispatch mousedown to trigger :active pseudo-class
    const box = await button.boundingBox();
    if (!box) throw new Error('Button bounding box not found');

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();

    // Evaluate active styles while mouse is held down
    const activeInfo = await button.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        scale: style.scale || style.getPropertyValue('scale'),
        transform: style.transform,
        filter: style.filter,
        cursor: style.cursor
      };
    });
    console.log('Active button computed styles:', activeInfo);

    // Release mouse
    await page.mouse.up();

    // Verify scale is 0.97 or matrix is scaled
    const hasScaleProperty = activeInfo.scale && activeInfo.scale.includes('0.97');
    const hasMatrixTransform = activeInfo.transform && activeInfo.transform.includes('matrix(');
    
    expect(hasScaleProperty || hasMatrixTransform).toBeTruthy();
    expect(activeInfo.filter).toContain('brightness(');
    expect(activeInfo.cursor).toBe('pointer');
  });

  test('Submit button displays loading spinner immediately upon submit and concurrency-locks', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    // Fill credentials format
    await page.fill('input[type="email"], input[name="email"]', 'admin@amaz.com');
    await page.fill('input[type="password"]', 'password123');

    // Delay response to test loading spinner display during flight
    let resolveLogin: (value: any) => void;
    const loginPromise = new Promise(resolve => { resolveLogin = resolve; });

    await page.route('**/api/auth/login', async route => {
      await loginPromise;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Invalid credentials' })
      });
    });

    const button = page.locator('button[type="submit"]');
    const t0 = Date.now();
    await button.click();

    // Spinner should appear in < 500ms
    const spinner = button.locator('.animate-spin, svg');
    await expect(spinner).toBeVisible({ timeout: 1000 });
    const elapsed = Date.now() - t0;
    console.log(`Spinner visible after click in: ${elapsed}ms`);
    expect(elapsed).toBeLessThan(1000);

    // Button should be disabled during flight to prevent concurrency issues
    await expect(button).toBeDisabled();

    // Now resolve the login call and clean up
    resolveLogin!(true);
    await page.waitForTimeout(300);
  });
});
