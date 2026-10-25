import { test, expect } from '@playwright/test';

test.describe('Task 2: Doctor Share Receipt Voucher 80mm Thermal Print Format', () => {

  test.beforeEach(async ({ page }) => {
    // Mock user login and print in localStorage / window
    await page.addInitScript(() => {
      window.print = () => {};
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-receptionist-id',
        fullName: 'Frontdesk Officer',
        email: 'frontdesk@amaz.com',
        role: 'RECEPTIONIST',
        roleName: 'RECEPTIONIST'
      }));
    });

    // Mock auth refresh
    await page.route('**/api/auth/refresh', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-test-jwt-token',
          user: {
            id: 'mock-receptionist-id',
            fullName: 'Frontdesk Officer',
            email: 'frontdesk@amaz.com',
            role: 'RECEPTIONIST',
            roleName: 'RECEPTIONIST'
          }
        })
      });
    });

    // Mock doctors list
    await page.route('**/api/users?role=Doctor', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            { id: 'doc-001', fullName: 'Dr. Sunil Perera', specialty: 'General Practitioner' }
          ]
        })
      });
    });

    // Mock frontdesk doctor shares
    await page.route('**/api/fund-office/frontdesk/doctor-shares**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'sheet-001',
              date: '2026-10-26T00:00:00.000Z',
              sessionName: 'Morning Clinic',
              doctorId: 'doc-001',
              doctor: {
                id: 'doc-001',
                fullName: 'Dr. Sunil Perera',
                specialty: 'General Practitioner',
                phone: '0771234567',
                email: 'sunil@amaz.lk',
                bankName: 'Bank of Ceylon',
                bankAccountNumber: '8910293847'
              },
              totalPatients: 8,
              consultationFee: 2000,
              totalRevenue: 16000,
              commissionRate: 20,
              commissionType: 'PERCENTAGE',
              hospitalCommission: 3200,
              doctorPayment: 12800,
              netDoctorPayment: 12800,
              otherAdjustments: 0,
              cashRevenue: 12000,
              cardRevenue: 4000,
              cashDoctorShare: 9600,
              bankDoctorShare: 3200,
              cashDisbursed: 9600,
              bankDisbursed: 3200,
              disbursedByRole: 'RECEPTIONIST',
              status: 'PAID',
              paymentMethod: 'CASH_DRAWER',
              paymentReference: 'VOUCH-20261026-001',
              paidAt: '2026-10-26T10:30:00.000Z',
              receiptNumber: 'DOC-REC-20261026',
              remarks: 'Settled from counter drawer',
              patientItems: [
                {
                  id: 'item-1',
                  patientName: 'Kavindu Silva',
                  tokenNumber: '01',
                  consultationFee: 2000,
                  doctorShare: 1600,
                  collectionMethod: 'CASH'
                },
                {
                  id: 'item-2',
                  patientName: 'Nimasha Fernando',
                  tokenNumber: '02',
                  consultationFee: 2000,
                  doctorShare: 1600,
                  collectionMethod: 'CARD'
                }
              ]
            }
          ]
        })
      });
    });
  });

  test('verifies doctor share receipt voucher renders in 80mm thermal format with all critical sections', async ({ page }) => {
    await page.goto('/frontdesk/doctor-share');

    // 1. Check that doctor shares table loads and displays the record
    const doctorRow = page.locator('text=Dr. Sunil Perera').first();
    await expect(doctorRow).toBeVisible();

    // 2. Click the Print Official Voucher button
    const printBtn = page.locator('button[title="Print Official Voucher"]').first();
    await expect(printBtn).toBeVisible();
    await printBtn.click();

    // 3. Inspect the rendered thermal receipt template
    const receipt = page.locator('[data-testid="doctor-payment-receipt-80mm"]');
    await expect(receipt).toBeAttached();

    // 4. Assert 80mm container width class (w-[290px])
    await expect(receipt).toHaveClass(/w-\[290px\]/);

    const textContent = await receipt.innerText();
    const innerHtml = await receipt.innerHTML();

    // 5. Assert header details
    expect(textContent).toContain('AMAZ HOSPITAL');
    expect(textContent).toContain('DOCTOR PAYMENT VOUCHER');
    expect(textContent).toContain('PAID');

    // 6. Assert doctor and clinic metadata
    expect(textContent).toContain('Dr. Sunil Perera');
    expect(textContent).toContain('General Practitioner');
    expect(textContent).toContain('DOC-REC-20261026');
    expect(textContent).toContain('Morning Clinic');

    // 7. Assert financial breakdown numbers
    expect(textContent).toContain('8 Patients');
    expect(textContent).toContain('16,000.00'); // Gross revenue
    expect(textContent).toContain('3,200.00');  // Hospital share
    expect(textContent).toContain('12,800.00'); // Net Doctor Disbursement

    // 8. Assert patient roster itemization
    expect(textContent).toContain('Kavindu Silva');
    expect(textContent).toContain('T-01');
    expect(textContent).toContain('Nimasha Fernando');
    expect(textContent).toContain('T-02');

    // 9. Assert barcode and dual signatures
    expect(innerHtml).toContain('<svg');
    expect(textContent).toContain('Disbursed By');
    expect(textContent).toContain('Doctor Acknowledged');

    // 10. Assert A4 print styles are removed and replaced with thermal roll styles
    expect(innerHtml).not.toContain('A4 portrait');
    expect(innerHtml).toContain('size: auto');
    expect(innerHtml).toContain('margin: 1.5mm 2mm 6mm 2mm');
  });
});
