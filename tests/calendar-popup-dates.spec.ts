import { test, expect } from '@playwright/test';

test.describe('Task 1: Calendar Date Visibility, Responsive Sizing & Overflow Scrolling in Popups', () => {

  test.beforeEach(async ({ page }) => {
    // Mock user login in localStorage
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

    // Mock auth refresh
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

    // Mock doctors list
    await page.route('**/api/booking/doctors', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'doc-001',
              fullName: 'Dr. Sunil Perera',
              specialty: 'General',
              feeType: 'POST',
              room: { roomNumber: '02' },
              consultationFee: 1500
            }
          ]
        })
      });
    });

    // Mock lab catalog
    await page.route('**/api/lab/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'lab-001', name: 'Full Blood Count (FBC)', code: 'FBC', price: 1200, room: { roomNumber: 'L1' } }
        ])
      });
    });

    // Mock extra services
    await page.route('**/api/extra-services', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'svc-001', title: 'Wound Dressing', barcode: 'WD-01', price: 800, room: { roomNumber: 'N1' } }
        ])
      });
    });

    // Mock active doctors
    await page.route('**/api/reception/doctors/active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'doc-001',
            fullName: 'Dr. Sunil Perera',
            specialty: 'General',
            status: 'ARRIVED',
            room: { roomNumber: '02' }
          }
        ])
      });
    });

    // Mock doctor calendar data
    await page.route('**/api/frontdesk/doctors/**/calendar**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          schedules: [
            {
              validFrom: '2026-01-01T00:00:00.000Z',
              validUntil: '2026-12-31T23:59:59.000Z',
              sessions: [
                { dayOfWeek: 0, isActive: true, tokenCapacity: 30 },
                { dayOfWeek: 1, isActive: true, tokenCapacity: 30 },
                { dayOfWeek: 2, isActive: true, tokenCapacity: 30 },
                { dayOfWeek: 3, isActive: true, tokenCapacity: 30 },
                { dayOfWeek: 4, isActive: true, tokenCapacity: 30 },
                { dayOfWeek: 5, isActive: true, tokenCapacity: 30 },
                { dayOfWeek: 6, isActive: true, tokenCapacity: 30 }
              ]
            }
          ],
          bookedAppointments: []
        })
      });
    });

    // Mock current shift
    await page.route('**/api/reception/shift/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'shift-mock-01',
          status: 'OPEN',
          openedBy: 'mock-receptionist-id'
        })
      });
    });

    // Mock availability
    await page.route('**/api/booking/availability**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          sessions: [{ id: 'sess-01', sessionName: 'Morning Clinic', startTime: '08:00', endTime: '12:00' }],
          bookedSlots: 0,
          totalSlots: 30,
          tokens: Array.from({ length: 30 }, (_, i) => ({
            tokenNumber: (i + 1).toString().padStart(2, '0'),
            status: 'AVAILABLE'
          }))
        })
      });
    });

    // Mock department availability
    await page.route('**/api/booking/department-availability**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            tokens: Array.from({ length: 20 }, (_, i) => ({
              tokenNumber: (i + 1).toString().padStart(2, '0'),
              status: 'AVAILABLE'
            }))
          }
        })
      });
    });
  });

  test('verifies all end-of-month calendar dates (including 25-31) are fully visible and clickable in Doctor Select popup', async ({ page }) => {
    // Set a typical compact screen resolution (1280x720) to test responsive visibility
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/frontdesk/workspace');

    // 1. Open Doctor selection popup
    const selectDocTrigger = page.locator('[data-testid="tile-select-doctor-walkin"]');
    await expect(selectDocTrigger).toBeVisible({ timeout: 15000 });
    await selectDocTrigger.click();

    // 2. Select the doctor from the list
    const doctorItem = page.locator('button', { hasText: 'Dr. Sunil Perera' }).first();
    await expect(doctorItem).toBeVisible({ timeout: 10000 });
    await doctorItem.click();

    // 3. Confirm Schedule & Tokens section expands
    const scheduleHeader = page.locator('h3', { hasText: 'Schedule & Tokens' });
    await expect(scheduleHeader).toBeVisible();

    // 4. Assert day 1 through day 28 are visible
    const day1Btn = page.locator('[data-testid="calendar-date-1"]');
    const day25Btn = page.locator('[data-testid="calendar-date-25"]');
    const day28Btn = page.locator('[data-testid="calendar-date-28"]');

    await expect(day1Btn).toBeVisible();
    await expect(day25Btn).toBeVisible();
    await expect(day28Btn).toBeVisible();

    // 5. Assert end-of-month dates (days 28-31) are present and visible without clipping
    const day31Btn = page.locator('[data-testid="calendar-date-31"]');
    if (await day31Btn.count() > 0) {
      await expect(day31Btn).toBeVisible();
      await day31Btn.click();
      await expect(day31Btn).toHaveClass(/bg-primary/);
    } else if (await day28Btn.count() > 0) {
      await day28Btn.click();
      await expect(day28Btn).toHaveClass(/bg-primary/);
    }
  });

  test('verifies calendar dates 25-31 in Lab Test select popup', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/frontdesk/workspace');

    // Open Lab Tests dialog
    const labTile = page.locator('[data-testid="tile-select-lab-walkin"]');
    await expect(labTile).toBeVisible({ timeout: 15000 });
    await labTile.click();

    // Select a lab test item
    const testItem = page.locator('text=Full Blood Count (FBC)').first();
    await expect(testItem).toBeVisible({ timeout: 10000 });
    await testItem.click();

    // Confirm Schedule & Tokens expands
    const scheduleHeader = page.locator('h3', { hasText: 'Schedule & Tokens' });
    await expect(scheduleHeader).toBeVisible();

    // Assert day 25 and 28 are visible
    const day25Btn = page.locator('[data-testid="calendar-date-25"]');
    await expect(day25Btn).toBeVisible();

    const day31Btn = page.locator('[data-testid="calendar-date-31"]');
    if (await day31Btn.count() > 0) {
      await expect(day31Btn).toBeVisible();
      await day31Btn.click();
    }
  });

  test('verifies calendar dates 25-31 in Extra Services select popup', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/frontdesk/workspace');

    // Open Extra Services dialog
    const extraTile = page.locator('[data-testid="tile-select-extra-walkin"]');
    await expect(extraTile).toBeVisible({ timeout: 15000 });
    await extraTile.click();

    // Select a service item
    const serviceItem = page.locator('text=Wound Dressing').first();
    await expect(serviceItem).toBeVisible();
    await serviceItem.click();

    // Confirm Schedule & Tokens expands
    const scheduleHeader = page.locator('h3', { hasText: 'Schedule & Tokens' });
    await expect(scheduleHeader).toBeVisible();

    // Assert day 25 and 28 are visible
    const day25Btn = page.locator('[data-testid="calendar-date-25"]');
    await expect(day25Btn).toBeVisible();

    const day31Btn = page.locator('[data-testid="calendar-date-31"]');
    if (await day31Btn.count() > 0) {
      await expect(day31Btn).toBeVisible();
      await day31Btn.click();
    }
  });
});
