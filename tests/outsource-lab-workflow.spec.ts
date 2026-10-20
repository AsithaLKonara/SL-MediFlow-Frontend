import { test, expect } from '@playwright/test';

test.describe('Task 5: Outsource Lab Testing Flow (Asiri & Ruhunu)', () => {
  test('should support partner config, customer pricing, profit calculation, daily reports tracking, and report receipt without upload', async ({ page }) => {
    // 1. Mock Authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-staff-uuid-1',
        fullName: 'Kamal Perera',
        email: 'lab.tech@amaz.com',
        role: 'LABTECH',
        department: 'LAB'
      }));
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-staff-uuid-1',
            fullName: 'Kamal Perera',
            email: 'lab.tech@amaz.com',
            role: 'LABTECH',
            department: 'LAB'
          }
        })
      });
    });

    // 2. Mock Catalog Tests
    await page.route('**/api/lab/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'test-cat-1',
            name: 'Thyroid Panel (TSH, FT3, FT4)',
            code: 'EXT-TSH',
            price: 4850,
            category: 'Endocrinology',
            isOutsideTest: true,
            outsourcedCenter: 'Asiri Laboratories',
            hospitalCommission: 650,
            outsourceCost: 4200,
            commissionType: 'FLAT'
          },
          {
            id: 'test-cat-2',
            name: 'Histopathology Biopsy',
            code: 'EXT-BIO',
            price: 7700,
            category: 'Histopathology',
            isOutsideTest: true,
            outsourcedCenter: 'Ruhunu Hospital Diagnostics',
            hospitalCommission: 1200,
            outsourceCost: 6500,
            commissionType: 'FLAT'
          }
        ])
      });
    });

    // 3. Mock Daily Outsource Endpoint
    await page.route('**/api/lab/outsource/daily**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: new Date().toISOString(),
          metrics: {
            totalRequested: 3,
            asiriCount: 2,
            ruhunuCount: 1,
            reportsReceivedCount: 1,
            handedOverCount: 0,
            totalHospitalProfit: 2650,
            totalCustomerRevenue: 18350
          },
          items: [
            {
              id: 'item-asiri-1',
              requestId: 'lr-ext-101',
              tokenNumber: 'LAB-41',
              bookingReference: 'AMAZ-20261021-101',
              patient: {
                fullName: 'Dayananda Gunasekara',
                phone: '0778899112',
                age: 58,
                gender: 'Male'
              },
              testName: 'Thyroid Stimulating Hormone (TSH / FT3 / FT4)',
              category: 'Endocrinology',
              outsourcedCenter: 'Asiri Laboratories',
              basePrice: 4200,
              hospitalCommission: 650,
              totalPrice: 4850,
              profit: 650,
              status: 'SAMPLE_COLLECTED',
              requestedAt: new Date().toISOString()
            },
            {
              id: 'item-ruhunu-2',
              requestId: 'lr-ext-102',
              tokenNumber: 'LAB-42',
              bookingReference: 'AMAZ-20261021-102',
              patient: {
                fullName: 'Sunethra Wickramasinghe',
                phone: '0714455667',
                age: 44,
                gender: 'Female'
              },
              testName: 'Histopathology Biopsy (Small Specimen)',
              category: 'Histopathology',
              outsourcedCenter: 'Ruhunu Hospital Diagnostics',
              basePrice: 6500,
              hospitalCommission: 1200,
              totalPrice: 7700,
              profit: 1200,
              status: 'DISPATCHED',
              requestedAt: new Date().toISOString()
            },
            {
              id: 'item-asiri-3',
              requestId: 'lr-ext-103',
              tokenNumber: 'LAB-43',
              bookingReference: 'AMAZ-20261021-103',
              patient: {
                fullName: 'Chaminda Vithanage',
                phone: '0756677889',
                age: 39,
                gender: 'Male'
              },
              testName: 'Specialized Hormonal Assay & Vitamin D3',
              category: 'Biochemistry Special',
              outsourcedCenter: 'Asiri Laboratories',
              basePrice: 5000,
              hospitalCommission: 800,
              totalPrice: 5800,
              profit: 800,
              status: 'RESULT_RECEIVED',
              requestedAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // 4. Mock Status Updates
    await page.route('**/api/lab/outsource/*/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Status updated' })
      });
    });

    // 5. Navigate to /outsource-lab
    await page.goto('http://localhost:3000/outsource-lab');
    await page.waitForLoadState('domcontentloaded');

    // 6. Verify Dashboard KPI Cards
    await expect(page.locator('[data-testid="stat-asiri"]')).toContainText('2');
    await expect(page.locator('[data-testid="stat-ruhunu"]')).toContainText('1');
    await expect(page.locator('[data-testid="stat-reports"]')).toContainText('1 / 3');
    await expect(page.locator('[data-testid="stat-profit"]')).toBeVisible();

    // 7. Verify External Lab Config Modal with Profit Calculation
    await page.locator('[data-testid="open-config-btn"]').click();
    await page.waitForTimeout(300);

    // Verify Modal Elements
    await expect(page.getByText('Outside Lab & Commission Setup')).toBeVisible();
    await expect(page.locator('[data-testid="select-outsourced-center"]')).toBeVisible();
    await expect(page.locator('[data-testid="select-outsourced-center"]')).toContainText('Asiri Laboratories');
    await expect(page.locator('[data-testid="select-outsourced-center"]')).toContainText('Ruhunu Hospital Diagnostics');

    // Test Flat Rate calculation
    await page.locator('[data-testid="input-base-price"]').fill('4000');
    await page.locator('select').filter({ hasText: 'Flat (LKR)' }).selectOption('FLAT');
    await page.locator('[data-testid="input-commission-value"]').fill('800');
    await expect(page.locator('[data-testid="preview-profit-amount"]')).toContainText('800.00');
    await expect(page.locator('[data-testid="preview-total-price"]')).toContainText('4,800.00');

    // Test Percentage calculation
    await page.locator('select').filter({ hasText: 'Flat (LKR)' }).selectOption('PERCENT');
    await page.locator('[data-testid="input-commission-value"]').fill('20');
    // 20% of 4000 = 800 profit -> 4800 customer price
    await expect(page.locator('[data-testid="preview-profit-amount"]')).toContainText('800.00');
    await expect(page.locator('[data-testid="preview-total-price"]')).toContainText('4,800.00');

    // Close Config Modal
    await page.locator('[data-testid="close-config-modal"]').click();
    await page.waitForTimeout(300);

    // 8. Test Partner Filtering
    // Filter by Asiri
    await page.locator('[data-testid="filter-center-asiri"]').click();
    await expect(page.locator('[data-testid="outside-row-item-asiri-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="outside-row-item-asiri-3"]')).toBeVisible();
    await expect(page.locator('[data-testid="outside-row-item-ruhunu-2"]')).not.toBeVisible();

    // Filter by Ruhunu
    await page.locator('[data-testid="filter-center-ruhunu"]').click();
    await expect(page.locator('[data-testid="outside-row-item-ruhunu-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="outside-row-item-asiri-1"]')).not.toBeVisible();

    // Return to All
    await page.locator('[data-testid="filter-center-all"]').click();
    await expect(page.locator('[data-testid="outside-row-item-asiri-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="outside-row-item-ruhunu-2"]')).toBeVisible();

    // 9. Lifecycle Transition 1: SAMPLE_COLLECTED -> DISPATCHED (Send to Lab)
    await expect(page.locator('[data-testid="status-badge-item-asiri-1"]')).toContainText('Sample Collected');
    await page.locator('[data-testid="advance-status-btn-item-asiri-1"]').click();
    await expect(page.locator('[data-testid="status-badge-item-asiri-1"]')).toContainText('Sent to Lab');

    // 10. Lifecycle Transition 2: DISPATCHED -> REPORT_RECEIVED via "Mark as Received (Without Uploading Report)"
    await expect(page.locator('[data-testid="status-badge-item-ruhunu-2"]')).toContainText('Sent to Lab');
    await page.locator('[data-testid="advance-status-btn-item-ruhunu-2"]').click();

    // Verify Receipt Modal opens
    await expect(page.getByText('Receive Outsource Lab Report')).toBeVisible();
    await expect(page.locator('[data-testid="mark-received-no-upload-btn"]')).toBeVisible();

    // Click "Mark as Received (Without Uploading Report)"
    await page.locator('[data-testid="mark-received-no-upload-btn"]').click();
    await page.waitForTimeout(300);

    // Status is now Report Received
    await expect(page.locator('[data-testid="status-badge-item-ruhunu-2"]')).toContainText('Report Received');

    // 11. Lifecycle Transition 3: REPORT_RECEIVED -> HANDED_OVER (Hand Over to Customer)
    await expect(page.locator('[data-testid="advance-status-btn-item-ruhunu-2"]')).toContainText('Hand Over to Customer');
    await page.locator('[data-testid="advance-status-btn-item-ruhunu-2"]').click();

    // Verify row now shows Handed Over
    await expect(page.locator('[data-testid="status-badge-item-ruhunu-2"]')).toContainText('Handed Over to Customer');
    await expect(page.locator('[data-testid="outside-row-item-ruhunu-2"]')).toContainText('Handed Over');
  });
});
