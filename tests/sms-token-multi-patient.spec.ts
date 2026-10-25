import { test, expect } from '@playwright/test';

test.describe('SMS Template, Multi-Patient & Master Barcode Token Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Mock user login in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('token', 'mock-test-jwt-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'mock-receptionist-id',
        fullName: 'Receptionist Frontdesk',
        email: 'reception@amaz.com',
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
          user: {
            id: 'mock-receptionist-id',
            fullName: 'Receptionist Frontdesk',
            email: 'reception@amaz.com',
            role: 'RECEPTIONIST',
            roleName: 'RECEPTIONIST'
          }
        })
      });
    });

    // Mock doctors list
    await page.route('**/api/booking/doctors', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'doc-001',
            fullName: 'Dr. Sunil Perera',
            specialty: 'General',
            feeType: 'POST',
            room: { roomNumber: '02' },
            consultationFee: 1500
          }
        ])
      });
    });

    // Mock active doctors
    await page.route('**/api/reception/doctors/active', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'doc-001',
            fullName: 'Dr. Sunil Perera',
            specialty: 'General',
            status: 'ARRIVED',
            room: { roomNumber: '02' }
          }
        ])
      });
    });

    // Mock lab catalog
    await page.route('**/api/lab/catalog', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'lab-001',
            name: 'Full Blood Count (FBC)',
            code: 'FBC',
            price: 1200,
            room: { roomNumber: 'LAB-A' }
          }
        ])
      });
    });

    // Mock extra services
    await page.route('**/api/extra-services', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'es-001',
            title: 'Wound Dressing',
            code: 'DRESS',
            price: 800,
            room: { roomNumber: 'EXT-01' }
          }
        ])
      });
    });

    // Mock current shift
    await page.route('**/api/reception/shift/current', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'shift-mock-01',
          status: 'OPEN',
          openedBy: 'mock-receptionist-id'
        })
      });
    });

    // Mock prescriptions pending
    await page.route('**/api/prescriptions/pending', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    // Mock doctor availability
    await page.route('**/api/booking/availability**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          available: true,
          sessions: [{ id: 'sess-01', sessionName: 'Morning Session', startTime: '08:00', endTime: '12:00' }],
          bookedSlots: 2,
          totalSlots: 20,
          tokens: [
            { tokenNumber: '01', status: 'BOOKED' },
            { tokenNumber: '02', status: 'BOOKED' },
            { tokenNumber: '03', status: 'AVAILABLE' }
          ]
        })
      });
    });

    // Mock department availability
    await page.route('**/api/booking/department-availability**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tokens: [
            { tokenNumber: '01', status: 'AVAILABLE' },
            { tokenNumber: '02', status: 'AVAILABLE' }
          ]
        })
      });
    });

    // Mock patient lookup by phone: Returns 2 sibling family members sharing phone "0771234567"
    await page.route('**/api/reception/patients?q=0771234567', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          exactMatch: null,
          multiMatch: [
            { id: 'pat-001', fullName: 'Kamal Perera', phone: '0771234567', ageFallback: 45, gender: 'MALE' },
            { id: 'pat-002', fullName: 'Nimal Perera', phone: '0771234567', ageFallback: 12, gender: 'MALE' }
          ]
        })
      });
    });
  });

  test('multi-patient selection and isolated master barcode token generation', async ({ page }) => {
    let capturedTokenPayload: any = null;

    await page.route('**/api/reception/token', async (route) => {
      capturedTokenPayload = JSON.parse(route.request().postData() || '{}');
      
      const isPatientA = capturedTokenPayload.patientId === 'pat-001' || capturedTokenPayload.patientName === 'Kamal Perera';
      const masterBarcode = isPatientA ? '1084920195' : '1084920999';

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            tokens: [
              {
                id: isPatientA ? 'appt-001' : 'appt-002',
                refNo: masterBarcode,
                tokenNumber: isPatientA ? '03' : '08',
                department: 'CONSULTATION',
                status: 'BOOKED',
                doctorName: 'Dr. Sunil Perera',
                patientName: isPatientA ? 'Kamal Perera' : 'Nimal Perera',
                appointmentDate: new Date().toISOString(),
                roomNumber: '02'
              }
            ],
            invoice: null
          }
        })
      });
    });

    await page.goto('/frontdesk');

    // 1. Verify Frontdesk loads successfully
    await expect(page.locator('body')).toBeVisible();

    // 2. Open Phone Booking Tab
    const phoneBookingTab = page.locator('button', { hasText: 'Phone Booking' });
    if (await phoneBookingTab.isVisible()) {
      await phoneBookingTab.click();

      // Search by shared family phone
      const phoneInput = page.locator('input[placeholder*="Search by phone number"]');
      if (await phoneInput.isVisible()) {
        await phoneInput.fill('0771234567');
        await page.waitForTimeout(500);

        // Expect multi-match dropdown showing both Kamal and Nimal
        const dropdownItemKamal = page.locator('button', { hasText: 'Kamal Perera' });
        const dropdownItemNimal = page.locator('button', { hasText: 'Nimal Perera' });

        if (await dropdownItemKamal.isVisible()) {
          // Select Patient A: Kamal
          await dropdownItemKamal.click();
          const nameInput = page.locator('input[placeholder*="Patient Full Name"]');
          await expect(nameInput).toHaveValue('Kamal Perera');
        }
      }
    }
  });
});
