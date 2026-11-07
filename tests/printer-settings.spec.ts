import { test, expect } from '@playwright/test';

test.describe('Dual Hardware Printer Settings & Auto-Print Configuration', () => {
  test('Settings page allows configuring separate Token Printer, Bill Printer, and Auto-Print preferences', async ({ page }) => {
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

    await page.route('**/api/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fullName: 'Asitha Lakmal',
          email: 'reception@amaz.com',
          specialty: 'Reception Frontdesk',
          roomNumber: 'Reception Counter 1'
        })
      });
    });

    // 2. Navigate to Frontdesk Settings
    await page.goto('http://localhost:3000/frontdesk/settings');
    await page.waitForLoadState('domcontentloaded');

    // 3. Switch to Hardware Tab
    const hardwareTab = page.locator('button:has-text("Hardware & Printers"), [role="tab"]:has-text("Hardware")').first();
    await expect(hardwareTab).toBeVisible({ timeout: 10000 });
    await hardwareTab.click();

    // 4. Verify Dual Printer Inputs Exist
    const tokenPrinterInput = page.locator('#tokenPrinterName');
    const billPrinterInput = page.locator('#billPrinterName');
    const autoTokenSwitch = page.locator('#switch-auto-token');
    const autoBillSwitch = page.locator('#switch-auto-bill');
    const saveBtn = page.locator('#btn-save-hardware');

    await expect(tokenPrinterInput).toBeVisible();
    await expect(billPrinterInput).toBeVisible();
    await expect(autoTokenSwitch).toBeVisible();
    await expect(autoBillSwitch).toBeVisible();
    await expect(saveBtn).toBeVisible();

    // 5. Fill Dual Printer Mapping
    await tokenPrinterInput.fill('Xprinter-XP80');
    await billPrinterInput.fill('EPSON-LX-310');

    // 6. Toggle Auto-Print switches via labels
    await page.locator('label[for="switch-auto-token"]').click();
    await page.locator('label[for="switch-auto-bill"]').click();

    // 7. Save Preferences
    await saveBtn.click();

    // 8. Assert LocalStorage Persistence
    const savedTokenPrinter = await page.evaluate(() => localStorage.getItem('node_print_token_printer'));
    const savedBillPrinter = await page.evaluate(() => localStorage.getItem('node_print_bill_printer'));
    const savedAutoToken = await page.evaluate(() => localStorage.getItem('auto_print_token'));
    const savedAutoBill = await page.evaluate(() => localStorage.getItem('auto_print_bill'));

    expect(savedTokenPrinter).toBe('Xprinter-XP80');
    expect(savedBillPrinter).toBe('EPSON-LX-310');
    expect(savedAutoToken).toBe('true');
    expect(savedAutoBill).toBe('true');
  });
});
