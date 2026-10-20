import { test, expect } from '@playwright/test';

test.describe('Task 3: Doctor Dashboard Next Up For Consultation Positioning', () => {
  test('should display Next Up for Consultation directly below action tiles and before earnings table', async ({ page }) => {
    // 1. Mock Authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-doctor-uuid-1',
        fullName: 'Dr. V.K.P.A. Mahesh Lakshman',
        email: 'doctor.mahesh@amaz.com',
        role: 'DOCTOR',
        department: 'OPD'
      }));
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-doctor-uuid-1',
            fullName: 'Dr. V.K.P.A. Mahesh Lakshman',
            email: 'doctor.mahesh@amaz.com',
            role: 'DOCTOR',
            department: 'OPD'
          }
        })
      });
    });

    // Mock tokens queue endpoint
    const todayStr = new Date().toISOString();
    await page.route('**/api/tokens/queue**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'visit-101',
            tokenNumber: 'OPD-01',
            patientId: 'patient-uuid-101',
            status: 'BOOKED',
            appointmentDate: todayStr,
            department: 'Persistent dry cough and mild fever',
            Patient: {
              id: 'patient-uuid-101',
              fullName: 'Kavindu Senanayake',
              ageFallback: 28
            }
          },
          {
            id: 'visit-102',
            tokenNumber: 'OPD-02',
            patientId: 'patient-uuid-102',
            status: 'WAITING',
            appointmentDate: todayStr,
            department: 'Routine blood pressure review',
            Patient: {
              id: 'patient-uuid-102',
              fullName: 'Anula Wijesinghe',
              ageFallback: 52
            }
          }
        ])
      });
    });

    // Mock earnings endpoint
    await page.route('**/api/doctor/earnings/today**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          todayDoctorShare: 9600,
          todayRevenue: 12000,
          todayCommission: 2400,
          todayPatientsCount: 8,
          todaySheetStatus: 'DRAFT',
          commissionRate: 20,
          patientItems: []
        })
      });
    });

    // Mock extra-services orders
    await page.route('**/api/extra-services/orders**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // 2. Navigate to Doctor Dashboard
    await page.goto('http://localhost:3000/doctor', { waitUntil: 'domcontentloaded' });

    // 3. Locate elements
    const nextUpCard = page.locator('[data-testid="next-up-consultation-card"]');
    await expect(nextUpCard).toBeVisible({ timeout: 15000 });
    await expect(nextUpCard).toContainText('Next Up for Consultation');
    await expect(nextUpCard).toContainText('Kavindu Senanayake');
    await expect(nextUpCard).toContainText('OPD-01');
    await expect(nextUpCard).toContainText('Anula Wijesinghe');
    await expect(nextUpCard).toContainText('OPD-02');

    // 4. Verify Relative DOM Order:
    // Action Tiles -> Next Up for Consultation -> Today's Consultation Earnings & Doctor Share
    const isOrderedCorrectly = await page.evaluate(() => {
      const allCards = Array.from(document.querySelectorAll('.space-y-8 > *'));
      const tilesIndex = allCards.findIndex(el => el.querySelector('a[href="/doctor/queue"]'));
      const nextUpIndex = allCards.findIndex(el => el.getAttribute('data-testid') === 'next-up-consultation-card');
      const earningsIndex = allCards.findIndex(el => el.textContent?.includes("Today's Consultation Earnings"));

      return {
        tilesIndex,
        nextUpIndex,
        earningsIndex,
        valid: tilesIndex !== -1 && nextUpIndex > tilesIndex && (earningsIndex === -1 || nextUpIndex < earningsIndex)
      };
    });

    expect(isOrderedCorrectly.valid).toBe(true);
    expect(isOrderedCorrectly.nextUpIndex).toBeGreaterThan(isOrderedCorrectly.tilesIndex);
    expect(isOrderedCorrectly.nextUpIndex).toBeLessThan(isOrderedCorrectly.earningsIndex);

    // 5. Verify "Start" button for top patient
    const startBtn = nextUpCard.locator('[data-testid="start-consultation-btn"]').first();
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toHaveText('Start');
  });
});
