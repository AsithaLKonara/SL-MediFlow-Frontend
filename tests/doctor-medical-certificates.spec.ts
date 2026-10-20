import { test, expect } from '@playwright/test';

test.describe('Task 2: Official Medical and Fitness Certificate Templates in Doctor Consultation', () => {
  test('should open certificate modal, render official A5 medical certificate and A4 fitness certificate templates', async ({ page }) => {
    // 1. Mock Doctor Authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-doctor-uuid-1',
        fullName: 'Dr. V.K.P.A. Mahesh Lakshman',
        email: 'doctor.mahesh@amaz.com',
        role: 'DOCTOR',
        department: 'OPD'
      }));
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-doctor-uuid-1',
            fullName: 'Dr. V.K.P.A. Mahesh Lakshman',
            email: 'doctor.mahesh@amaz.com',
            role: 'DOCTOR',
            department: 'OPD'
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
          allergies: ['Penicillin'],
          chronicConditions: ['Hypertension'],
          medicalHistory: [],
          labResults: [],
          activeVisitId: 'mock-visit-uuid-1'
        })
      });
    });

    await page.route('**/api/pharmacy/medicines**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/lab/catalog**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route('**/api/extra-services/catalog**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });

    // 2. Navigate to Doctor Consultation
    await page.goto('http://localhost:3000/doctor/consultation/mock-patient-1', { waitUntil: 'domcontentloaded' });

    // 3. Locate & click "Certificate" button in Consultation Action Bar
    const certBtn = page.locator('[data-testid="open-certificate-modal-btn"]');
    await expect(certBtn).toBeVisible({ timeout: 15000 });
    await certBtn.click();

    // 4. Verify Modal Header & Live Preview Container
    const modalHeader = page.locator('text=Hospital Official Certificate Generator');
    await expect(modalHeader).toBeVisible({ timeout: 10000 });

    const previewContainer = page.locator('[data-testid="certificate-preview-container"]');
    await expect(previewContainer).toBeVisible();

    // 5. Verify Official A5 Landscape Medical Certificate Template Details (matching Image 2)
    // - Orange/Red left banner: "The Certificate is not for Purpose of Leave from A Court of Law"
    // - "MEDICAL CERTIFICATE"
    // - Hospital Reg: PHSRC/PH/306
    // - Doctor stamp: Dr. V.K.P.A. Mahesh Lakshman / MBBS - Karapitiya / SLMC Reg. NO.27337
    // - Dotted lines for Date, Name & Address, Diagnosis, Remarks, Recommended
    await expect(previewContainer).toContainText('The Certificate is not for Purpose of Leave from A Court of Law');
    await expect(previewContainer).toContainText('MEDICAL CERTIFICATE');
    await expect(previewContainer).toContainText('Dr. V.K.P.A. Mahesh Lakshman');
    await expect(previewContainer).toContainText('MBBS - Karapitiya');
    await expect(previewContainer).toContainText('SLMC Reg. NO. 27337');
    await expect(previewContainer).toContainText('PHSRC/PH/306');
    await expect(previewContainer).toContainText('Nimal Jayawardena');
    await expect(previewContainer).toContainText('Diagnosis :');
    await expect(previewContainer).toContainText('Remarks :');
    await expect(previewContainer).toContainText('Recommended :');
    await expect(previewContainer).toContainText('Signature of Medical Officer');

    // 6. Test Switching to Physical Fitness Certificate (A4 Portrait - matching Image 1)
    const fitnessTab = page.locator('[data-testid="tab-fitness-a4"]');
    await fitnessTab.click();

    // Verify all 10 numbered examination sections & legal declaration from Image 1
    await expect(previewContainer).toContainText('PHYSICAL FITNESS CERTIFICATE');
    await expect(previewContainer).toContainText('To be obtained only from Gazette Government Medical officer of a Government undertaking');
    await expect(previewContainer).toContainText('1. Name ( In block letters )');
    await expect(previewContainer).toContainText('2. ID No');
    await expect(previewContainer).toContainText('3. Height');
    await expect(previewContainer).toContainText('4. Respiration');
    await expect(previewContainer).toContainText('5. CVS');
    await expect(previewContainer).toContainText('6. Abdomen');
    await expect(previewContainer).toContainText('7. Hearing');
    await expect(previewContainer).toContainText('8. Vision');
    await expect(previewContainer).toContainText('9. Investigation');
    await expect(previewContainer).toContainText('10. Allergy if any');
    await expect(previewContainer).toContainText('Is found physicaly fit to undergo professional trannings');
    await expect(previewContainer).toContainText('Signature');

    // 7. Test "Print Blank Stationery" Mode
    const blankToggle = page.locator('[data-testid="chk-blank-stationery"]');
    await blankToggle.click();

    // In blank stationery mode, patient name should not appear in the underlined slot
    await expect(previewContainer).toContainText('PHYSICAL FITNESS CERTIFICATE');
    await expect(previewContainer).not.toContainText('NIMAL JAYAWARDENA');

    // Toggle off blank mode
    await blankToggle.click();

    // 8. Test Print action triggers
    const printCertBtn = page.locator('[data-testid="print-certificate-btn"]');
    await expect(printCertBtn).toBeVisible();
    await printCertBtn.click();
  });
});
