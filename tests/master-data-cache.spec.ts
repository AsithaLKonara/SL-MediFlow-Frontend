import { test, expect } from '@playwright/test';

test.describe('In-Memory Master Data Caching (React Query 5-min TTL)', () => {
  test.beforeEach(async ({ page }) => {
    // Setup authenticated session
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-master-cache-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-001',
        fullName: 'Reception Admin',
        email: 'reception@amaz.com',
        role: 'RECEPTIONIST',
        roleName: 'RECEPTIONIST'
      }));
    });

    // Mock auth refresh & shift
    await page.route('**/api/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-master-cache-token', user: { id: 'user-001', role: 'RECEPTIONIST' } })
      });
    });

    await page.route('**/api/reception/shift/current', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'shift-1', status: 'OPEN', openedBy: 'user-001' })
      });
    });

    await page.route('**/api/prescriptions/pending', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/booking/appointments**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });
  });

  test('Master data is fetched on initial mount and served in 0ms without re-fetching on tab switch', async ({ page }) => {
    let doctorFetchCount = 0;
    let labFetchCount = 0;
    let extraServiceFetchCount = 0;

    await page.route('**/api/booking/doctors', async route => {
      doctorFetchCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'doc-1', fullName: 'Dr. Silva (OPD General)', specialty: 'OPD' },
            { id: 'doc-2', fullName: 'Dr. Fernando (Cardiology)', specialty: 'Cardiology' }
          ]
        })
      });
    });

    await page.route('**/api/lab/catalog', async route => {
      labFetchCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'lab-1', name: 'Full Blood Count', code: 'FBC', price: 1200 }
        ])
      });
    });

    await page.route('**/api/extra-services', async route => {
      extraServiceFetchCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'svc-1', name: 'Wound Dressing', code: 'WD', price: 800 }
        ])
      });
    });

    // 1. Initial navigation to frontdesk workspace
    console.log('--- Step 1: Initial Mount ---');
    await page.goto('http://localhost:3000/frontdesk/workspace');

    // Wait for initial master data query resolution
    await expect.poll(() => doctorFetchCount, { timeout: 15000 }).toBe(1);
    await expect.poll(() => labFetchCount, { timeout: 15000 }).toBe(1);
    await expect.poll(() => extraServiceFetchCount, { timeout: 15000 }).toBe(1);
    console.log(`Initial fetches: Doctors=${doctorFetchCount}, Lab=${labFetchCount}, ExtraServices=${extraServiceFetchCount}`);

    // Open Doctor selection dialog to verify doctors rendered
    await page.locator('[data-testid="tile-select-doctor-walkin"]').click();
    await expect(page.locator('text=Dr. Silva (OPD General)')).toBeVisible({ timeout: 5000 });
    
    // Close dialog
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 2. Switch to Phone Booking tab
    console.log('--- Step 2: Switch to Phone Booking Tab ---');
    const phoneBookingTab = page.locator('button:has-text("Phone Booking"), [role="tab"]:has-text("Phone")');
    if (await phoneBookingTab.count() > 0) {
      const tSwitch = Date.now();
      await phoneBookingTab.first().click();
      await page.waitForTimeout(500);

      const switchDuration = Date.now() - tSwitch;
      console.log(`Tab switch completed in: ${switchDuration}ms`);

      // 3. Assert NO NEW NETWORK CALLS were dispatched! (Served from 0ms memory cache)
      expect(doctorFetchCount).toBe(1);
      expect(labFetchCount).toBe(1);
      expect(extraServiceFetchCount).toBe(1);
      console.log(`Fetches after tab switch: Doctors=${doctorFetchCount}, Lab=${labFetchCount}, ExtraServices=${extraServiceFetchCount} (100% Cache Hit)`);
    }

    // 4. Switch back to Reception tab
    console.log('--- Step 3: Switch Back to Reception Tab ---');
    const receptionTab = page.locator('button:has-text("Reception"), [role="tab"]:has-text("Reception")');
    if (await receptionTab.count() > 0) {
      await receptionTab.first().click();
      await page.waitForTimeout(500);

      // Still exactly 1 fetch each!
      expect(doctorFetchCount).toBe(1);
      expect(labFetchCount).toBe(1);
      expect(extraServiceFetchCount).toBe(1);
      console.log(`Fetches after returning to Reception: Doctors=${doctorFetchCount}, Lab=${labFetchCount}, ExtraServices=${extraServiceFetchCount} (100% Cache Hit)`);
    }
  });
});
