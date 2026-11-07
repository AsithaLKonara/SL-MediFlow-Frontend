import { test, expect } from '@playwright/test';

test.describe('POS Dual-Printing Decoupling Verification', () => {
  test('POS History modal routes "Token" reprint to TokenThermalReceipt and "Bill" reprint to DotMatrixBillReceipt', async ({ page }) => {
    // 1. Mock Authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-frontdesk-user-1',
        fullName: 'Asitha Lakmal',
        email: 'reception@amaz.com',
        role: 'RECEPTIONIST',
        department: 'RECEPTION'
      }));
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-frontdesk-user-1',
            fullName: 'Asitha Lakmal',
            email: 'reception@amaz.com',
            role: 'RECEPTIONIST',
            department: 'RECEPTION'
          }
        })
      });
    });

    await page.route('**/api/reception/shift/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-shift-1',
          status: 'OPEN',
          cashierId: 'mock-frontdesk-user-1',
          startingCash: 5000
        })
      });
    });

    await page.route('**/api/pharmacy/medicines*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/reception/doctors/today', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/prescriptions/pending', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock visit transaction with both token and invoice
    const mockVisitHistory = [
      {
        id: 'pos-hist-visit-001',
        type: 'VISIT',
        bookingReference: 'AMAZ-VISIT-9901',
        patientName: 'Sunil Wickramasinghe',
        patientPhone: '0771234567',
        patientId: 'pat-9901',
        doctorName: 'Dr. V.K.P.A. Mahesh Lakshman',
        roomNumber: 'ROOM 3',
        totalAmount: 3200.00,
        paymentStatus: 'PAID',
        createdAt: new Date().toISOString(),
        items: ['Doctor Consultation', 'Amoxicillin 500mg'],
        lineItems: [
          { description: 'Doctor Consultation Fee', quantity: 1, unitPrice: 2000, total: 2000, department: 'CONSULTATION' },
          { description: 'Amoxicillin 500mg', quantity: 30, unitPrice: 40, total: 1200, department: 'PHARMACY', isMedicine: true }
        ],
        token: {
          id: 'token-9901',
          tokenNumber: '08',
          department: 'DOCTOR',
          doctorName: 'Dr. V.K.P.A. Mahesh Lakshman',
          patientName: 'Sunil Wickramasinghe',
          roomNumber: 'ROOM 3',
          refNo: 'AMAZ-VISIT-9901'
        },
        invoice: {
          id: 'inv-9901',
          invoiceNumber: 'INV-9901',
          subtotal: 3200.00,
          total: 3200.00,
          items: [
            { name: 'Doctor Consultation Fee', qty: 1, price: 2000, total: 2000, department: 'CONSULTATION' },
            { name: 'Amoxicillin 500mg', qty: 30, price: 40, total: 1200, department: 'PHARMACY', isMedicine: true }
          ]
        }
      }
    ];

    await page.route('**/api/reception/history*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: mockVisitHistory
        })
      });
    });

    // 2. Navigate to Frontdesk POS Workspace
    await page.goto('http://localhost:3000/frontdesk/workspace');
    await page.waitForLoadState('domcontentloaded');

    // 3. Open POS History Modal
    const historyBtn = page.locator('#btn-pos-history-modal');
    await expect(historyBtn).toBeVisible({ timeout: 15000 });
    await historyBtn.click();

    // Verify modal is open
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'POS Transaction History' })).toBeVisible();

    // 4. Test "Token" Reprint Action
    const tokenBtn = page.getByRole('button', { name: 'Token' }).first();
    await expect(tokenBtn).toBeVisible({ timeout: 5000 });
    await tokenBtn.click();

    // Verify TokenThermalReceipt is mounted with token data
    const thermalRoot = page.locator('#thermal-token-receipt-root');
    await expect(thermalRoot).toBeAttached({ timeout: 5000 });
    await expect(thermalRoot).toContainText('08');
    await expect(thermalRoot).toContainText('ROOM 3');
    await expect(thermalRoot).toContainText('Dr. V.K.P.A. Mahesh Lakshman');

    // 5. Test "Bill" Reprint Action
    const billBtn = page.getByRole('button', { name: 'Bill' }).first();
    await expect(billBtn).toBeVisible({ timeout: 5000 });
    await billBtn.click();

    // Verify DotMatrixBillReceipt is mounted with invoice data
    const dotMatrixRoot = page.locator('#dot-matrix-bill-receipt');
    await expect(dotMatrixRoot).toBeAttached({ timeout: 5000 });
    await expect(dotMatrixRoot).toContainText('AMAZ HOSPITAL');
    await expect(dotMatrixRoot).toContainText('OFFICIAL BILL RECEIPT');
    await expect(dotMatrixRoot).toContainText('Doctor Consultation Fee');
    await expect(dotMatrixRoot).toContainText('Amoxicillin 500mg');
    await expect(dotMatrixRoot).toContainText('3200.00');
  });
});
