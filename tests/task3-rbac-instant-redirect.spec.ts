import { test, expect } from '@playwright/test';

test.describe('Task 3: RBAC Soft Guard Instant Redirection', () => {
  test('direct navigation to /superadmin/rbac as Receptionist redirects instantly to /frontdesk without canvas leak', async ({ page }) => {
    // 1. Log in or pre-seed Receptionist auth credentials
    await page.goto('/login');
    await page.evaluate(() => {
      const receptionistUser = {
        id: 'usr_receptionist_test',
        fullName: 'Receptionist User',
        email: 'reception@slmediflow.lk',
        role: 'Receptionist',
        department: 'Frontdesk',
        permissions: []
      };
      localStorage.setItem('token', 'fake-jwt-receptionist-test-token');
      localStorage.setItem('user', JSON.stringify(receptionistUser));
      document.cookie = 'amaz_token=fake-jwt-receptionist-test-token; path=/; max-age=604800; SameSite=Lax';
      document.cookie = 'amaz_role=Receptionist; path=/; max-age=604800; SameSite=Lax';
    });

    // 2. Navigate directly to /superadmin/rbac
    await page.goto('/superadmin/rbac');

    // 3. Ensure the page immediately redirects to /frontdesk
    await page.waitForURL('**/frontdesk', { timeout: 10000 });
    expect(page.url()).toContain('/frontdesk');

    // 4. Verify Superadmin RBAC content was never displayed
    const superadminCanvas = page.locator('text=Role-Based Access Control');
    await expect(superadminCanvas).toHaveCount(0);
  });

  test('server-side middleware redirects /superadmin routes when amaz_role cookie is Receptionist', async ({ page, context }) => {
    // Add cookie directly to the browser context to simulate direct first-request navigation
    await context.addCookies([
      {
        name: 'amaz_role',
        value: 'Receptionist',
        domain: 'localhost',
        path: '/'
      }
    ]);

    const response = await page.goto('/superadmin/users');
    
    // Check that we end up on /frontdesk
    await page.waitForURL('**/frontdesk', { timeout: 10000 });
    expect(page.url()).toContain('/frontdesk');
  });
});
