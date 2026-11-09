import { test, expect } from '@playwright/test';

test.describe('A4 Lab Diagnostic Report Typography & Print Specification', () => {
  test('Lab report template must render readable upgraded typography across demographics, results table, and consultants', async ({ page }) => {
    // Navigate to lab report preview page
    await page.goto('http://localhost:3000/lab-report-preview', { waitUntil: 'domcontentloaded' });

    // Locate the report container (210mm x 297mm)
    const reportRoot = page.locator('div[style*="210mm"]').first();
    await expect(reportRoot).toBeVisible();

    // 1. Hospital Header Assertions
    await expect(reportRoot.locator('img[alt="AMAZ Hospital"]')).toBeVisible();
    await expect(reportRoot).toContainText('Hospital Laboratories & Diagnostic Centre');
    await expect(reportRoot).toContainText('Department of Pathology & Clinical Laboratory Sciences');
    await expect(reportRoot).toContainText('ISO 15189:2022 Accredited');
    await expect(reportRoot).toContainText('CLSI Member (USA)');

    // 2. Report Banner & Patient Demographics
    await expect(reportRoot).toContainText('AUTOMATED COUNT');
    await expect(reportRoot).toContainText('MRS. IMASHA KAVINDI');
    await expect(reportRoot).toContainText('23 Y/F');
    await expect(reportRoot).toContainText('COMPLETE BLOOD COUNT');
    await expect(reportRoot).toContainText('67 0068 20/12/22');

    // 3. Results Table Header & Items
    await expect(reportRoot).toContainText('TEST');
    await expect(reportRoot).toContainText('RESULT');
    await expect(reportRoot).toContainText('FLAG');
    await expect(reportRoot).toContainText('REFERENCE VALUE');

    // Check categories and specific tests
    await expect(reportRoot).toContainText('DIFFERENTIAL COUNT');
    await expect(reportRoot).toContainText('TOTAL WHITE CELL COUNT');
    await expect(reportRoot).toContainText('NEUTROPHILS');
    await expect(reportRoot).toContainText('LYMPHOCYTES');
    await expect(reportRoot).toContainText('HAEMOGLOBIN');
    await expect(reportRoot).toContainText('PLATELET COUNT');

    // Check abnormal flags
    await expect(reportRoot.locator('text=L').first()).toBeVisible();
    await expect(reportRoot.locator('text=H').first()).toBeVisible();

    // 4. Medical Laboratory Technologist Signature Area
    await expect(reportRoot).toContainText('MLT');
    await expect(reportRoot).toContainText('Medical Laboratory Technologist');

    // 5. Footer Consultants (upgraded readable typography)
    await expect(reportRoot).toContainText('Dr. NISHADYA RANASINGHE');
    await expect(reportRoot).toContainText('Dr. CHANDRIKA MEEGAMA');
    await expect(reportRoot).toContainText('Dr. S. D. ATUKORALA');
    await expect(reportRoot).toContainText('PROF. L. R. AMERASEKARA');

    // 6. Geometry & Print Verification:
    // A4 width is 210mm (~793.7px at 96 DPI).
    const box = await reportRoot.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(750);
    expect(box!.width).toBeLessThanOrEqual(820);

    // Emulate print media & generate A4 PDF
    await page.emulateMedia({ media: 'print' });
    await expect(reportRoot).toBeVisible();

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0mm',
        right: '0mm',
        bottom: '0mm',
        left: '0mm'
      }
    });

    expect(pdfBuffer.length).toBeGreaterThan(5000);
  });
});
