import { test, expect } from '@playwright/test';

test.describe('Task 1: Doctor Hospital Commission (Percentage vs Flat Rate)', () => {

  test('Superadmin Staff modal allows toggling commission between Percentage and Flat Rate', async ({ page }) => {
    // 1. Mock Superadmin Authentication in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-superadmin-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-superadmin-id',
        fullName: 'Super Administrator',
        email: 'admin@amaz.com',
        role: 'SUPERADMIN',
        roleName: 'SUPERADMIN'
      }));
    });

    let savedPayload: any = null;

    // 2. Mock Backend APIs
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-superadmin-id',
            fullName: 'Super Administrator',
            email: 'admin@amaz.com',
            role: 'SUPERADMIN',
            roleName: 'SUPERADMIN'
          }
        })
      });
    });

    await page.route('**/api/admin/roles', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'role-doc', name: 'DOCTOR' },
            { id: 'role-nurse', name: 'NURSE' }
          ]
        })
      });
    });

    await page.route('**/api/admin/departments', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [
            { id: 'dept-1', name: 'General Medicine' }
          ]
        })
      });
    });

    await page.route('**/api/admin/rooms', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [] })
      });
    });

    await page.route('**/api/admin/staff', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: [
              {
                id: 'doc-1',
                name: 'Sunil Perera',
                fullName: 'Sunil Perera',
                email: 'dr.sunil@amaz.com',
                role: 'DOCTOR',
                title: 'Dr.',
                departmentId: 'dept-1',
                departmentName: 'General Medicine',
                consultationFee: 3000,
                feeType: 'POST',
                commissionRate: 20,
                commissionType: 'PERCENTAGE',
                status: 'ACTIVE'
              }
            ]
          })
        });
      } else if (route.request().method() === 'PUT' || route.request().method() === 'POST') {
        savedPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'doc-1', ...savedPayload }
          })
        });
      }
    });

    await page.route('**/api/admin/staff/doc-1', async (route) => {
      if (route.request().method() === 'PUT') {
        savedPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { id: 'doc-1', ...savedPayload }
          })
        });
      }
    });

    // 3. Navigate to Staff page
    await page.goto('http://localhost:3000/superadmin/staff');

    // 4. Verify doctor is in table with initial percentage commission
    await expect(page.locator('text=Dr. Sunil Perera')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Comm: 20%')).toBeVisible();

    // 5. Open Edit modal via dropdown
    await page.getByRole('button', { name: 'Open menu' }).first().click();
    await page.getByText('Edit Profile').click();

    // 6. Check toggle buttons are present
    const percentBtn = page.locator('[data-testid="comm-type-percent"]');
    const flatBtn = page.locator('[data-testid="comm-type-flat"]');
    await expect(percentBtn).toBeVisible();
    await expect(flatBtn).toBeVisible();

    // 7. Click "Flat Fee (LKR)"
    await flatBtn.click();
    await expect(page.locator('text=Flat Amount Retained by Hospital per Consultation (LKR)')).toBeVisible();
    await expect(page.locator('text=LKR / patient')).toBeVisible();

    // 8. Change commission value to 600 flat LKR
    const commInput = page.locator('[data-testid="input-commission-rate"]');
    await commInput.fill('600');

    // 9. Save changes
    await page.locator('button:has-text("Save Changes")').click();

    // 10. Verify request payload contained commissionType: "FLAT" and commissionRate: 600
    await expect.poll(() => savedPayload).not.toBeNull();
    expect(savedPayload.commissionType).toBe('FLAT');
    expect(savedPayload.commissionRate).toBe(600);
  });

  test('Fund Office sheet modal calculates Flat Rate commission correctly', async ({ page }) => {
    // 1. Mock Authentication as Fund Office user
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-fund-office-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-fund-user',
        fullName: 'Fund Officer',
        email: 'fund@amaz.com',
        role: 'SUPERADMIN',
        roleName: 'SUPERADMIN'
      }));
    });

    let createdSheetPayload: any = null;

    // 2. Mock APIs
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-fund-user',
            fullName: 'Fund Officer',
            email: 'fund@amaz.com',
            role: 'SUPERADMIN',
            roleName: 'SUPERADMIN'
          }
        })
      });
    });

    await page.route(/(api\/staff|api\/admin\/staff)/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'doc-flat-1',
              name: 'Nimal Silva',
              fullName: 'Dr. Nimal Silva',
              role: 'DOCTOR',
              consultationFee: 3000,
              commissionRate: 500,
              commissionType: 'FLAT',
              status: 'ACTIVE'
            }
          ]
        })
      });
    });

    await page.route('**/api/fund-office/daily-sheets**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    await page.route('**/api/fund-office/metrics**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            todayDoctorPayments: 0,
            pendingDoctorPayments: 0,
            pendingCount: 0,
            approvedPayments: 0,
            approvedCount: 0,
            paidPayments: 0,
            paidCount: 0,
            hospitalCommission: 0,
            totalDailyRevenue: 0,
            todayPatientsCount: 0
          }
        })
      });
    });

    await page.route('**/api/fund-office/reports**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: []
        })
      });
    });

    await page.route('**/api/fund-office/daily-sheets/sync-or-create', async (route) => {
      createdSheetPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'sheet-1',
            ...createdSheetPayload,
            totalRevenue: 75000,
            hospitalCommission: 12500,
            netDoctorPayment: 62500,
            patientItems: []
          }
        })
      });
    });

    // 3. Open Fund Office page
    await page.goto('http://localhost:3000/fund-office');

    // 4. Open Generate Daily Sheet modal
    const generateBtn = page.locator('button:has-text("Record Doctor Daily Sheet")');
    await expect(generateBtn).toBeVisible({ timeout: 15000 });
    await generateBtn.click();

    // 5. Select doctor configured with FLAT rate via Radix UI Select
    await page.locator('button:has-text("Select Doctor")').click();
    await page.locator('[role="option"]:has-text("Nimal Silva")').click();

    // 6. Verify default commission type is FLAT and value is 500
    const flatToggle = page.locator('[data-testid="fund-comm-type-flat"]');
    await expect(flatToggle).toBeVisible();

    const commRateInput = page.locator('[data-testid="fund-input-commission-rate"]');
    await expect(commRateInput).toHaveValue('500');

    // 7. Verify live summary calculation:
    // 25 patients @ 3000 = 75,000 gross revenue
    // Flat hospital commission = 25 patients * 500 = 12,500 LKR
    // Net doctor payment = 75,000 - 12,500 = 62,500 LKR
    await expect(page.locator('text=Hospital Commission (LKR 500 flat)')).toBeVisible();
    await expect(page.locator('text=- LKR 12,500.00')).toBeVisible();
    await expect(page.locator('text=LKR 62,500.00')).toBeVisible();

    // 8. Submit and verify payload has commissionType: "FLAT"
    await page.locator('button:has-text("Save Daily Sheet")').click();
    await expect.poll(() => createdSheetPayload).not.toBeNull();
    expect(createdSheetPayload.commissionType).toBe('FLAT');
    expect(createdSheetPayload.commissionRate).toBe(500);
  });
});
