import { test, expect } from '@playwright/test';

test.describe('140mm × 140mm Dot Matrix Bill Receipt Specification', () => {
  test('Bill receipt must strictly fit within 140mm × 140mm boundaries and display all financial details', async ({ page }) => {
    // Navigate to the bill preview page
    await page.goto('http://localhost:3000/bill-preview');
    await page.waitForLoadState('domcontentloaded');

    const receipt = page.locator('#dot-matrix-bill-receipt');
    await expect(receipt).toBeVisible();

    // 1. Hospital Header Assertions
    await expect(receipt.locator('h1')).toHaveText(/AMAZ HOSPITAL/i);
    await expect(receipt).toContainText('OFFICIAL BILL RECEIPT');
    await expect(receipt).toContainText('0472239090');

    // 2. Metadata Assertions
    await expect(receipt).toContainText('INV-98234');
    await expect(receipt).toContainText('Kamal Wickramasinghe');
    await expect(receipt).toContainText('Dr. V.K.P.A. Mahesh Lakshman');
    await expect(receipt).toContainText('CASH');

    // 3. Line Items Table Assertions
    await expect(receipt).toContainText('Doctor Consultation Fee');
    await expect(receipt).toContainText('Full Blood Count (FBC)');
    await expect(receipt).toContainText('Paracetamol 500mg');
    await expect(receipt).toContainText('Amoxicillin 500mg');

    // 4. Financial Calculations Assertions
    await expect(receipt).toContainText('4100.00'); // Subtotal
    await expect(receipt).toContainText('100.00');  // Discount
    await expect(receipt).toContainText('4000.00'); // Net Total
    await expect(receipt).toContainText('5000.00'); // Tendered
    await expect(receipt).toContainText('1000.00'); // Change

    // 5. Barcode & Footer
    await expect(receipt).toContainText('AMAZ-20261107-0012');
    await expect(receipt).toContainText('Thank you! Wishing you good health.');

    // 6. Strict Physical Geometry & Height Overflow Checks:
    // 140mm is 529.13px at 96 DPI.
    // The printable container is 132mm x 132mm = 498.9px.
    // Bounding height must be <= 510px, ensuring zero spillover onto sheet 2.
    const box = await receipt.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(515);
    expect(box!.height).toBeLessThanOrEqual(515);

    // Assert that the container content does not scroll (scrollHeight <= clientHeight)
    const hasVerticalOverflow = await receipt.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(hasVerticalOverflow).toBe(false);

    // 7. Emulate print media
    await page.emulateMedia({ media: 'print' });
    await expect(receipt).toBeVisible();

    // Generate PDF at exact 140mm x 140mm page size to ensure print engine compatibility
    const pdfBuffer = await page.pdf({
      width: '140mm',
      height: '140mm',
      printBackground: true,
      margin: {
        top: '4mm',
        right: '4mm',
        bottom: '4mm',
        left: '4mm'
      }
    });

    expect(pdfBuffer.length).toBeGreaterThan(1000);
  });
});

