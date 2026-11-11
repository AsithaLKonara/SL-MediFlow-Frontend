import { test, expect } from '@playwright/test';

test.describe('Task 1: Doctor Attendance Route & Frontdesk Verification', () => {
  test('GET /api/receptionist/doctors/today should return 200 with doctor status list', async ({ page }) => {
    // 1. Mock Frontdesk / Cashier Authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-reception-user-1',
        fullName: 'Udari Receptionist',
        email: 'udari@slmediflow.lk',
        role: 'Receptionist'
      }));
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-reception-user-1',
            fullName: 'Udari Receptionist',
            email: 'udari@slmediflow.lk',
            role: 'Receptionist'
          }
        })
      });
    });

    await page.route('**/api/reception/shift/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'shift-1',
          status: 'OPEN',
          cashierId: 'mock-reception-user-1',
          startingCash: 5000
        })
      });
    });

    // Mock backend /doctors/today route
    await page.route('**/api/doctors/today', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'doc-1',
              fullName: 'Dr. V.K.P.A. Mahesh Lakshman',
              specialty: 'OPD',
              department: 'OPD',
              status: 'ARRIVED',
              arrivedAt: new Date().toISOString()
            },
            {
              id: 'doc-2',
              fullName: 'Dr. William De Silva',
              specialty: 'Cardiology',
              department: 'CARDIOLOGY',
              status: 'SCHEDULED',
              arrivedAt: null
            }
          ]
        })
      });
    });

    // Test API route handler
    const response = await page.request.get('http://localhost:3000/api/receptionist/doctors/today');
    expect(response.status()).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThanOrEqual(1);

    // Verify Frontdesk dashboard where receptionist is routed
    await page.goto('http://localhost:3000/frontdesk', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('SL MediFlow');
  });
});
