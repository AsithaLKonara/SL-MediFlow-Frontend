# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rooms.spec.ts >> Room Management e2e >> should create a new room in superadmin and see it in frontdesk
- Location: tests/rooms.spec.ts:4:7

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: page.waitForURL: Test timeout of 60000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/superadmin**" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - img "Hospital Background" [ref=e4]
      - generic [ref=e7]:
        - img "AMAZ Hospital Logo" [ref=e10]
        - heading "Elevate your healthcare experience." [level=1] [ref=e11]
        - paragraph [ref=e12]: AMAZ Hospital is the leading platform for seamless, premium, and AI-powered healthcare workflows.
    - generic [ref=e15]:
      - link "Back to home" [ref=e16] [cursor=pointer]:
        - /url: /
      - generic [ref=e19]:
        - heading "Welcome Back" [level=2] [ref=e20]
        - paragraph [ref=e21]: Enter your credentials to access your workspace
      - paragraph [ref=e25]: Failed to fetch
      - generic [ref=e26]:
        - generic [ref=e27]:
          - generic [ref=e28]: Email Address
          - textbox "Email Address" [ref=e33]:
            - /placeholder: name@example.com
            - text: admin@amaz.com
        - generic [ref=e34]:
          - generic [ref=e35]:
            - generic [ref=e36]: Password
            - link "Forgot password?" [ref=e37] [cursor=pointer]:
              - /url: /forgot-password
          - generic [ref=e38]:
            - textbox "Password" [ref=e42]:
              - /placeholder: ••••••••••••
              - text: password123
            - button "Show password" [ref=e43]
        - generic [ref=e47]:
          - checkbox "Stay signed in for 30 days" [ref=e48]
          - checkbox [aria-hidden] [ref=e49]
          - generic [ref=e50] [cursor=pointer]: Stay signed in for 30 days
        - button "Sign In" [ref=e51]
      - paragraph [ref=e52]: © 2026 AMAZ Hospital. All rights reserved.
  - region "Notifications alt+T"
  - generic [ref=e57] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=e58]
    - generic [ref=e62]:
      - button "Open issues overlay" [ref=e63]:
        - generic [ref=e64]:
          - generic [aria-hidden] [ref=e65]: "0"
          - generic [ref=e66]: "1"
        - generic [ref=e67]: Issue
      - button "Collapse issues badge" [ref=e68]
  - alert [ref=e71]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Room Management e2e', () => {
  4  |   test('should create a new room in superadmin and see it in frontdesk', async ({ page, context }) => {
  5  |     // We will simulate logging in by setting a dummy token or assuming auth is bypassed for tests.
  6  |     // Or we can perform an actual login if required.
  7  |     // Assuming the user's local dev server is running on localhost:3000
  8  | 
  9  |     await page.goto('http://localhost:3000/login');
  10 |     
  11 |     // Attempt basic login if a form exists
  12 |     await page.fill('input[type="email"]', 'admin@amaz.com');
  13 |     await page.fill('input[type="password"]', 'password123');
  14 |     await page.click('button[type="submit"]');
  15 | 
  16 |     // Wait for redirect to dashboard
> 17 |     await page.waitForURL('**/superadmin**');
     |                ^ Error: page.waitForURL: Test timeout of 60000ms exceeded.
  18 | 
  19 |     // Navigate to Room Management
  20 |     await page.goto('http://localhost:3000/superadmin/rooms');
  21 |     await expect(page.locator('h2')).toContainText('Room Management');
  22 | 
  23 |     // Create a new Room
  24 |     const uniqueRoomName = `TEST-ROOM-${Date.now()}`;
  25 |     await page.click('button:has-text("Add Room")');
  26 |     await page.fill('input[placeholder*="101"]', uniqueRoomName);
  27 |     await page.click('button:has-text("Save Room")');
  28 | 
  29 |     // Verify it appeared in the table
  30 |     await expect(page.locator(`text=${uniqueRoomName}`)).toBeVisible();
  31 | 
  32 |     // Now switch to frontdesk dashboard
  33 |     const frontdeskPage = await context.newPage();
  34 |     await frontdeskPage.goto('http://localhost:3000/frontdesk/rooms');
  35 | 
  36 |     // Verify it appeared on the frontdesk room matrix
  37 |     await expect(frontdeskPage.locator(`text=${uniqueRoomName}`)).toBeVisible();
  38 | 
  39 |     // Update status in superadmin to Maintenance
  40 |     await page.click(`tr:has-text("${uniqueRoomName}") button:has(.lucide-pencil)`);
  41 |     // Wait for dialog
  42 |     await page.click('[role="combobox"]:has-text("Available")');
  43 |     await page.click('[role="option"]:has-text("Maintenance")');
  44 |     await page.click('button:has-text("Save Room")');
  45 | 
  46 |     // Verify status updated locally
  47 |     await expect(page.locator(`tr:has-text("${uniqueRoomName}")`)).toContainText('Maintenance');
  48 | 
  49 |     // Verify WebSocket synced to frontdesk (should happen automatically without refresh)
  50 |     await expect(frontdeskPage.locator(`text=${uniqueRoomName}`).locator('..')).toContainText('MAINTENANCE', { timeout: 5000 });
  51 |   });
  52 | });
  53 | 
```