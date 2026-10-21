import { test, expect } from '@playwright/test';

test.describe('Task 1.4: Extra Services Workstation Dashboard & Any-File-Type Upload', () => {
  test('should load today queue, search, upload any-format file report, and mark complete', async ({ page }) => {
    // 1. Mock Authentication as Nurse
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-nurse-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-nurse-1',
        fullName: 'Nurse Chathurika',
        email: 'nurse@amaz.com',
        role: 'NURSE',
        department: 'EXTRA_SERVICE'
      }));
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-nurse-1',
            fullName: 'Nurse Chathurika',
            email: 'nurse@amaz.com',
            role: 'NURSE',
            department: 'EXTRA_SERVICE'
          }
        })
      });
    });

    // Mock initial queue
    let mockQueue: any[] = [
      {
        id: 'appt-es-1',
        tokenNumber: 'ES-01',
        bookingReference: 'AMAZ-20261020-001',
        status: 'BOOKED',
        serviceTitle: 'ECG (12-Lead)',
        roomNumber: 'EXT-01',
        patient: {
          id: 'p-1',
          fullName: 'Sunil Shantha',
          phone: '0712345678',
          gender: 'MALE',
          age: 52
        },
        reportUrl: null,
        fileName: null,
        fileType: null,
        notes: null,
        appointmentDate: '2026-10-20T08:30:00Z',
        completedAt: null
      },
      {
        id: 'appt-es-2',
        tokenNumber: 'ES-02',
        bookingReference: 'AMAZ-20261020-002',
        status: 'BOOKED',
        serviceTitle: 'Wound Dressing (Surgical)',
        roomNumber: 'EXT-02',
        patient: {
          id: 'p-2',
          fullName: 'Anoma Priyadarshani',
          phone: '0779988776',
          gender: 'FEMALE',
          age: 41
        },
        reportUrl: null,
        fileName: null,
        fileType: null,
        notes: null,
        appointmentDate: '2026-10-20T09:15:00Z',
        completedAt: null
      }
    ];

    await page.route('**/api/extra-services/queue', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockQueue)
      });
    });

    let uploadedFormData: any = null;
    await page.route('**/api/extra-services/upload', async (route) => {
      uploadedFormData = true;
      const apptId = 'appt-es-1';
      mockQueue = mockQueue.map(q => q.id === apptId ? {
        ...q,
        status: 'COMPLETED',
        reportUrl: 'https://storage.amazhospital.com/extra-services/ecg_strip.png',
        fileName: 'ecg_strip.png',
        fileType: 'image/png',
        notes: 'Normal sinus rhythm, 72 bpm',
        completedAt: new Date().toISOString()
      } : q);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: apptId,
            status: 'COMPLETED',
            reportUrl: 'https://storage.amazhospital.com/extra-services/ecg_strip.png',
            fileName: 'ecg_strip.png',
            fileType: 'image/png',
            notes: 'Normal sinus rhythm, 72 bpm',
            completedAt: new Date().toISOString()
          }
        })
      });
    });

    await page.route('**/api/extra-services/appointments/*/status', async (route) => {
      const url = route.request().url();
      const apptId = url.split('/appointments/')[1]?.split('/status')[0];
      const postData = JSON.parse(route.request().postData() || '{}');
      const newStatus = postData.status || 'COMPLETED';

      mockQueue = mockQueue.map(q => q.id === apptId ? {
        ...q,
        status: newStatus,
        completedAt: newStatus === 'COMPLETED' ? new Date().toISOString() : null
      } : q);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { id: apptId, status: newStatus } })
      });
    });

    // 2. Navigate to /extra-services
    await page.goto('http://localhost:3000/extra-services', { waitUntil: 'domcontentloaded' });

    // Verify Station Header
    await expect(page.locator('text=Extra Services & Procedures Workstation')).toBeVisible({ timeout: 15000 });

    // Verify Queue Rows (wait for async fetch to populate)
    await expect(page.locator('[data-testid="queue-row-appt-es-1"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Sunil Shantha')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=ECG (12-Lead)')).toBeVisible();

    await expect(page.locator('[data-testid="queue-row-appt-es-2"]')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Anoma Priyadarshani')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=Wound Dressing (Surgical)')).toBeVisible();

    // Verify Metrics Stats
    await expect(page.locator('[data-testid="stat-total"]')).toHaveText('2');
    await expect(page.locator('[data-testid="stat-pending"]')).toHaveText('2');
    await expect(page.locator('[data-testid="stat-completed"]')).toHaveText('0');

    // 3. Test Search filtering
    const searchInput = page.locator('[data-testid="queue-search-input"]');
    await searchInput.fill('Sunil');
    await expect(page.locator('[data-testid="queue-row-appt-es-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="queue-row-appt-es-2"]')).not.toBeVisible();
    await searchInput.fill('');
    await expect(page.locator('[data-testid="queue-row-appt-es-2"]')).toBeVisible();

    // 4. Test Any-File-Type Upload (ECG Image Strip / Scan)
    const uploadBtn1 = page.locator('[data-testid="open-upload-btn-appt-es-1"]');
    await uploadBtn1.click();

    const uploadModal = page.locator('[data-testid="upload-report-modal"]');
    await expect(uploadModal).toBeVisible();

    // Attach mock file (supports ANY format: PNG image)
    const fileInput = page.locator('[data-testid="report-file-input"]');
    await fileInput.setInputFiles({
      name: 'ecg_strip.png',
      mimeType: 'image/png',
      buffer: Buffer.from('mock-ecg-image-binary-data')
    });

    // Verify selected file preview
    await expect(page.locator('text=ecg_strip.png')).toBeVisible();

    // Add technician notes
    const notesInput = page.locator('[data-testid="report-notes-input"]');
    await notesInput.fill('Normal sinus rhythm, 72 bpm');

    // Submit upload
    const submitUploadBtn = page.locator('[data-testid="submit-upload-btn"]');
    await submitUploadBtn.click();

    // Verify modal closes
    await expect(uploadModal).not.toBeVisible();
    expect(uploadedFormData).toBe(true);

    // Verify procedure item transitions to COMPLETED with report link
    const row1 = page.locator('[data-testid="queue-row-appt-es-1"]');
    await expect(row1.locator('text=COMPLETED')).toBeVisible();
    await expect(row1.locator('[data-testid="view-report-appt-es-1"]')).toBeVisible();
    await expect(row1.getByText('PNG', { exact: true })).toBeVisible();

    // 5. Test Manual Toggle on row 2
    const toggleBtn2 = page.locator('[data-testid="toggle-status-btn-appt-es-2"]');
    await toggleBtn2.click();

    const row2 = page.locator('[data-testid="queue-row-appt-es-2"]');
    await expect(row2.locator('text=COMPLETED')).toBeVisible();
    await expect(row2.locator('text=Undo')).toBeVisible();
  });
});
