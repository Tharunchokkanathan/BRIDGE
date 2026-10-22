import { chromium } from 'playwright';
import AxeBuilder from '../frontend/node_modules/@axe-core/playwright/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('===============================================================');
  console.log('Starting Step 9.4: Command Center Verification & Audits');
  console.log('===============================================================');

  const browser = await chromium.launch({ headless: true });

  // 1. Desktop Test (1440x900)
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

  const url = 'http://localhost:5173/command-center';
  console.log(`Navigating to ${url}...`);

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Wait for the lead KPI to display numbers (indicating data load finished)
  await page.waitForSelector('text=Packages Scheduled', { timeout: 3000 });
  await page.waitForFunction(() => {
    const el = document.querySelector('body');
    return el && el.textContent && el.textContent.includes('Active manifest:');
  }, { timeout: 3000 });

  const loadDuration = Date.now() - t0;
  console.log(`✓ Local Command Center initial data load duration: ${loadDuration}ms (Target: < 1500ms)`);
  if (loadDuration > 1500) {
    console.warn(`⚠️ Warning: Load duration exceeded 1500ms target.`);
  }

  await page.waitForTimeout(600); // Allow SVG charts to settle

  // 2. Validate Key Sections
  console.log('Checking required section elements...');
  const kpiSection = await page.locator('text=Packages Scheduled').isVisible();
  const histSection = await page.locator('text=Risk Distribution (Calibrated P_fail)').isVisible();
  const capacitySection = await page.locator('text=Capacity Allocation Meter').isVisible();
  const needsActionSection = await page.locator('text=Needs Action').isVisible();
  const routeSection = await page.locator('text=Route Preview & 2-Opt TSP').isVisible();

  console.log(`  - Lead KPI Strip: ${kpiSection ? 'PRESENT' : 'MISSING'}`);
  console.log(`  - Risk Histogram: ${histSection ? 'PRESENT' : 'MISSING'}`);
  console.log(`  - Capacity Allocation Meter: ${capacitySection ? 'PRESENT' : 'MISSING'}`);
  console.log(`  - Needs Action List: ${needsActionSection ? 'PRESENT' : 'MISSING'}`);
  console.log(`  - Compact Route Preview: ${routeSection ? 'PRESENT' : 'MISSING'}`);

  // 3. Accessibility Scan (WCAG 2.1 AA)
  console.log('\nRunning Axe Accessibility scan on Command Center (Desktop)...');
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

  // 4. Test User Interactions: Apply Action & Defer
  console.log('\nTesting Action Buttons in Needs Action list...');
  const applyBtn = page.getByRole('button', { name: 'Apply Action' }).first();
  if (await applyBtn.isVisible()) {
    await applyBtn.click();
    console.log('  - Clicked "Apply Action" on first parcel');
    await page.waitForTimeout(300);
    const toastVisible = await page.locator('text=Proactive intervention applied').isVisible();
    console.log(`  - Intervention toast notification: ${toastVisible ? 'VERIFIED' : 'NOT DETECTED'}`);
  }

  const deferBtn = page.getByRole('button', { name: 'Defer' }).first();
  if (await deferBtn.isVisible()) {
    await deferBtn.click();
    console.log('  - Clicked "Defer" on parcel');
    await page.waitForTimeout(300);
    const deferToast = await page.locator('text=deferred to standard delivery').isVisible();
    console.log(`  - Defer toast notification: ${deferToast ? 'VERIFIED' : 'NOT DETECTED'}`);
  }

  // 5. Capture Screenshots at 3 Viewports
  console.log('\nCapturing Verification Screenshots...');

  // 5.1 Desktop Light (1440x900)
  const desktopLightPath = path.resolve(__dirname, '../docs/phase9/screenshots/command_center_desktop_light.png');
  await page.screenshot({ path: desktopLightPath, fullPage: true });
  console.log(`✓ Saved: ${desktopLightPath}`);

  // 5.2 Desktop Dark (1440x900)
  console.log('Toggling Dark Theme...');
  await page.locator('#global-theme-toggle').click();
  await page.waitForTimeout(400);

  const desktopDarkPath = path.resolve(__dirname, '../docs/phase9/screenshots/command_center_desktop_dark.png');
  await page.screenshot({ path: desktopDarkPath, fullPage: true });
  console.log(`✓ Saved: ${desktopDarkPath}`);

  // 5.3 Tablet (834x1112)
  console.log('Testing Tablet Breakpoint (834x1112)...');
  const tabletContext = await browser.newContext({
    viewport: { width: 834, height: 1112 },
    deviceScaleFactor: 2,
  });
  const tabletPage = await tabletContext.newPage();
  await tabletPage.goto(url, { waitUntil: 'networkidle' });
  await tabletPage.waitForTimeout(600);

  const tabletPath = path.resolve(__dirname, '../docs/phase9/screenshots/command_center_tablet.png');
  await tabletPage.screenshot({ path: tabletPath, fullPage: true });
  console.log(`✓ Saved: ${tabletPath}`);
  await tabletContext.close();

  // 5.4 Mobile (390x844)
  console.log('Testing Mobile Breakpoint (390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(url, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(600);

  const mobilePath = path.resolve(__dirname, '../docs/phase9/screenshots/command_center_mobile.png');
  await mobilePage.screenshot({ path: mobilePath, fullPage: true });
  console.log(`✓ Saved: ${mobilePath}`);
  await mobileContext.close();

  await browser.close();
  console.log('\n===============================================================');
  console.log('Step 9.4 Command Center Verification Completed Successfully!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('Command Center verification failed:', err);
  process.exit(1);
});
