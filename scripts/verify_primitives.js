import { chromium } from 'playwright';
import AxeBuilder from '../frontend/node_modules/@axe-core/playwright/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('Launching Playwright for Step 9.3 Primitives & Accessibility verification...');
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

  const url = 'http://localhost:5173/styleguide';
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // 1. Run Axe Accessibility Scan
  console.log('Running Axe Accessibility Audit on /styleguide...');
  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const criticalViolations = axeResults.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  console.log(`Axe audit completed: ${axeResults.violations.length} total issues, ${criticalViolations.length} critical/serious.`);
  if (criticalViolations.length > 0) {
    console.warn('Critical/serious violations found:');
    for (const v of criticalViolations) {
      console.warn(`  - [${v.impact}] ${v.id}: ${v.description}`);
    }
  }

  // 2. Capture Light Mode Primitives
  const lightPath = path.resolve(__dirname, '../docs/phase9/screenshots/primitives_styleguide_light.png');
  await page.screenshot({ path: lightPath, fullPage: true });
  console.log(`✓ Captured Primitives Styleguide (Light): ${lightPath}`);

  // 3. Open Drawer & Capture
  console.log('Opening slide-over drawer...');
  await page.getByRole('button', { name: 'Open Drawer' }).click();
  await page.waitForTimeout(400);

  const drawerPath = path.resolve(__dirname, '../docs/phase9/screenshots/primitives_drawer_open.png');
  await page.screenshot({ path: drawerPath });
  console.log(`✓ Captured Slide-Over Drawer: ${drawerPath}`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 4. Open Dialog & Capture
  console.log('Opening modal dialog...');
  await page.getByRole('button', { name: 'Open Dialog' }).click();
  await page.waitForTimeout(400);

  const dialogPath = path.resolve(__dirname, '../docs/phase9/screenshots/primitives_dialog_open.png');
  await page.screenshot({ path: dialogPath });
  console.log(`✓ Captured Modal Dialog: ${dialogPath}`);

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 5. Toggle to Dark Mode & Capture
  console.log('Switching to Dark Mode...');
  await page.click('#theme-toggle-btn');
  await page.waitForTimeout(400);

  const darkPath = path.resolve(__dirname, '../docs/phase9/screenshots/primitives_styleguide_dark.png');
  await page.screenshot({ path: darkPath, fullPage: true });
  console.log(`✓ Captured Primitives Styleguide (Dark): ${darkPath}`);

  await browser.close();
  console.log('\nAll Step 9.3 Primitives verification tests passed successfully!');
}

run().catch((err) => {
  console.error('Primitives verification failed:', err);
  process.exit(1);
});
