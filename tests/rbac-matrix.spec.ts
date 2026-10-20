import { test, expect } from '@playwright/test';

test.describe('Superadmin RBAC Matrix & Extra Services Dashboard Authorization', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Mock Authentication & Superadmin profile in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-superadmin-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'superadmin-user-id',
        fullName: 'System Administrator',
        email: 'admin@amaz.com',
        role: 'SUPERADMIN',
        roleName: 'SUPERADMIN'
      }));
    });

    // 2. Mock auth refresh
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'superadmin-user-id',
            fullName: 'System Administrator',
            email: 'admin@amaz.com',
            role: 'SUPERADMIN',
            roleName: 'SUPERADMIN'
          }
        })
      });
    });
  });

  test('should display updated taxonomy including Extra Services and Refunds, and allow editing operational roles', async ({ page }) => {
    let putPermissionsPayload: any = null;

    // Mock roles list with Superadmin, Nurse, and Cashier
    await page.route('**/api/admin/roles', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [
              {
                id: 'role-superadmin',
                name: 'SUPERADMIN',
                description: 'Superadmin Role',
                RolePermission: [
                  { Permission: { action: 'ALL', resource: 'ALL' } }
                ]
              },
              {
                id: 'role-nurse',
                name: 'NURSE',
                description: 'Procedure Nurse',
                RolePermission: [
                  { Permission: { action: 'READ', resource: 'Extra Services' } }
                ]
              },
              {
                id: 'role-cashier',
                name: 'CASHIER',
                description: 'Billing Cashier',
                RolePermission: [
                  { Permission: { action: 'READ', resource: 'Billing' } }
                ]
              }
            ]
          })
        });
      }
    });

    // Mock permissions update
    await page.route('**/api/admin/roles/*/permissions', async (route) => {
      if (route.request().method() === 'PUT') {
        putPermissionsPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, message: 'Permissions updated' })
        });
      }
    });

    // Navigate to RBAC Matrix page
    await page.goto('http://localhost:3000/superadmin/rbac');
    await expect(page).toHaveURL(/.*superadmin\/rbac/);

    // Verify Page Header
    await expect(page.locator('h2:has-text("Access Control Matrix (RBAC)")').first()).toBeVisible({ timeout: 10000 });

    // Verify categories and new modules are rendered
    await expect(page.locator('text=Clinical & Procedures').first()).toBeVisible();
    await expect(page.locator('text=Frontdesk & Billing').first()).toBeVisible();
    await expect(page.locator('text=Extra Services Station').first()).toBeVisible();
    await expect(page.locator('text=Extra Services Catalog').first()).toBeVisible();
    await expect(page.locator('text=Refund Management & Vouchers').first()).toBeVisible();
    await expect(page.locator('text=Doctor Share & Payouts').first()).toBeVisible();
    await expect(page.locator('text=Laboratory Queue & Outside Tests').first()).toBeVisible();

    // Verify Superadmin is protected
    await expect(page.locator('text=Root Administrator Role').first()).toBeVisible();
    await expect(page.locator('text=System Protected').first()).toBeVisible();

    // Switch Role to NURSE
    await page.click('button[role="combobox"]');
    await page.click('[role="option"]:has-text("NURSE")');

    // Verify Nurse role is unlocked (no protected banner)
    await expect(page.locator('text=Configuring permissions for role:').first()).toBeVisible();
    await expect(page.locator('strong:has-text("NURSE")').first()).toBeVisible();

    // Click "Grant All" for Clinical & Procedures category
    const grantAllBtn = page.locator('button:has-text("Grant All")').first();
    await grantAllBtn.click();

    // Click "Save Configuration"
    const saveBtn = page.locator('button:has-text("Save Configuration")').first();
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Verify payload contained Extra Services permissions
    await expect.poll(() => putPermissionsPayload).not.toBeNull();
    const hasExtraServices = putPermissionsPayload.permissions.some(
      (p: any) => p.resource === 'Extra Services' && p.action === 'CREATE'
    );
    expect(hasExtraServices).toBe(true);

    // Verify success toast
    await expect(page.locator('text=Permissions saved successfully.').first()).toBeVisible();
  });

  test('should authenticate user with role EXTRA SERVICES and route directly to /extra-services with dedicated sidebar', async ({ page }) => {
    // Mock login endpoint
    await page.route('**/api/auth/login', async (route) => {
      if (route.request().method() === 'POST') {
        const body = JSON.parse(route.request().postData() || '{}');
        if (body.email === 'ext@amaz.com' && body.password === 'password123') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              token: 'mock-ext-jwt-token',
              user: {
                id: 'ext-user-id',
                fullName: 'EXT Test',
                email: 'ext@amaz.com',
                role: 'EXTRA SERVICES',
                roleName: 'EXTRA SERVICES',
                permissions: [
                  { action: 'READ', resource: 'Extra Services' },
                  { action: 'CREATE', resource: 'Extra Services' },
                  { action: 'UPDATE', resource: 'Extra Services' },
                  { action: 'DELETE', resource: 'Extra Services' },
                  { action: 'READ', resource: 'Extra Services Config' }
                ]
              }
            })
          });
          return;
        }
      }
      await route.continue();
    });

    // Mock extra-services queue API
    await page.route('**/api/extra-services/queue*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    // Mock extra-services catalog API
    await page.route('**/api/extra-services', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    // Go to login page
    await page.goto('http://localhost:3000/login');
    await expect(page).toHaveURL(/.*login/);

    // Fill credentials for ext@amaz.com
    await page.fill('input[type="email"]', 'ext@amaz.com');
    await page.fill('input[type="password"]', 'password123');

    // Click Sign In
    await page.click('button[type="submit"]');

    // Verify redirected directly to /extra-services
    await expect(page).toHaveURL(/.*extra-services/, { timeout: 15000 });

    // Verify Extra Services Station badge / title in sidebar
    await expect(page.locator('text=Extra Services Station').first()).toBeVisible({ timeout: 10000 });

    // Verify workstation queue navigation link is present
    await expect(page.locator('a:has-text("Workstation Queue")').first()).toBeVisible();

    // Verify services catalog navigation link is present
    await expect(page.locator('a:has-text("Services Catalog")').first()).toBeVisible();
  });

});
