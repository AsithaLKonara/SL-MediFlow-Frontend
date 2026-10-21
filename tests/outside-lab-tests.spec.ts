import { test, expect } from '@playwright/test';

test.describe('Task 1.6: Outside Lab Tests & Hospital Commission Setup', () => {
  test('should display dual tabs, track outside tests by partner, and configure hospital commission', async ({ page }) => {
    // 1. Mock Authentication as Lab Tech
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-labtech-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-labtech-1',
        fullName: 'Lab Tech Kasun',
        email: 'lab@amaz.com',
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
            id: 'mock-labtech-1',
            fullName: 'Lab Tech Kasun',
            email: 'lab@amaz.com',
            role: 'LABTECH',
            department: 'LAB'
          }
        })
      });
    });

    // Mock catalog
    const mockCatalog = [
      {
        id: 'lt-1',
        name: 'Full Blood Count (FBC)',
        code: 'FBC-01',
        price: 950,
        category: 'Hematology',
        isOutsideTest: false,
        hospitalCommission: 0,
        outsourcedCenter: null
      },
      {
        id: 'lt-2',
        name: 'Thyroid Stimulating Hormone (TSH)',
        code: 'TSH-01',
        price: 3500,
        category: 'Endocrinology',
        isOutsideTest: true,
        hospitalCommission: 500,
        outsourcedCenter: 'Asiri Laboratories'
      },
      {
        id: 'lt-3',
        name: 'Histopathology Biopsy (Small)',
        code: 'HIST-01',
        price: 6500,
        category: 'Histopathology',
        isOutsideTest: true,
        hospitalCommission: 1200,
        outsourcedCenter: 'Nawaloka Pathology'
      }
    ];

    await page.route('**/api/lab/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockCatalog)
      });
    });

    // Mock metrics
    await page.route('**/api/lab/metrics', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          summary: {
            requestsToday: 14,
            requestsYesterday: 12,
            pendingRequests: 5,
            inProgressTests: 3,
            publishedToday: 8,
            publishedYesterday: 7,
            criticalToday: 1,
            criticalYesterday: 0
          },
          charts: {
            weeklyTests: [
              { date: 'Mon', count: 10 },
              { date: 'Tue', count: 14 }
            ],
            statusDistribution: [
              { name: 'Pending', value: 5 },
              { name: 'Published', value: 8 }
            ]
          },
          tables: {
            urgentRequests: [
              {
                id: 'lr-urg-1',
                patientName: 'Sunil Weerakkody',
                doctor: 'Dr. Wickramasinghe',
                tests: ['Full Blood Count (FBC)'],
                priority: 'URGENT',
                status: 'PENDING',
                requestedAt: new Date().toISOString()
              }
            ],
            recentPublished: []
          }
        })
      });
    });

    // Mock lab requests
    await page.route('**/api/lab/requests', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock PUT outside config update
    await page.route('**/api/lab/tests/*', async (route) => {
      if (route.request().method() === 'PUT' || route.request().method() === 'PATCH') {
        const postData = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'lt-2',
              ...postData
            }
          })
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: mockCatalog[1] })
      });
    });

    // 2. Navigate to /labtech
    await page.goto('http://localhost:3000/labtech', { waitUntil: 'domcontentloaded' });

    // Verify Lab Dashboard header
    await expect(page.locator('text=Laboratory Dashboard')).toBeVisible({ timeout: 15000 });

    // 3. Verify Dual Flow Tabs are present
    const inHouseTab = page.locator('[data-testid="tab-inhouse-tests"]');
    const outsideTab = page.locator('[data-testid="tab-outside-tests"]');

    await expect(inHouseTab).toBeVisible();
    await expect(outsideTab).toBeVisible();

    // Verify In-House is selected by default
    await expect(page.locator('text=Pending Requests').first()).toBeVisible();
    await expect(page.locator('text=Urgent Pending Requests')).toBeVisible();

    // 4. Switch to Outside Lab Tests Tab
    await outsideTab.click();

    // Verify Outside Lab View container
    const outsideView = page.locator('[data-testid="outside-lab-view"]');
    await expect(outsideView).toBeVisible({ timeout: 10000 });

    // Verify Partner KPI Cards (Asiri, Nawaloka, Durdans, Commission)
    await expect(page.locator('[data-testid="stat-asiri"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-nawaloka"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-durdans"]')).toBeVisible();
    await expect(page.locator('[data-testid="stat-commission"]')).toBeVisible();

    // Verify partner badges in table
    await expect(page.locator('[data-testid="partner-badge-out-req-1"]')).toContainText('Asiri Laboratories');
    await expect(page.locator('[data-testid="partner-badge-out-req-2"]')).toContainText('Nawaloka Pathology');
    await expect(page.locator('[data-testid="partner-badge-out-req-3"]')).toContainText('Durdans Laboratory');

    // Verify price breakdown (Base + Commission + Total Bill)
    await expect(page.locator('[data-testid="commission-val-out-req-1"]')).toContainText('+LKR 650');

    // 5. Test Filter by Partner Center
    const asiriFilterBtn = page.locator('[data-testid="filter-center-asiri"]');
    await asiriFilterBtn.click();
    await expect(page.locator('[data-testid="outside-row-out-req-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="outside-row-out-req-2"]')).not.toBeVisible();

    const allFilterBtn = page.locator('[data-testid="filter-center-all"]');
    await allFilterBtn.click();
    await expect(page.locator('[data-testid="outside-row-out-req-2"]')).toBeVisible();

    // 6. Test Advancing Dispatch Status
    const advanceBtn = page.locator('[data-testid="advance-status-btn-out-req-1"]');
    await expect(advanceBtn).toHaveText(/Dispatch/i);
    await advanceBtn.click();
    await expect(page.locator('[data-testid="status-badge-out-req-1"]')).toContainText('Dispatched to Lab');

    // 7. Test Outside Lab & Commission Setup Modal
    const setupCommissionBtn = page.locator('[data-testid="setup-commission-btn"]');
    await setupCommissionBtn.click();

    const configModal = page.locator('[data-testid="outside-lab-config-modal"]');
    await expect(configModal).toBeVisible({ timeout: 5000 });

    // Select test
    const selectTest = page.locator('[data-testid="select-catalog-test"]');
    await selectTest.selectOption({ value: 'lt-2' });

    // Change Base Price and Commission Value
    const basePriceInput = page.locator('[data-testid="input-base-price"]');
    await basePriceInput.fill('4000');

    const commissionInput = page.locator('[data-testid="input-commission-value"]');
    await commissionInput.fill('750');

    // Check Live Computed Price (4000 + 750 = 4750)
    await expect(page.locator('[data-testid="preview-commission-amount"]')).toContainText('+ LKR 750.00');
    await expect(page.locator('[data-testid="preview-total-price"]')).toContainText('LKR 4750.00');

    // Save Configuration
    const saveConfigBtn = page.locator('[data-testid="save-outside-config-btn"]');
    await saveConfigBtn.click();

    // Modal closes upon successful save
    await expect(configModal).not.toBeVisible({ timeout: 5000 });
  });
});
