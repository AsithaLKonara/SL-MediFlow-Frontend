import { test, expect } from '@playwright/test';

test.describe('Cancellations Page Center Alignment', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-receptionist-id',
        fullName: 'Frontdesk Officer',
        email: 'frontdesk@amaz.com',
        role: 'RECEPTIONIST',
        roleName: 'RECEPTIONIST'
      }));
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-test-jwt-token',
          user: {
            id: 'mock-receptionist-id',
            fullName: 'Frontdesk Officer',
            email: 'frontdesk@amaz.com',
            role: 'RECEPTIONIST',
            roleName: 'RECEPTIONIST'
          }
        })
      });
    });

    await page.route('**/api/reception/shift/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'shift-mock-01',
          status: 'OPEN',
          openedBy: 'mock-receptionist-id',
          cashierName: 'Nawodya'
        })
      });
    });

    await page.route('**/api/reception/cancellations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
  });

  test('verifies cancellations content is centered with max-w-7xl and balanced horizontal margins', async ({ page }) => {
    // Set widescreen resolution (1920x1080) as shown in user screenshot
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/frontdesk/cancellations');

    const centeredContainer = page.locator('.max-w-7xl.mx-auto').first();
    await expect(centeredContainer).toBeVisible({ timeout: 15000 });

    const style = await centeredContainer.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        maxWidth: computed.maxWidth,
        width: computed.width,
        marginLeft: computed.marginLeft,
        marginRight: computed.marginRight,
      };
    });
    const box = await centeredContainer.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      const leftMargin = box.x;
      const rightMargin = 1920 - (box.x + box.width);
      
      // In 1920px width viewport, a max-w-7xl (1280px) centered container should have:
      // left margin ~= (1920 - 1280) / 2 = ~320px
      // right margin ~= (1920 - 1280) / 2 = ~320px
      expect(leftMargin).toBeGreaterThan(100);
      expect(rightMargin).toBeGreaterThan(100);
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThanOrEqual(25);
    }
  });
});
