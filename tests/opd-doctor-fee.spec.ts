import { test, expect } from '@playwright/test';

test.describe('Task 1.1: OPD Doctor Fee Custom Input', () => {
  test('should allow selecting presets, entering custom fee, and gate Next Patient button', async ({ page }) => {
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

    // 2. Mock all API endpoints required by Doctor Consultation page
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
          name: 'Kamal Perera',
          dob: '1988-05-12',
          age: 38,
          gender: 'MALE',
          contact: '0771234567',
          bloodGroup: 'O+',
          allergies: ['Penicillin'],
          chronicConditions: ['Hypertension'],
          medicalHistory: [],
          labResults: [],
          activeVisitId: 'mock-visit-uuid-1'
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

    await page.route('**/api/lab/tests**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/lab/catalog**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    let submittedPayload: any = null;
    await page.route('**/api/prescriptions**', async (route) => {
      if (route.request().method() === 'POST' || route.request().method() === 'PUT') {
        submittedPayload = JSON.parse(route.request().postData() || '{}');
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-rx-id-1',
            visitId: 'mock-visit-uuid-1',
            consultationFee: submittedPayload.consultationFee
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

    await page.route('**/api/tokens/status**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // 3. Navigate to consultation page
    await page.goto('http://localhost:3000/doctor/consultation/mock-patient-1');

    // Wait for patient header to confirm render
    await expect(page.locator('text=Active Consultation')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('input[value="Kamal Perera"]')).toBeVisible();

    // Verify OPD Doctor Fee Selector is displayed
    const feeSelector = page.locator('text=Consultation Fee:');
    await expect(feeSelector).toBeVisible();

    // Verify preset pills are rendered
    const preset850 = page.locator('[data-testid="fee-preset-850"]');
    const preset1000 = page.locator('[data-testid="fee-preset-1000"]');
    const preset1200 = page.locator('[data-testid="fee-preset-1200"]');
    const customFeeBtn = page.locator('[data-testid="custom-fee-btn"]');
    const nextPatientBtn = page.locator('[data-testid="next-patient-btn"]');

    await expect(preset850).toBeVisible();
    await expect(preset1000).toBeVisible();
    await expect(preset1200).toBeVisible();
    await expect(customFeeBtn).toBeVisible();

    // 4. Initial state: No fee selected -> "Next Patient" MUST be disabled
    await expect(nextPatientBtn).toBeDisabled();

    // 5. Select preset Rs. 850 -> "Next Patient" MUST be enabled
    await preset850.click();
    await expect(preset850).toHaveClass(/bg-blue-600/);
    await expect(nextPatientBtn).toBeEnabled();

    // 6. Select preset Rs. 1,000 -> Active pill switches
    await preset1000.click();
    await expect(preset1000).toHaveClass(/bg-blue-600/);
    await expect(preset850).not.toHaveClass(/bg-blue-600/);
    await expect(nextPatientBtn).toBeEnabled();

    // 7. Click "Custom" -> custom input field appears
    await customFeeBtn.click();
    const customInput = page.locator('[data-testid="custom-fee-input"]');
    await expect(customInput).toBeVisible();
    // Initially empty custom input -> "Next Patient" MUST be disabled again
    await expect(nextPatientBtn).toBeDisabled();

    // 8. Type custom amount: 1750 -> "Next Patient" MUST become enabled
    await customInput.fill('1750');
    await expect(nextPatientBtn).toBeEnabled();

    // 9. Clear custom input -> "Next Patient" MUST be disabled again
    await customInput.fill('');
    await expect(nextPatientBtn).toBeDisabled();

    // 10. Type 0 or negative -> MUST remain disabled
    await customInput.fill('0');
    await expect(nextPatientBtn).toBeDisabled();

    // 11. Type final custom fee: 1500
    await customInput.fill('1500');
    await expect(nextPatientBtn).toBeEnabled();

    // 12. Click "Next Patient" to complete consultation and verify payload
    await nextPatientBtn.click();

    // Verify submitted consultation fee was Rs. 1500
    await expect.poll(() => submittedPayload?.consultationFee).toBe(1500);
  });
});
