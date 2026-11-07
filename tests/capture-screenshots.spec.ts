import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = '/Users/asithalakmal/.gemini/antigravity/brain/8b155b0a-0552-44d2-8612-1384f7263570';

test.describe('Capture Visual Screenshots', () => {
  test('Capture visual screenshots for all 4 implementations', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 900 });

    // 1. Screenshot of 140mm x 140mm Dot Matrix Bill Preview
    await page.goto('http://localhost:3000/bill-preview');
    await page.waitForLoadState('domcontentloaded');
    const billReceipt = page.locator('#dot-matrix-bill-receipt');
    await expect(billReceipt).toBeVisible();
    await billReceipt.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot-1-dot-matrix-140x140.png'),
    });

    const billPagePreview = page.locator('#preview-sheet');
    await billPagePreview.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot-1b-dot-matrix-sheet-preview.png'),
    });

    // 2. Screenshot of 80mm Thermal Token Preview
    await page.goto('http://localhost:3000/token-preview');
    await page.waitForLoadState('domcontentloaded');
    const tokenReceipt = page.locator('#thermal-token-receipt-root');
    await expect(tokenReceipt).toBeVisible();
    await tokenReceipt.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot-2-token-thermal-80mm.png'),
    });

    // 3. Screenshot of Hardware & Dual Printer Settings
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-frontdesk-user-1',
        fullName: 'Asitha Lakmal',
        email: 'reception@amaz.com',
        role: 'RECEPTIONIST',
        department: 'RECEPTION'
      }));
      localStorage.setItem('node_print_token_printer', 'Xprinter XP-80T (Thermal)');
      localStorage.setItem('node_print_bill_printer', 'EPSON LX-310 (Dot Matrix 140x140)');
      localStorage.setItem('auto_print_token', 'true');
      localStorage.setItem('auto_print_bill', 'false');
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

    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fullName: 'Asitha Lakmal',
          email: 'reception@amaz.com',
          specialty: 'Reception Frontdesk',
          roomNumber: 'Counter 1'
        })
      });
    });

    await page.goto('http://localhost:3000/frontdesk/settings');
    await page.waitForLoadState('domcontentloaded');
    const hardwareTab = page.locator('button:has-text("Hardware & Printers"), [role="tab"]:has-text("Hardware")').first();
    await expect(hardwareTab).toBeVisible({ timeout: 10000 });
    await hardwareTab.click();

    // Give a brief moment for tab switch and animations
    await page.waitForTimeout(600);

    const hardwareCard = page.locator('div[role="tabpanel"]:has(#tokenPrinterName), .space-y-6').first();
    await page.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot-3-hardware-settings.png'),
      fullPage: false
    });

    // 4. Screenshot of POS Workspace & Decoupled Reprints
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
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/reception/doctors/today', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/prescriptions/pending', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/reception/history*', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: mockVisitHistory }) });
    });

    await page.goto('http://localhost:3000/frontdesk/workspace');
    await page.waitForLoadState('domcontentloaded');

    const historyBtn = page.locator('#btn-pos-history-modal');
    await expect(historyBtn).toBeVisible({ timeout: 15000 });
    await historyBtn.click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);

    await dialog.screenshot({
      path: path.join(ARTIFACT_DIR, 'screenshot-4-pos-decoupled-history-modal.png'),
    });
  });
});

