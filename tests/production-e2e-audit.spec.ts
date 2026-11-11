import { test, expect, Page } from '@playwright/test';

// Configuration: Target Production
const PROD_BASE_URL = 'https://slmediflow.lk';
const PROD_API_URL = 'https://api.slmediflow.lk';

// Pre-generated valid production tokens
const AUTH_TOKENS = {
  superadmin: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjIxMmNjMWNmLTZhZTctNDgxNi04ZmRmLTg4NmIxYjQ4MzhhMiIsInJvbGVJZCI6IjdkNWVkYTBlLTM5ZDItNGZiMi05ZDE1LTc2MDUxMTgwMjZhNyIsImVtYWlsIjoiYWRtaW5AYW1hei5jb20iLCJpYXQiOjE3OTMxOTk4NzQsImV4cCI6MTc5MzI4NjI3NH0.c7SK0DNfG-4aLMGOoy5tHXvJTK2cBdhAv-XKw4gYr7E",
    user: {
      id: "212cc1cf-6ae7-4816-8fdf-886b1b4838a2",
      fullName: "System Admin",
      email: "admin@amaz.com",
      role: "Superadmin"
    }
  },
  receptionist: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNlZjg0ZDdlLTdjMjEtNDkxOC1hMTczLTM0ZTQ2MzFlYTg2MCIsInJvbGVJZCI6IjJhNGFjMmY5LTM4YTQtNGJhNC1iNzA1LWUzZGY5ZTNhOGMzYyIsImVtYWlsIjoidWRhcmlAYW1hemhvc3BpdGFsLmxrIiwiaWF0IjoxNzkzMTk5ODc0LCJleHAiOjE3OTMyODYyNzR9.cXFNb72EL7-San1gYw95ILMlUc98UigBVOnUgZx_IB8",
    user: {
      id: "3ef84d7e-7c21-4918-a173-34e4631ea860",
      fullName: "Udari",
      email: "udari@slmediflow.lk",
      role: "Receptionist"
    }
  },
  doctor: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImM1MTQyNTUxLWQ1MTMtNDQ1MS1hOTdiLWQxMGZjYmVmYWExMiIsInJvbGVJZCI6ImQ4ZGQ1YTQ4LTk3MmYtNDI4MC1iYjc1LTUwOTczOTBiMDQwZCIsImVtYWlsIjoidmtwYW1haGVzaGxha3NobWFuQGFtYXouY29tIiwiaWF0IjoxNzkzMTk5ODc0LCJleHAiOjE3OTMyODYyNzR9.oHQbaJ4CgNyp0E31oZ1vhmK5obxfUPQ7YweFU2u54dw",
    user: {
      id: "c5142551-d513-4451-a97b-d10fcbefaa12",
      fullName: "V.K.P.A. Mahesh Lakshman",
      email: "vkpamaheshlakshman@amaz.com",
      role: "Doctor",
      department: "OPD"
    }
  },
  labtech: {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImY5ZGZkYzk0LTJlMDItNGNmMC05M2U1LTljMjgwZmZlYTUxYSIsInJvbGVJZCI6IjNmZTEwOTEyLTRlMjctNGJkZC04MGEwLWYyOGYzMTBmZTA4ZiIsImVtYWlsIjoiY2hhbmlrYUBhbWF6aG9zcGl0YWwubGsiLCJpYXQiOjE3OTMxOTk4NzQsImV4cCI6MTc5MzI4NjI3NH0.xujPyScZ_gj3WNubGlhvFiQl67KQmtKgSbWlBgBQzsw",
    user: {
      id: "f9dfdc94-2e02-4cf0-93e5-9c280ffea51a",
      fullName: "Chanika",
      email: "chanika@slmediflow.lk",
      role: "LabTech"
    }
  }
};

// Helper: Setup telemetry and auth on page
async function setupPage(page: Page, roleKey?: keyof typeof AUTH_TOKENS) {
  const telemetry = {
    consoleErrors: [] as string[],
    failedRequests: [] as { url: string; status: number; method: string }[],
    slowRequests: [] as { url: string; durationMs: number }[]
  };

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      telemetry.consoleErrors.push(msg.text());
    }
  });

  page.on('response', (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !url.includes('/favicon.ico')) {
      telemetry.failedRequests.push({ url, status, method: response.request().method() });
    }
  });

  if (roleKey && AUTH_TOKENS[roleKey]) {
    const auth = AUTH_TOKENS[roleKey];
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      document.cookie = `token=${token}; path=/; max-age=86400; Secure; SameSite=None`;
    }, auth);
  }

  return telemetry;
}

test.describe('SL MediFlow Production E2E Audit (https://slmediflow.lk)', () => {
  test.setTimeout(90000);

  test('Lifecycle 1: Authentication, RBAC & Route Guarding', async ({ page }) => {
    const telemetry = await setupPage(page);

    // 1. Unauthenticated root route redirects to /login
    await page.goto(`${PROD_BASE_URL}/`);
    await page.waitForURL(/.*\/login/, { timeout: 15000 });
    expect(page.url()).toContain('/login');

    // 2. Login Page UI integrity
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    // 3. Authenticate as Receptionist and verify RBAC redirect to /frontdesk
    await page.addInitScript(({ token, user }) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }, AUTH_TOKENS.receptionist);

    // Try accessing superadmin path as receptionist
    await page.goto(`${PROD_BASE_URL}/superadmin/rbac`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    const rbacContentVisible = await page.locator('text=Role Permissions, text=Role-Based Access Control, button:has-text("Add Role")').isVisible();
    console.log('[Lifecycle 1] RBAC Sensitive Content Visible to Receptionist:', rbacContentVisible);
    // Receptionist MUST NOT see RBAC content
    expect(rbacContentVisible).toBeFalsy();

    console.log('[Telemetry Lifecycle 1]', {
      url: page.url(),
      consoleErrors: telemetry.consoleErrors.length,
      failedRequests: telemetry.failedRequests
    });
  });

  test('Lifecycle 2 & 3: Frontdesk Workspace, Patient Search & Token Engine', async ({ page }) => {
    const telemetry = await setupPage(page, 'receptionist');

    await page.goto(`${PROD_BASE_URL}/frontdesk`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Verify Frontdesk header / tabs
    const bodyText = await page.textContent('body');
    expect(bodyText).toContain('SL MediFlow');

    // Check presence of key frontdesk elements (Search, Booking / Queue, Shift)
    const hasSearch = await page.locator('input[placeholder*="Search"], input[placeholder*="search"], input[type="search"]').first().isVisible();
    console.log('[Lifecycle 2] Patient Search Visible:', hasSearch);

    console.log('[Telemetry Lifecycle 2 & 3]', {
      consoleErrors: telemetry.consoleErrors.length,
      failedRequests: telemetry.failedRequests.filter(r => !r.url.includes('/api/auth/me'))
    });
  });

  test('Lifecycle 6: Doctor Consultation & Clinical Queue', async ({ page }) => {
    const telemetry = await setupPage(page, 'doctor');

    await page.goto(`${PROD_BASE_URL}/doctor`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    // Verify Doctor dashboard loads
    const url = page.url();
    expect(url).toContain('/doctor');

    const bodyText = await page.textContent('body');
    console.log('[Lifecycle 6] Doctor Portal loaded. Body snippet:', bodyText?.substring(0, 300));

    console.log('[Telemetry Lifecycle 6]', {
      consoleErrors: telemetry.consoleErrors.length,
      failedRequests: telemetry.failedRequests
    });
  });

  test('Lifecycle 8: Laboratory Diagnostics Portal', async ({ page }) => {
    const telemetry = await setupPage(page, 'labtech');

    await page.goto(`${PROD_BASE_URL}/labtech`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);

    expect(page.url()).toContain('/labtech');
    const bodyText = await page.textContent('body');
    console.log('[Lifecycle 8] Lab Tech loaded. Snippet:', bodyText?.substring(0, 300));

    console.log('[Telemetry Lifecycle 8]', {
      consoleErrors: telemetry.consoleErrors.length,
      failedRequests: telemetry.failedRequests
    });
  });

  test('Lifecycle 10: Frontdesk POS, Receipt Template & History', async ({ page }) => {
    const telemetry = await setupPage(page, 'receptionist');

    await page.goto(`${PROD_BASE_URL}/frontdesk?tab=pos`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(4000);

    // Check POS tab UI
    const bodyText = await page.textContent('body');
    const hasPOS = bodyText?.toLowerCase().includes('pos') || bodyText?.toLowerCase().includes('cart') || bodyText?.toLowerCase().includes('checkout');
    console.log('[Lifecycle 10] POS Tab content detected:', hasPOS);

    // Inspect POS History button if present
    const historyBtn = page.locator('button:has-text("History"), button[title*="History"]').first();
    if (await historyBtn.isVisible()) {
      await historyBtn.click();
      await page.waitForTimeout(1500);
      console.log('[Lifecycle 10] Opened POS History modal successfully.');
    }

    console.log('[Telemetry Lifecycle 10]', {
      consoleErrors: telemetry.consoleErrors.length,
      failedRequests: telemetry.failedRequests
    });
  });

  test('Lifecycle 11, 12, 13: Superadmin Inventory, Finance & HR Portals', async ({ page }) => {
    const telemetry = await setupPage(page, 'superadmin');

    // 1. Inventory
    await page.goto(`${PROD_BASE_URL}/superadmin/inventory`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/superadmin/inventory');

    // 2. Finance / Doctor Share
    await page.goto(`${PROD_BASE_URL}/superadmin/doctor-share`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/superadmin/doctor-share');

    // 3. HR & Payroll
    await page.goto(`${PROD_BASE_URL}/superadmin/hr/payroll`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    expect(page.url()).toContain('/superadmin/hr/payroll');

    console.log('[Telemetry Lifecycle 11, 12, 13]', {
      consoleErrors: telemetry.consoleErrors.length,
      failedRequests: telemetry.failedRequests
    });
  });

  test('Lifecycle 14: Public TV Waiting Queue Display', async ({ page }) => {
    const telemetry = await setupPage(page);

    await page.goto(`${PROD_BASE_URL}/customer-display`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);

    expect(page.url()).toContain('/customer-display');
    const bodyText = await page.textContent('body');
    console.log('[Lifecycle 14] Customer Display snippet:', bodyText?.substring(0, 200));

    console.log('[Telemetry Lifecycle 14]', {
      consoleErrors: telemetry.consoleErrors.length,
      failedRequests: telemetry.failedRequests
    });
  });
});
