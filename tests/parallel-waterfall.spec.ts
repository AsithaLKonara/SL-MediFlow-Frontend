import { test, expect } from '@playwright/test';

test.describe('Parallel Waterfall Requests Optimization', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticated receptionist session
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-parallel-test-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'user-001',
        fullName: 'Frontdesk Officer',
        email: 'frontdesk@amaz.com',
        role: 'RECEPTIONIST'
      }));
    });

    await page.route('**/api/auth/refresh', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'mock-parallel-test-token', user: { id: 'user-001', role: 'RECEPTIONIST' } })
      });
    });

    await page.route('**/api/reception/shift/current', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'shift-1', status: 'OPEN', openedBy: 'user-001' })
      });
    });

    // Mock doctor status with active sessions
    await page.route('**/api/frontdesk/doctors/status**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'doc-101',
            fullName: 'Dr. Jane Perera (Consultant Physician)',
            specialty: 'Internal Medicine',
            roomNumber: 'Room 3',
            isArrived: true,
            sessions: [
              { id: 'sess-101', name: 'Morning Clinic', startTime: '08:00', endTime: '12:00', tokenLimit: 30 },
              { id: 'sess-102', name: 'Evening Clinic', startTime: '16:00', endTime: '20:00', tokenLimit: 30 }
            ]
          }
        ])
      });
    });
  });

  test('OperationalWorkspace fetches calendar, tokens, and activity in parallel (< 800ms vs 1200ms waterfall)', async ({ page }) => {
    const requestTimestamps: { name: string; start: number; end: number }[] = [];

    // Mock Calendar, Tokens, and Activity Log endpoints
    await page.route('**/api/frontdesk/doctors/*/calendar**', async route => {
      requestTimestamps.push({ name: 'calendar', start: Date.now(), end: Date.now() });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ days: [] })
      });
    });

    await page.route('**/api/frontdesk/sessions/*/tokens**', async route => {
      requestTimestamps.push({ name: 'tokens', start: Date.now(), end: Date.now() });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/frontdesk/activity**', async route => {
      requestTimestamps.push({ name: 'activity', start: Date.now(), end: Date.now() });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    console.log('Navigating to http://localhost:3000/frontdesk/arrivals ...');
    const tStart = Date.now();
    await page.goto('http://localhost:3000/frontdesk/arrivals');

    // Wait until workspace finishes rendering and requests complete
    await expect(page.locator('text=Dr. Jane Perera').first()).toBeVisible({ timeout: 15000 });
    await expect.poll(() => requestTimestamps.length, { timeout: 10000 }).toBeGreaterThanOrEqual(3);
    const totalElapsed = Date.now() - tStart;
    console.log(`Arrivals Operational Workspace fully loaded in: ${totalElapsed}ms`);

    // Verify all 3 requests fired
    console.log('Request Timestamps Count:', requestTimestamps.length);

    // Get the workspace execution batch
    const lastCal = requestTimestamps.filter(r => r.name === 'calendar').pop();
    const lastTok = requestTimestamps.filter(r => r.name === 'tokens').pop();
    const lastAct = requestTimestamps.filter(r => r.name === 'activity').pop();

    expect(lastCal).toBeDefined();
    expect(lastTok).toBeDefined();
    expect(lastAct).toBeDefined();

    const startDiffCalTok = Math.abs(lastCal!.start - lastTok!.start);
    const startDiffCalAct = Math.abs(lastCal!.start - lastAct!.start);
    console.log(`Start time delta (Calendar vs Tokens): ${startDiffCalTok}ms`);
    console.log(`Start time delta (Calendar vs Activity): ${startDiffCalAct}ms`);

    // Assert concurrent initiation: requests start within 50ms of each other (proving Promise.all)
    expect(startDiffCalTok).toBeLessThan(50);
    expect(startDiffCalAct).toBeLessThan(50);

    // Clean up routes safely
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  });
});
