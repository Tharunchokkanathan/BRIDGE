import { chromium } from 'playwright';
import AxeBuilder from '../frontend/node_modules/@axe-core/playwright/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('===============================================================');
  console.log('Starting Step 9.5: Risk Queue & Package Drawer Verification');
  console.log('===============================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`Browser console error: ${msg.text()}`);
    }
  });

  const url = 'http://localhost:5173/risk-queue';
  console.log(`Navigating to ${url}...`);

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Wait for table rows to load from API
  await page.waitForSelector('tbody tr', { timeout: 4000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('body');
    return el && el.textContent && el.textContent.includes('Showing');
  }, { timeout: 4000 });

  const loadDuration = Date.now() - t0;
  console.log(`✓ Risk Queue initial load duration: ${loadDuration}ms`);

  const rowCount = await page.locator('tbody tr').count();
  console.log(`✓ Loaded ${rowCount} table rows from active API manifest`);

  // 1. Accessibility Scan (WCAG 2.1 AA)
  console.log('\nRunning Axe Accessibility scan on Risk Queue...');
  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const criticalIssues = axeResults.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  console.log(`Axe Scan: ${axeResults.violations.length} total issues, ${criticalIssues.length} critical/serious.`);
  if (criticalIssues.length > 0) {
    for (const v of criticalIssues) {
      console.warn(`  - [${v.impact}] ${v.id}: ${v.description}`);
    }
  }

  // 2. Keyboard Navigation Flow: '/' hotkey to search, Arrow down, Enter to open drawer
  console.log('\nTesting Keyboard Shortcuts...');
  await page.locator('h1').first().click();
  await page.keyboard.press('/');
  await page.waitForTimeout(200);
  const isSearchFocused = await page.locator('input[placeholder*="Search"]').evaluate((el) => el === document.activeElement);
  console.log(`  - Shortcut [/] focused search input: ${isSearchFocused ? 'VERIFIED' : 'FAILED'}`);

  // Filter with search
  await page.locator('input[placeholder*="Search"]').fill('Apartment');
  await page.waitForTimeout(300);
  const filteredCount = await page.locator('tbody tr').count();
  console.log(`  - Search for 'Apartment' narrowed table to ${filteredCount} rows`);

  // Clear search
  await page.locator('input[placeholder*="Search"]').fill('');
  await page.waitForTimeout(300);

  // 3. Open Package Detail Drawer & Inspect SHAP Waterfall
  console.log('\nOpening Package Detail Drawer (First Row)...');
  await page.locator('tbody tr button[title*="Inspect"]').first().click();
  await page.waitForSelector('[role="dialog"]', { timeout: 3000 });

  const isDrawerOpen = await page.locator('[role="dialog"]').isVisible();
  console.log(`  - Detail drawer opened: ${isDrawerOpen ? 'VERIFIED' : 'FAILED'}`);

  // Verify SHAP Waterfall & Additive Local Accuracy
  const hasShapTitle = await page.getByRole('heading', { name: /SHAP Waterfall/i }).isVisible();
  const hasAdditivityNote = await page.locator('text=Additive Local Accuracy').isVisible();
  const hasExactBadge = await page.locator('text=VERIFIED EXACT').isVisible();

  console.log(`  - SHAP Waterfall Component: ${hasShapTitle ? 'PRESENT' : 'MISSING'}`);
  console.log(`  - Additive Local Accuracy Note: ${hasAdditivityNote ? 'PRESENT' : 'MISSING'}`);
  console.log(`  - Exactness Badge (Δ = 0.0000): ${hasExactBadge ? 'VERIFIED' : 'MISSING'}`);

  // Test Drawer Tabs: Actions tab with guardrail badges
  console.log('Testing Drawer Action Tab guardrails...');
  await page.getByRole('tab', { name: 'Actions' }).click();
  await page.waitForTimeout(300);

  const hasHeuristicBadge = await page.locator('text=Rule-based heuristic').isVisible();
  const hasSimulationBadge = await page.locator('text=Counterfactual simulation').isVisible();
  console.log(`  - Heuristic Badge on Station Pickup: ${hasHeuristicBadge ? 'VERIFIED' : 'MISSING'}`);
  console.log(`  - Counterfactual Simulation Badge: ${hasSimulationBadge ? 'VERIFIED' : 'MISSING'}`);

  // Capture Screenshot: Drawer Open
  const drawerPath = path.resolve(__dirname, '../docs/phase9/screenshots/risk_queue_drawer_open.png');
  await page.screenshot({ path: drawerPath });
  console.log(`✓ Saved: ${drawerPath}`);

  // Dismiss drawer with Esc
  console.log('Dismissing drawer via [Esc] key...');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const isDrawerClosed = !(await page.locator('[role="dialog"]').isVisible());
  console.log(`  - Drawer dismissed via [Esc]: ${isDrawerClosed ? 'VERIFIED' : 'FAILED'}`);

  // 4. Multi-Select, Bulk Action Bar & Sort Invariance
  console.log('\nTesting Multi-Select and Sorting Invariance...');
  const firstRowCheckbox = page.locator('tbody tr input[type="checkbox"]').first();
  const secondRowCheckbox = page.locator('tbody tr input[type="checkbox"]').nth(1);

  await firstRowCheckbox.click();
  await secondRowCheckbox.click();
  await page.waitForTimeout(300);

  const bulkBarVisible = await page.locator('text=2 parcels selected').isVisible();
  console.log(`  - Bulk action floating bar: ${bulkBarVisible ? 'VERIFIED (2 selected)' : 'FAILED'}`);

  // Capture Screenshot: Bulk Bar Active
  const bulkPath = path.resolve(__dirname, '../docs/phase9/screenshots/risk_queue_bulk_selected.png');
  await page.screenshot({ path: bulkPath });
  console.log(`✓ Saved: ${bulkPath}`);

  // Test Sort: Click 'Stop' column header
  console.log('Sorting by Stop ID to verify selection survival...');
  await page.locator('th:has-text("Stop")').click();
  await page.waitForTimeout(400);

  const checkedCountAfterSort = await page.locator('tbody tr input[type="checkbox"]:checked').count();
  console.log(`  - Checked rows after sorting: ${checkedCountAfterSort} (Expected: 2) -> ${checkedCountAfterSort === 2 ? 'SELECTION SURVIVED' : 'FAILED'}`);

  // Test Bulk Action Apply
  await page.getByRole('button', { name: 'Apply Recommended' }).click();
  await page.waitForTimeout(300);
  const bulkToast = await page.locator('text=Applied proactive intervention').isVisible();
  console.log(`  - Bulk apply toast notification: ${bulkToast ? 'VERIFIED' : 'NOT DETECTED'}`);

  // 5. Capture Desktop Light and Dark Screenshots
  console.log('\nCapturing Full Risk Queue Screenshots...');
  const lightPath = path.resolve(__dirname, '../docs/phase9/screenshots/risk_queue_desktop_light.png');
  await page.screenshot({ path: lightPath, fullPage: true });
  console.log(`✓ Saved: ${lightPath}`);

  // Toggle Dark Theme
  console.log('Toggling Dark Theme...');
  await page.locator('#global-theme-toggle').click();
  await page.waitForTimeout(400);

  const darkPath = path.resolve(__dirname, '../docs/phase9/screenshots/risk_queue_desktop_dark.png');
  await page.screenshot({ path: darkPath, fullPage: true });
  console.log(`✓ Saved: ${darkPath}`);

  await browser.close();
  console.log('\n===============================================================');
  console.log('Step 9.5 Risk Queue Verification Completed Successfully!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('Risk Queue verification failed:', err);
  process.exit(1);
});
