import { test, expect } from '@playwright/test';

test.describe('Task 1.5: Medical & Fitness Certificates as Extra Services', () => {
  test('should create, customize, preview, print and bill Medical Leave and Fitness certificates', async ({ page }) => {
    // 1. Mock Authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-nurse-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-nurse-1',
        fullName: 'Nurse Dilani',
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
            fullName: 'Nurse Dilani',
            email: 'nurse@amaz.com',
            role: 'NURSE',
            department: 'EXTRA_SERVICE'
          }
        })
      });
    });

    // Mock initial queue
    const mockQueue = [
      {
        id: 'appt-cert-1',
        tokenNumber: 'ES-10',
        bookingReference: 'AMAZ-20261020-010',
        status: 'BOOKED',
        serviceTitle: 'ECG & General Procedure',
        roomNumber: 'EXT-01',
        patient: {
          id: 'p-cert-1',
          fullName: 'Kusumawathi Perera',
          phone: '0714455667',
          gender: 'FEMALE',
          age: 38
        },
        reportUrl: null,
        fileName: null,
        fileType: null,
        notes: null,
        appointmentDate: '2026-10-20T08:30:00Z',
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

    await page.route('**/api/extra-services/orders**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'Extra service order created' })
      });
    });

    // 2. Navigate to /extra-services
    await page.goto('http://localhost:3000/extra-services', { waitUntil: 'domcontentloaded' });

    // Verify Issue Certificate header button is visible
    const issueCertBtn = page.locator('[data-testid="issue-certificate-btn"]');
    await expect(issueCertBtn).toBeVisible({ timeout: 15000 });

    // 3. Open Certificate Modal
    await issueCertBtn.click();

    // Verify Modal & Header
    await expect(page.locator('text=Issue Medical & Fitness Certificate')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Medical Leave Certificate').first()).toBeVisible();

    // Switch to Edit Details tab on small or active tab view
    const editDetailsTabBtn = page.locator('button:has-text("Edit Details")');
    if (await editDetailsTabBtn.isVisible()) {
      await editDetailsTabBtn.click();
    }

    // 4. Test Medical Leave Certificate Template Form
    const patientNameInput = page.locator('[data-testid="input-patient-name"]');
    await patientNameInput.fill('Sarath Jayawardena');

    const diagnosisInput = page.locator('[data-testid="input-leave-diagnosis"]');
    await diagnosisInput.fill('Acute Pharyngitis & High Fever');

    const leaveFromInput = page.locator('[data-testid="input-leave-from"]');
    await leaveFromInput.fill('2026-10-20');

    const leaveToInput = page.locator('[data-testid="input-leave-to"]');
    await leaveToInput.fill('2026-10-23');

    // Verify Calculated Days: 20, 21, 22, 23 = 4 Days
    await expect(page.locator('[data-testid="leave-days-count"]')).toHaveText('4 Days');

    // Switch to Document Preview tab
    const docPreviewTabBtn = page.locator('button:has-text("Document Preview")');
    await docPreviewTabBtn.click();

    const previewContainer = page.locator('[data-testid="certificate-print-preview"]');
    await expect(previewContainer).toBeVisible();
    await expect(previewContainer).toContainText('AMAZ');
    await expect(previewContainer).toContainText(/MEDICAL CERTIFICATE/i);
    await expect(previewContainer).toContainText('The Certificate is not for Purpose of Leave from A Court of Law');
    await expect(previewContainer).toContainText('Dr. K. M. Wickramasinghe');
    await expect(previewContainer).toContainText('SLMC-28491');
    await expect(previewContainer).toContainText('Sarath Jayawardena');
    await expect(previewContainer).toContainText('Acute Pharyngitis & High Fever');

    // 5. Test Switching to General Fitness Certificate Template
    const fitnessTabBtn = page.locator('[data-testid="tab-fitness-cert"]');
    await fitnessTabBtn.click();

    // Switch to Edit Details tab
    await editDetailsTabBtn.click();

    const fitnessPurposeInput = page.locator('[data-testid="input-fitness-purpose"]');
    await fitnessPurposeInput.fill('University Medical Clearance');

    const heightInput = page.locator('[data-testid="input-height"]');
    await heightInput.fill('180');

    const weightInput = page.locator('[data-testid="input-weight"]');
    await weightInput.fill('75');

    // Verify BMI Calculation (75 / 1.8^2 = 23.1 - Normal)
    const bmiDisplay = page.locator('[data-testid="bmi-display"]');
    await expect(bmiDisplay).toContainText('23.1');
    await expect(bmiDisplay).toContainText('Normal');

    const bpInput = page.locator('[data-testid="input-bp"]');
    await bpInput.fill('118/78');

    // Switch back to Preview to verify Fitness template preview
    await docPreviewTabBtn.click();
    await expect(previewContainer).toContainText(/PHYSICAL FITNESS CERTIFICATE/i);
    await expect(previewContainer).toContainText('To be obtained only from Gazette Government Medical officer');
    await expect(previewContainer).toContainText('1. Name ( In block letters )');
    await expect(previewContainer).toContainText('5. CVS :-');
    await expect(previewContainer).toContainText('9. Investigation :-');
    await expect(previewContainer).toContainText('10. Allergy if any');
    await expect(previewContainer).toContainText('Is found physicaly fit to undergo professional trannings');

    // 6. Test Print Action Trigger
    const printBtn = page.locator('[data-testid="print-certificate-btn"]');
    await expect(printBtn).toBeVisible();
    await printBtn.click();

    // 7. Test Save & Bill Extra Service
    const saveExtraServiceBtn = page.locator('[data-testid="save-extra-service-btn"]');
    await saveExtraServiceBtn.click();

    // Modal should close upon successful saving
    await expect(page.locator('text=Issue Medical & Fitness Certificate')).not.toBeVisible({ timeout: 5000 });

    // 8. Test Row-Level "Cert" action for specific queued patient
    const rowCertBtn = page.locator('[data-testid="issue-cert-for-appt-cert-1"]');
    await expect(rowCertBtn).toBeVisible();
    await rowCertBtn.click();

    // Modal opens with pre-filled patient info: Kusumawathi Perera
    await expect(page.locator('text=Issue Medical & Fitness Certificate')).toBeVisible({ timeout: 5000 });
    await editDetailsTabBtn.click();
    await expect(page.locator('[data-testid="input-patient-name"]')).toHaveValue('Kusumawathi Perera');

    // Close modal
    await page.locator('[data-testid="cancel-cert-modal-btn"]').click();
    await expect(page.locator('text=Issue Medical & Fitness Certificate')).not.toBeVisible();
  });
});
