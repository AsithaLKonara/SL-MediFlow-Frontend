import { test, expect } from '@playwright/test';

test.describe('Task 1.2 & 1.3: Dual Popups for Lab Tests & Extra Services in Consultation', () => {
  test('should open modals, search & select tests/services, allow price override for OPD, and submit cleanly', async ({ page }) => {
    // 1. Mock Authentication & Doctor Profile as an OPD Doctor in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-doctor-uuid-1',
        fullName: 'Dr. OPD Specialist',
        email: 'doctor.opd@amaz.com',
        role: 'DOCTOR',
        department: 'OPD',
        feeOptions: [850, 1000, 1200],
        consultationFee: 1000
      }));
    });

    // 2. Mock API endpoints
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-doctor-uuid-1',
            fullName: 'Dr. OPD Specialist',
            email: 'doctor.opd@amaz.com',
            role: 'DOCTOR',
            department: 'OPD',
            feeOptions: [850, 1000, 1200],
            consultationFee: 1000
          }
        })
      });
    });

    await page.route('**/api/doctor/patients/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-patient-1',
          name: 'Nimal Jayawardena',
          dob: '1990-04-10',
          age: 36,
          gender: 'MALE',
          contact: '0779876543',
          bloodGroup: 'B+',
          allergies: [],
          chronicConditions: [],
          medicalHistory: [],
          labResults: [],
          activeVisitId: 'mock-visit-uuid-2'
        })
      });
    });

    await page.route('**/api/pharmacy/medicines**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock Lab Catalog
    const mockLabCatalog = [
      { id: 'lab-1', name: 'Full Blood Count (FBC)', code: 'FBC-01', category: 'Hematology', price: 1200 },
      { id: 'lab-2', name: 'Fasting Blood Sugar (FBS)', code: 'FBS-01', category: 'Biochemistry', price: 650 },
      { id: 'lab-3', name: 'Lipid Profile', code: 'LIP-01', category: 'Biochemistry', price: 2800 },
      { id: 'lab-4', name: 'Urine Full Report (UFR)', code: 'UFR-01', category: 'Microbiology', price: 750 }
    ];

    await page.route('**/api/lab/catalog**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLabCatalog)
      });
    });

    // Mock Extra Services Catalog
    const mockExtraServices = [
      { id: 'es-1', title: 'ECG (12-Lead)', description: 'Standard cardiac rhythm tracing', price: 1500, room: { id: 'r1', roomNumber: 'EXT-01' } },
      { id: 'es-2', title: 'Nebulization Session', description: 'Salbutamol respiratory nebulization', price: 800, room: { id: 'r2', roomNumber: 'EXT-02' } },
      { id: 'es-3', title: 'Wound Dressing (Medium)', description: 'Sterile surgical wound cleansing and bandaging', price: 950, room: null }
    ];

    await page.route('**/api/extra-services**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockExtraServices)
      });
    });

    let submittedRxPayload: any = null;
    await page.route('**/api/prescriptions**', async (route) => {
      if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
        submittedRxPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-rx-id-2',
            visitId: 'mock-visit-uuid-2',
            consultationFee: submittedRxPayload.consultationFee
          })
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      }
    });

    let submittedLabPayload: any = null;
    await page.route('**/api/lab/requests**', async (route) => {
      submittedLabPayload = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'mock-lr-1' })
      });
    });

    await page.route('**/api/tokens/status**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // 3. Navigate to consultation page
    await page.goto('http://localhost:3000/doctor/consultation/mock-patient-1');
    await expect(page.locator('text=Active Consultation')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[value="Nimal Jayawardena"]')).toBeVisible();

    // 4. Verify Dual Order Buttons are rendered
    const openLabBtn = page.locator('[data-testid="open-lab-modal-btn"]');
    const openExtraBtn = page.locator('[data-testid="open-extra-service-modal-btn"]');

    await expect(openLabBtn).toBeVisible();
    await expect(openExtraBtn).toBeVisible();

    // 5. Test Lab Order Modal
    await openLabBtn.click();
    const labModal = page.locator('[data-testid="lab-order-modal"]');
    await expect(labModal).toBeVisible();

    // Search for "FBS"
    const labSearchInput = page.locator('[data-testid="lab-search-input"]');
    await labSearchInput.fill('FBS');
    await expect(page.locator('[data-testid="lab-test-row-lab-2"]')).toBeVisible();
    await expect(page.locator('[data-testid="lab-test-row-lab-1"]')).not.toBeVisible();

    // Clear search and select FBC
    await labSearchInput.fill('');
    await page.locator('[data-testid="lab-test-row-lab-1"]').click();

    // Check URGENT flag
    const urgentCheckbox = page.locator('[data-testid="lab-urgent-checkbox"]');
    await urgentCheckbox.check();

    // Confirm lab modal
    await page.locator('[data-testid="confirm-lab-modal-btn"]').click();
    await expect(labModal).not.toBeVisible();

    // Verify selected lab test appears in consultation page summary
    await expect(page.locator('[data-testid="selected-lab-lab-1"]')).toBeVisible();
    await expect(page.locator('text=URGENT')).toBeVisible();
    await expect(page.locator('[data-testid="selected-lab-lab-1"]').locator('text=Rs. 1,200')).toBeVisible();

    // 6. Test Extra Service Order Modal
    await openExtraBtn.click();
    const extraModal = page.locator('[data-testid="extra-service-order-modal"]');
    await expect(extraModal).toBeVisible();

    // Search for "ECG"
    const extraSearchInput = page.locator('[data-testid="extra-service-search-input"]');
    await extraSearchInput.fill('ECG');
    await expect(page.locator('[data-testid="extra-service-row-es-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="extra-service-row-es-2"]')).not.toBeVisible();

    // Clear search and select ECG & Nebulization
    await extraSearchInput.fill('');
    await page.locator('[data-testid="extra-service-row-es-1"]').click();
    await page.locator('[data-testid="extra-service-row-es-2"]').click();

    // Confirm extra services modal
    await page.locator('[data-testid="confirm-extra-service-modal-btn"]').click();
    await expect(extraModal).not.toBeVisible();

    // Verify both extra services appear in consultation page summary
    await expect(page.locator('[data-testid="selected-extra-service-es-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="selected-extra-service-es-2"]')).toBeVisible();

    // 7. Verify Task 1.3: OPD Doctor Extra Service Price Override
    // For OPD doctors, price field is editable!
    const ecgPriceInput = page.locator('[data-testid="extra-service-price-es-1"]');
    await expect(ecgPriceInput).toBeVisible();
    await expect(ecgPriceInput).toHaveValue('1500');

    // Override ECG price to 1350
    await ecgPriceInput.fill('1350');
    await expect(ecgPriceInput).toHaveValue('1350');

    // 8. Test item removal: remove Nebulization (es-2)
    const removeNebBtn = page.locator('[data-testid="remove-extra-service-es-2"]');
    await removeNebBtn.click();
    await expect(page.locator('[data-testid="selected-extra-service-es-2"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="selected-extra-service-es-1"]')).toBeVisible();

    // 9. Select doctor fee preset Rs. 1000
    const preset1000 = page.locator('[data-testid="fee-preset-1000"]');
    await preset1000.click();

    // 10. Click Next Patient to complete consultation
    const nextPatientBtn = page.locator('[data-testid="next-patient-btn"]');
    await expect(nextPatientBtn).toBeEnabled();
    await nextPatientBtn.click();

    // 11. Assert submitted payloads
    // Check prescription payload contains consultationFee & overridden extra service price
    await expect.poll(() => submittedRxPayload?.consultationFee).toBe(1000);
    await expect.poll(() => submittedRxPayload?.extraServices?.length).toBe(1);
    expect(submittedRxPayload.extraServices[0].id).toBe('es-1');
    expect(submittedRxPayload.extraServices[0].customPrice).toBe(1350);

    // Check lab requests payload was dispatched with priority URGENT and test ID
    await expect.poll(() => submittedLabPayload?.priority).toBe('URGENT');
    expect(submittedLabPayload?.testIds).toContain('lab-1');
  });
});
