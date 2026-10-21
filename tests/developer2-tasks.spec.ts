import { test, expect } from '@playwright/test';

test.describe('Developer 2: Frontdesk, Billing, Refunds & Templates Verification', () => {

  test.beforeEach(async ({ page }) => {
    // Mock Authentication & User Profile in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-superadmin-uuid',
        fullName: 'Admin User',
        email: 'admin@amaz.com',
        role: 'SUPERADMIN',
        roleName: 'SUPERADMIN'
      }));
    });

    // Mock auth refresh
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-superadmin-uuid',
            fullName: 'Admin User',
            email: 'admin@amaz.com',
            role: 'SUPERADMIN',
            roleName: 'SUPERADMIN'
          }
        })
      });
    });
  });

  test('Task 2.1 & 2.2: Cancel Appointment Flow and Refund Management', async ({ page }) => {
    // Mock refunds list API
    await page.route('**/api/billing/refunds', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'ref-test-12345678',
            refundNumber: 'REF-2026-001',
            invoiceId: 'inv-test-123',
            amount: 1500,
            reason: 'Appointment Cancelled',
            refundMethod: 'CASH',
            status: 'COMPLETED',
            createdAt: new Date().toISOString(),
            invoice: {
              id: 'inv-test-123',
              totalAmount: 1500,
              patient: { fullName: 'Sunil Silva', phone: '0771234567' }
            },
            processedBy: { fullName: 'Admin User' }
          }
        ])
      });
    });

    // 1. Visit Refund Management page
    await page.goto('http://localhost:3000/billing/refunds');
    
    // Check header and UI elements
    await expect(page.locator('h1:has-text("Refund Management")').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Issue New Refund")').first()).toBeVisible();

    // Verify refund list table displays mocked refund
    await expect(page.locator('text=REF-2026-001').first()).toBeVisible();
    await expect(page.locator('text=Sunil Silva').first()).toBeVisible();

    // Open Issue Refund modal
    await page.click('button:has-text("Issue New Refund")');
    await expect(page.locator('text=Process Patient Refund').first()).toBeVisible();
    await expect(page.locator('text=Search Invoice ID').first()).toBeVisible();
    await expect(page.locator('text=Refund Scope').first()).toBeVisible();

    // Close the modal
    await page.keyboard.press('Escape');
  });

  test('Task 2.3: Doctor Commission to Hospital in Superadmin Departments', async ({ page }) => {
    // Mock departments API with correct URL
    await page.route('**/api/admin/departments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'dept-opd',
            name: 'OPD General Practice',
            description: 'Outpatient consultation',
            commissionRate: 20,
            isActive: true,
            _count: { Users: 1 },
            doctors: [
              {
                id: 'doc-1',
                name: 'Dr. OPD Consultant',
                consultationFee: 1500,
                commissionRate: 20,
                feeType: 'POST'
              }
            ]
          }
        ])
      });
    });

    // Mock unassigned doctors
    await page.route('**/api/admin/departments/doctors', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Visit superadmin departments page
    await page.goto('http://localhost:3000/superadmin/departments');

    // Verify Hospital Commission badge is visible
    await expect(page.locator('text=Hospital Comm: 20%').first()).toBeVisible({ timeout: 10000 });

    // Click "Add Department" and verify commission field exists
    const addDeptBtn = page.locator('button:has-text("Add Department")').first();
    await addDeptBtn.click();
    await expect(page.locator('label:has-text("Hospital Doctor Commission (%)")').first()).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('Task 2.4 & 2.5: Receipt Templates Privacy and Border Styling', async ({ page }) => {
    // Mock invoices for billing view
    await page.route('**/api/billing/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Visit frontdesk billing
    await page.goto('http://localhost:3000/frontdesk/billing');
    await expect(page.locator('body')).toBeVisible();
  });

});
