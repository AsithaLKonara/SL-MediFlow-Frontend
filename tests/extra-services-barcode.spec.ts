import { test, expect } from '@playwright/test';

test.describe('Task: Extra Services Dashboard Barcode Scanning', () => {
  test('should handle hardware and manual barcode scan to isolate procedures and orders', async ({ page }) => {
    // 1. Mock Authentication as Nurse / Extra Services Officer
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-nurse-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-nurse-1',
        fullName: 'Nurse Chathurika',
        email: 'nurse@amaz.com',
        role: 'NURSE',
        department: 'EXTRA_SERVICE'
      }));
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-nurse-1',
            fullName: 'Nurse Chathurika',
            email: 'nurse@amaz.com',
            role: 'NURSE',
            department: 'EXTRA_SERVICE'
          }
        })
      });
    });

    // Mock initial queue
    const mockQueue = [
      {
        id: 'appt-es-1',
        tokenNumber: 'ES-01',
        bookingReference: 'AMAZ-20261020-001',
        status: 'BOOKED',
        serviceTitle: 'ECG (12-Lead)',
        roomNumber: 'EXT-01',
        patient: {
          id: 'p-1',
          patientId: 'PT-001',
          fullName: 'Sunil Shantha',
          phone: '0712345678',
          gender: 'MALE',
          age: 52
        },
        reportUrl: null,
        fileName: null,
        fileType: null,
        notes: null,
        appointmentDate: '2026-10-20T08:30:00Z',
        completedAt: null
      },
      {
        id: 'appt-es-2',
        tokenNumber: 'ES-02',
        bookingReference: 'AMAZ-20261020-002',
        status: 'BOOKED',
        serviceTitle: 'Wound Dressing (Surgical)',
        roomNumber: 'EXT-02',
        patient: {
          id: 'p-2',
          patientId: 'PT-002',
          fullName: 'Anoma Priyadarshani',
          phone: '0779988776',
          gender: 'FEMALE',
          age: 41
        },
        reportUrl: null,
        fileName: null,
        fileType: null,
        notes: null,
        appointmentDate: '2026-10-20T09:15:00Z',
        completedAt: null
      }
    ];

    const mockOrders = [
      {
        id: 'order-exs-1',
        orderNumber: 'EXS-998877-101',
        patientId: 'p-1',
        patient: {
          id: 'p-1',
          patientId: 'PT-001',
          fullName: 'Sunil Shantha',
          phone: '0712345678'
        },
        service: {
          title: 'Specialized Nebulization',
          description: 'Respiratory therapy'
        },
        finalPrice: 1500,
        status: 'PENDING',
        reportFiles: [],
        createdAt: '2026-10-20T09:00:00Z'
      }
    ];

    await page.route('**/api/extra-services/queue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockQueue)
      });
    });

    await page.route('**/api/extra-services/orders*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockOrders)
      });
    });

    // Mock Barcode Endpoint
    await page.route('**/api/barcode/**', async (route) => {
      const url = route.request().url();
      const code = decodeURIComponent(url.split('/api/barcode/')[1] || '');

      if (code === 'AMAZ-20261020-001' || code === 'ES-01') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'APPOINTMENT',
            masterBarcode: 'AMAZ-20261020-001',
            data: {
              patient: { id: 'p-1', patientId: 'PT-001', fullName: 'Sunil Shantha' },
              masterBarcode: 'AMAZ-20261020-001',
              tokens: { extraService: 'ES-01' }
            }
          })
        });
      } else if (code === 'ES-02') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'APPOINTMENT',
            masterBarcode: 'AMAZ-20261020-002',
            data: {
              patient: { id: 'p-2', patientId: 'PT-002', fullName: 'Anoma Priyadarshani' },
              masterBarcode: 'AMAZ-20261020-002',
              tokens: { extraService: 'ES-02' }
            }
          })
        });
      } else if (code === 'EXS-998877-101') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            type: 'EXTRA_SERVICE_ORDER',
            masterBarcode: 'EXS-998877-101',
            data: {
              orderNumber: 'EXS-998877-101',
              patient: { fullName: 'Sunil Shantha' }
            }
          })
        });
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: `No record found for barcode "${code}".` })
        });
      }
    });

    // 2. Open /extra-services dashboard
    await page.goto('http://localhost:3000/extra-services', { waitUntil: 'domcontentloaded' });

    // Verify initial state: 2 procedures visible
    await expect(page.locator('[data-testid="queue-row-appt-es-1"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('[data-testid="queue-row-appt-es-2"]')).toBeVisible({ timeout: 15000 });

    // 3. Test Manual Input Scan with Master Visit Barcode
    const barcodeInput = page.locator('[data-testid="barcode-manual-input"]');
    const lookupBtn = page.locator('[data-testid="barcode-search-btn"]');

    await barcodeInput.fill('AMAZ-20261020-001');
    await lookupBtn.click();

    // Verify scan success toast and queue isolation
    await expect(page.locator('text=Scanned: APPOINTMENT')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="queue-row-appt-es-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="queue-row-appt-es-2"]')).not.toBeVisible();

    // 4. Test Scan Token Number (ES-02)
    await barcodeInput.fill('ES-02');
    await barcodeInput.press('Enter');

    // Verify Anoma Priyadarshani is now isolated
    await expect(page.locator('[data-testid="queue-row-appt-es-2"]')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[data-testid="queue-row-appt-es-1"]')).not.toBeVisible();

    // 5. Test Scan Order Number Barcode (EXS-998877-101)
    await barcodeInput.fill('EXS-998877-101');
    await lookupBtn.click();

    // Should switch to orders manifest tab and show order
    await expect(page.locator('text=Scanned: EXTRA_SERVICE_ORDER')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=EXS-998877-101')).toBeVisible({ timeout: 5000 });

    // 6. Test Unknown Barcode Error Handling
    await barcodeInput.fill('UNKNOWN-BARCODE-999');
    await lookupBtn.click();
    await expect(page.locator('text=No record found for barcode "UNKNOWN-BARCODE-999".')).toBeVisible({ timeout: 5000 });
  });
});
