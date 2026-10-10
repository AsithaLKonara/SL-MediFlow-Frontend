import { test, expect } from '@playwright/test';

test.describe('Room Management e2e', () => {
  test('should create a new room in superadmin and see it in frontdesk', async ({ page, context }) => {
    // We will simulate logging in by setting a dummy token or assuming auth is bypassed for tests.
    // Or we can perform an actual login if required.
    // Assuming the user's local dev server is running on localhost:3000

    await page.goto('http://localhost:3000/login');
    
    // Attempt basic login if a form exists
    await page.fill('input[type="email"]', 'admin@amaz.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/superadmin**');

    // Navigate to Room Management
    await page.goto('http://localhost:3000/superadmin/rooms');
    await expect(page.locator('h2')).toContainText('Room Management');

    // Create a new Room
    const uniqueRoomName = `TEST-ROOM-${Date.now()}`;
    await page.click('button:has-text("Add Room")');
    await page.fill('input[placeholder*="101"]', uniqueRoomName);
    await page.click('button:has-text("Save Room")');

    // Verify it appeared in the table
    await expect(page.locator(`text=${uniqueRoomName}`)).toBeVisible();

    // Now switch to frontdesk dashboard
    const frontdeskPage = await context.newPage();
    await frontdeskPage.goto('http://localhost:3000/frontdesk/rooms');

    // Verify it appeared on the frontdesk room matrix
    await expect(frontdeskPage.locator(`text=${uniqueRoomName}`)).toBeVisible();

    // Update status in superadmin to Maintenance
    await page.click(`tr:has-text("${uniqueRoomName}") button:has(.lucide-pencil)`);
    // Wait for dialog
    await page.click('[role="combobox"]:has-text("Available")');
    await page.click('[role="option"]:has-text("Maintenance")');
    await page.click('button:has-text("Save Room")');

    // Verify status updated locally
    await expect(page.locator(`tr:has-text("${uniqueRoomName}")`)).toContainText('Maintenance');

    // Verify WebSocket synced to frontdesk (should happen automatically without refresh)
    await expect(frontdeskPage.locator(`text=${uniqueRoomName}`).locator('..')).toContainText('MAINTENANCE', { timeout: 5000 });
  });
});
