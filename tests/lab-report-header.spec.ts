import { test, expect } from '@playwright/test';

test.describe('Task 4: Lab Test Report Template Header Redesign (/ui-ux-pro-max)', () => {
  test('should render the modern clinical laboratory header with accreditations, QR security, and 3-column demographics matrix', async ({ page }) => {
    // 1. Mock Authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-labtech-1',
        fullName: 'Lab Technologist Shantha',
        email: 'lab@amaz.com',
        role: 'LAB_TECHNICIAN',
        department: 'LABORATORY'
      }));
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-labtech-1',
            fullName: 'Lab Technologist Shantha',
            email: 'lab@amaz.com',
            role: 'LAB_TECHNICIAN',
            department: 'LABORATORY'
          }
        })
      });
    });

    // 2. Navigate to lab report preview
    await page.goto('http://localhost:3000/lab-report-preview', { waitUntil: 'domcontentloaded' });

    // 3. Verify Hospital Brand Header
    const hospitalTitle = page.locator('text=AMAZ');
    await expect(hospitalTitle.first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Hospital Laboratories').first()).toBeVisible();
    await expect(page.locator('text=Department of Pathology & Clinical Laboratory Sciences')).toBeVisible();
    await expect(page.locator('text=Reg: PHSRC/PH/306').first()).toBeVisible();

    // 4. Verify Quality & Accreditation Badges (replacing old grey mock boxes)
    await expect(page.locator('text=ISO 15189:2022 Accredited')).toBeVisible();
    await expect(page.locator('text=CLSI Member (USA)')).toBeVisible();
    await expect(page.locator('text=Bio-Rad EQAS Certified')).toBeVisible();

    // 5. Verify Security & QR Verification Block
    await expect(page.locator('text=Authentic Clinical Report')).toBeVisible();
    await expect(page.locator('text=Scan to verify online')).toBeVisible();
    await expect(page.locator('text=DOC: LAB/REP-07')).toBeVisible();

    // 6. Verify Executive 3-Column Patient & Specimen Demographics Matrix
    await expect(page.locator('text=Patient Demographics')).toBeVisible();
    await expect(page.locator('text=Specimen & Reference')).toBeVisible();
    await expect(page.locator('text=Clinical Referral')).toBeVisible();
    await expect(page.locator('text=Referred By Consultant')).toBeVisible();
    await expect(page.locator('text=Test / Investigation Profile')).toBeVisible();
  });
});
