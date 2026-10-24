import { test, expect } from '@playwright/test';

test.describe('Task 5: POS Medical Certificate Deduplication & Debounce', () => {
  test('POS should render exactly ONE certificate line item and avoid duplicate totals even if invoice contains multiple', async ({ page }) => {
    // 1. Mock Frontdesk / Cashier Authentication
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-frontdesk-user-1',
        fullName: 'Receptionist User',
        email: 'reception@amaz.com',
        role: 'RECEPTIONIST',
        department: 'RECEPTION'
      }));
    });

    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'mock-frontdesk-user-1',
            fullName: 'Receptionist User',
            email: 'reception@amaz.com',
            role: 'RECEPTIONIST',
            department: 'RECEPTION'
          }
        })
      });
    });

    await page.route('**/api/reception/shift/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mock-shift-1',
          status: 'OPEN',
          cashierId: 'mock-frontdesk-user-1',
          startingCash: 5000
        })
      });
    });

    await page.route('**/api/reception/doctors/today', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/prescriptions/pending', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.route('**/api/pharmacy/medicines**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // 2. Mock Barcode scan returning an appointment that has duplicate certificate entries
    await page.route('**/api/barcode/AMAZ-VISIT-DUPLICATE-TEST', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          type: 'APPOINTMENT',
          data: {
            appointment: {
              id: 'mock-appt-1',
              tokenNumber: '05',
              bookingReference: 'AMAZ-VISIT-DUPLICATE-TEST',
              status: 'WAITING',
              department: 'CONSULTATION',
              doctorId: 'doc-1',
              patientId: 'patient-1',
              Patient: {
                id: 'patient-1',
                fullName: 'Sunil Perera',
                phone: '0771234567'
              },
              User: {
                id: 'doc-1',
                fullName: 'Dr. Mahesh Lakshman',
                feeType: 'POST_PAY',
                consultationFee: 2500
              }
            },
            allAppointments: [
              {
                id: 'mock-appt-1',
                department: 'CONSULTATION',
                tokenNumber: '05',
                bookingReference: 'AMAZ-VISIT-DUPLICATE-TEST'
              }
            ],
            // Simulate the backend invoice having duplicate certificate entries (e.g. from synthesis or multi-drafts)
            invoice: {
              id: 'mock-inv-1',
              status: 'DRAFT',
              subtotal: 3800,
              totalAmount: 3800,
              discountAmount: 0,
              lineItems: [
                {
                  id: 'li-consult-1',
                  referenceId: 'ref-consult-1',
                  department: 'CONSULTATION',
                  description: 'Consultation - Dr. Mahesh Lakshman',
                  quantity: 1,
                  unitPrice: 2500,
                  total: 2500
                },
                {
                  id: 'li-cert-1',
                  referenceId: 'order-cert-1',
                  department: 'EXTRA_SERVICE',
                  description: 'Medical Certificate (GENERAL)',
                  quantity: 1,
                  unitPrice: 650,
                  total: 650
                },
                {
                  id: 'li-cert-duplicate',
                  referenceId: 'order-cert-1', // same order reference!
                  department: 'EXTRA_SERVICE',
                  description: 'Medical Certificate (GENERAL)',
                  quantity: 1,
                  unitPrice: 650,
                  total: 650
                }
              ]
            },
            prescriptions: [],
            consultationPaid: false
          }
        })
      });
    });

    // 3. Navigate to Frontdesk POS Workspace
    await page.goto('/frontdesk/workspace');

    // 4. Scan or enter the barcode into POS
    const barcodeInput = page.getByPlaceholder(/Scan barcode or search medicine/i).first();
    await expect(barcodeInput).toBeVisible({ timeout: 10000 });

    await barcodeInput.fill('AMAZ-VISIT-DUPLICATE-TEST');
    await barcodeInput.press('Enter');

    // 5. Verify the visit loads
    await expect(page.getByText('AMAZ-VISIT-DUPLICATE-TEST loaded for checkout.')).toBeVisible({ timeout: 5000 });

    // 6. VERIFICATION: Count how many "Medical Certificate (GENERAL)" rows appear in the POS items table
    const certRows = page.getByText('Medical Certificate (GENERAL)');
    await expect(certRows).toHaveCount(1);

    // 7. VERIFICATION: Total Amount should be 2500 + 650 = 3150.00, NOT 3800 (which had the duplicate 650)
    const totalEl = page.locator('div.border-t:has-text("Total")').last();
    await expect(totalEl).toContainText('3150.00');
  });

  test('Doctor Consultation MedicalCertificateModal Save button disables while saving', async ({ page }) => {
    // Mock Doctor Authentication
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
          allergies: [],
          chronicConditions: [],
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

    let orderCallCount = 0;
    await page.route('**/api/extra-services/orders', async (route) => {
      orderCallCount++;
      // add small artificial delay to verify disabled state
      await new Promise(r => setTimeout(r, 400));
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          orders: [{ id: 'order-created-1', orderNumber: 'EXS-001' }]
        })
      });
    });

    await page.goto('/doctor/consultation/mock-patient-1');

    // Open certificate modal
    const certBtn = page.getByTestId('open-certificate-modal-btn');
    await expect(certBtn).toBeVisible({ timeout: 10000 });
    await certBtn.click();

    const saveBtn = page.getByRole('button', { name: /Save to Billing/i });
    await expect(saveBtn).toBeVisible();

    // Click Save to Billing
    await saveBtn.click();

    // Verify it becomes disabled or displays "Saving..."
    await expect(page.getByText('Saving...')).toBeVisible();

    // Wait for save to complete and success toast
    await expect(page.getByText(/Medical Certificate saved as COMPLETED/i)).toBeVisible({ timeout: 5000 });

    expect(orderCallCount).toBe(1);
  });
});
