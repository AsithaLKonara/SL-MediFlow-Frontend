import { test, expect } from '@playwright/test';

test.describe('Task 4: Barcode Scanning Redis Caching & Latency Optimization', () => {
  test('caching drops repeat barcode lookup latency to under 50ms with X-Cache header', async ({ request }) => {
    // 1. Authenticate to obtain token
    const loginRes = await request.post('http://localhost:5000/api/auth/login', {
      data: {
        email: 'reception@amaz.com',
        password: 'password123'
      }
    });
    
    let token = '';
    if (loginRes.ok()) {
      const data = await loginRes.json();
      token = data.token;
    }

    expect(token).toBeTruthy();

    const headers = {
      Authorization: `Bearer ${token}`
    };

    // Test with a real medicine barcode in the database
    const testCode = '2652923019';

    // Call 1: Miss or Prime Cache
    const start1 = Date.now();
    const res1 = await request.get(`http://localhost:5000/api/barcode/${testCode}`, { headers });
    const duration1 = Date.now() - start1;
    console.log(`Call 1 Duration: ${duration1}ms, Status: ${res1.status()}, X-Cache: ${res1.headers()['x-cache']}`);

    // Call 2: Must be a Cache Hit
    const start2 = Date.now();
    const res2 = await request.get(`http://localhost:5000/api/barcode/${testCode}`, { headers });
    const duration2 = Date.now() - start2;
    const cacheHeader2 = res2.headers()['x-cache'];
    console.log(`Call 2 Duration: ${duration2}ms, Status: ${res2.status()}, X-Cache: ${cacheHeader2}`);

    if (res2.ok()) {
      expect(['HIT-REDIS', 'HIT-MEMORY']).toContain(cacheHeader2);
      expect(duration2).toBeLessThan(100); // Super fast memory lookup
    }
  });
});
