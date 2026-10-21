import { test, expect } from '@playwright/test';

test.describe('Outsource Lab Tests Isolation & Barcode Routing', () => {
  test('should hide outsource tests from test requests page and redirect outsource barcode search to /outsource-lab', async ({ page }) => {
    // 1. Mock Authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-staff-uuid-1',
        fullName: 'Charlie Lab',
        email: 'labtech@amaz.com',
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
            fullName: 'Charlie Lab',
            email: 'labtech@amaz.com',
            role: 'LABTECH',
            department: 'LAB'
          }
        })
      });
    });

    // 2. Mock Requests Endpoint: 1 in-house request and 1 outsource request
    await page.route('**/api/lab/requests?type=IN_HOUSE', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'lr-inhouse-1',
            patientId: 'p-inhouse-1',
            priority: 'ROUTINE',
            status: 'PENDING',
            requestedAt: new Date().toISOString(),
            Patient: { fullName: 'Sunil Weerasinghe', ageFallback: 45 },
            Visit: { User: { fullName: 'Dr. Ajith Kumara' }, clinicalNotes: 'Fever checkup' },
            items: [
              {
                id: 'item-fbc',
                price: 1800,
                LabTest: {
                  id: 'lt-fbc',
                  name: 'Full Blood Count (FBC)',
                  unit: '10^3/uL',
                  referenceRange: '4.0 - 11.0',
                  isOutsideTest: false,
                  room: { roomNumber: 'LAB-01' }
                }
              }
            ]
          },
          {
            id: 'lr-outsource-1',
            patientId: 'p-outsource-2',
            priority: 'ROUTINE',
            status: 'PENDING',
            requestedAt: new Date().toISOString(),
            Patient: { fullName: 'Malini Rathnayake', ageFallback: 52 },
            Visit: { User: { fullName: 'Dr. Ajith Kumara' } },
            items: [
              {
                id: 'item-bio',
                price: 7700,
                LabTest: {
                  id: 'lt-bio',
                  name: 'Histopathology Biopsy (Small Specimen)',
                  isOutsideTest: true,
                  outsourcedCenter: 'Ruhunu Hospital Diagnostics'
                }
              }
            ]
          }
        ])
      });
    });

    // 3. Mock Barcode Resolvers
    // Token for Outsource Test: "EXT-RUHUNU-99"
    await page.route('**/api/lab/requests/token/EXT-RUHUNU-99', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            bookingReference: 'AMAZ-EXT-99',
            tokenNumber: 'EXT-99',
            Patient: { fullName: 'Malini Rathnayake', ageFallback: 52, phone: '0714455667' },
            LabRequests: [
              {
                id: 'lr-outsource-1',
                status: 'PENDING',
                requestedAt: new Date().toISOString(),
                items: [
                  {
                    price: 7700,
                    LabTest: {
                      id: 'lt-bio',
                      name: 'Histopathology Biopsy (Small Specimen)',
                      isOutsideTest: true,
                      outsourcedCenter: 'Ruhunu Hospital Diagnostics'
                    }
                  }
                ]
              }
            ]
          }
        })
      });
    });

    // Token for In-House Test: "LAB-INHOUSE-01"
    await page.route('**/api/lab/requests/token/LAB-INHOUSE-01', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            bookingReference: 'AMAZ-INH-01',
            tokenNumber: 'LAB-01',
            Patient: { fullName: 'Sunil Weerasinghe', ageFallback: 45, phone: '0771122334' },
            LabRequests: [
              {
                id: 'lr-inhouse-1',
                status: 'PENDING',
                requestedAt: new Date().toISOString(),
                items: [
                  {
                    price: 1800,
                    LabTest: {
                      id: 'lt-fbc',
                      name: 'Full Blood Count (FBC)',
                      isOutsideTest: false,
                      room: { roomNumber: 'LAB-01' }
                    }
                  }
                ]
              }
            ]
          }
        })
      });
    });

    // Mock Catalog and Outsource daily API
    await page.route('**/api/lab/catalog', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    await page.route('**/api/lab/outsource/daily**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          date: new Date().toISOString(),
          metrics: {
            totalRequested: 1,
            asiriCount: 0,
            ruhunuCount: 1,
            reportsReceivedCount: 0,
            handedOverCount: 0,
            totalHospitalProfit: 1200,
            totalCustomerRevenue: 7700
          },
          items: [
            {
              id: 'out-ruhunu-item',
              requestId: 'lr-outsource-1',
              tokenNumber: 'EXT-RUHUNU-99',
              bookingReference: 'AMAZ-EXT-RUHUNU-99',
              patient: { fullName: 'Malini Rathnayake', phone: '0714455667', age: 52 },
              testName: 'Histopathology Biopsy (Small Specimen)',
              outsourcedCenter: 'Ruhunu Hospital Diagnostics',
              basePrice: 6500,
              hospitalCommission: 1200,
              totalPrice: 7700,
              profit: 1200,
              status: 'SAMPLE_COLLECTED',
              requestedAt: new Date().toISOString()
            }
          ]
        })
      });
    });

    // 4. Navigate to /labtech/requests
    await page.goto('http://localhost:3000/labtech/requests');
    await page.waitForLoadState('domcontentloaded');

    // 5. REQUIREMENT 1: Verify In-House Test is shown, but Outsource Test is NOT shown on requests page
    await expect(page.getByText('Full Blood Count (FBC)')).toBeVisible();
    await expect(page.getByText('Sunil Weerasinghe')).toBeVisible();

    // Outsource test & patient MUST NOT appear on the requests page
    await expect(page.getByText('Histopathology Biopsy (Small Specimen)')).not.toBeVisible();
    await expect(page.getByText('Malini Rathnayake')).not.toBeVisible();

    // 6. REQUIREMENT 2: Scan/search barcode for Outsource test
    const searchInput = page.locator('[data-testid="requests-search-input"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('EXT-RUHUNU-99');
    await searchInput.press('Enter');

    // System must detect outside test and redirect to /outsource-lab with the search parameter
    await page.waitForURL('**/outsource-lab?search=EXT-RUHUNU-99', { timeout: 10000 });
    expect(page.url()).toContain('/outsource-lab?search=EXT-RUHUNU-99');

    // On Outsource Lab page, the searched test is displayed and highlighted
    await expect(page.locator('[data-testid="outside-search-input"]')).toHaveValue('EXT-RUHUNU-99');
    await expect(page.getByText('Histopathology Biopsy (Small Specimen)')).toBeVisible();
    await expect(page.getByText('Malini Rathnayake')).toBeVisible();
    await expect(page.locator('[data-testid="stat-ruhunu"]')).toContainText('1');
  });

  test('should display barcode badge in table and carry barcode search to outsource tests table', async ({ page }) => {
    // 1. Mock Authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-staff-uuid-1',
        fullName: 'Charlie Lab',
        email: 'labtech@amaz.com',
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
            fullName: 'Charlie Lab',
            email: 'labtech@amaz.com',
            role: 'LABTECH',
            department: 'LAB'
          }
        })
      });
    });

    // 2. Mock daily outsource tests endpoint with barcode 4974034113
    await page.route('**/api/lab/outsource/daily**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            summary: {
              totalExpected: 1,
              reportsReceived: 0,
              handedOver: 0,
              totalProfit: 200,
              totalCustomerRevenue: 1200,
              totalOutsourceCost: 1000,
              asiriCount: 1,
              ruhunuCount: 0
            },
            items: [
              {
                id: 'outsource-item-4974034113',
                requestId: 'req-4974034113',
                tokenNumber: 'LA-01',
                bookingReference: '4974034113',
                patient: { fullName: 'Test Patient', phone: '0712345678', age: 22 },
                testName: 'test outsource',
                outsourcedCenter: 'Asiri Laboratories',
                basePrice: 1000,
                hospitalCommission: 200,
                totalPrice: 1200,
                profit: 200,
                status: 'SAMPLE_COLLECTED',
                requestedAt: new Date().toISOString()
              }
            ]
          }
        })
      });
    });

    await page.route('**/api/lab/catalog', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    // 3. Navigate directly to /outsource-lab?search=4974034113
    await page.goto('http://localhost:3000/outsource-lab?search=4974034113');
    await page.waitForLoadState('domcontentloaded');

    // 4. Verify search input has 4974034113
    await expect(page.locator('[data-testid="outside-search-input"]')).toHaveValue('4974034113');

    // 5. Verify the table carries and displays the barcode badge prominently
    await expect(page.locator('[data-testid="outside-row-outsource-item-4974034113"]')).toBeVisible();
    await expect(page.locator('[data-testid="barcode-outsource-item-4974034113"]')).toContainText('4974034113');
    await expect(page.getByText('#LA-01')).toBeVisible();
    await expect(page.getByText('test outsource')).toBeVisible();
    await expect(page.getByText('Test Patient')).toBeVisible();
    await expect(page.locator('[data-testid="partner-badge-outsource-item-4974034113"]')).toContainText('Asiri Laboratories');
  });
});
