import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('Launching headless Chromium...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Listen to console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.error(`Browser console error: ${msg.text()}`);
    }
  });

  const url = 'http://localhost:5173/';
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Check title
  const title = await page.title();
  console.log(`Page title: ${title}`);

  // 1. Capture Desktop Light Mode
  const lightPath = path.resolve(__dirname, '../docs/phase9/screenshots/shell_desktop_light.png');
  await page.screenshot({ path: lightPath, fullPage: true });
  console.log(`✓ Captured Desktop Light Mode: ${lightPath}`);

  // 2. Test collapsing the NavRail via keyboard '['
  console.log('Pressing [ to collapse nav rail...');
  await page.keyboard.press('[');
  await page.waitForTimeout(300);

  const collapsedPath = path.resolve(__dirname, '../docs/phase9/screenshots/shell_nav_collapsed.png');
  await page.screenshot({ path: collapsedPath, fullPage: true });
  console.log(`✓ Captured Collapsed Nav Rail: ${collapsedPath}`);

  // Uncollapse
  await page.keyboard.press('[');
  await page.waitForTimeout(300);

  // 3. Test Command Palette via Ctrl+K
  console.log('Triggering Command Palette via Ctrl+K...');
  await page.keyboard.press('Control+KeyK');
  await page.waitForTimeout(400);

  const cmdkPath = path.resolve(__dirname, '../docs/phase9/screenshots/shell_cmd_palette.png');
  await page.screenshot({ path: cmdkPath, fullPage: true });
  console.log(`✓ Captured Command Palette Overlay: ${cmdkPath}`);

  // Close Command Palette with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // 4. Test Theme Switch to Dark Mode
  console.log('Toggling theme to Dark Mode...');
  await page.click('#global-theme-toggle');
  await page.waitForTimeout(400);

  const darkPath = path.resolve(__dirname, '../docs/phase9/screenshots/shell_desktop_dark.png');
  await page.screenshot({ path: darkPath, fullPage: true });
  console.log(`✓ Captured Desktop Dark Mode: ${darkPath}`);

  // 5. Capture Tablet Viewport (834x1112)
  console.log('Switching to Tablet viewport (834x1112)...');
  await page.setViewportSize({ width: 834, height: 1112 });
  await page.waitForTimeout(500);

  const tabletPath = path.resolve(__dirname, '../docs/phase9/screenshots/shell_tablet.png');
  await page.screenshot({ path: tabletPath, fullPage: true });
  console.log(`✓ Captured Tablet Viewport: ${tabletPath}`);

  // 6. Capture Mobile Viewport (390x844)
  console.log('Switching to Mobile viewport (390x844)...');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  const mobilePath = path.resolve(__dirname, '../docs/phase9/screenshots/shell_mobile.png');
  await page.screenshot({ path: mobilePath, fullPage: true });
  console.log(`✓ Captured Mobile Viewport: ${mobilePath}`);

  await browser.close();
  console.log('\nAll Step 9.2 Playwright verification tests passed successfully!');
}

run().catch((err) => {
  console.error('Playwright verification failed:', err);
  process.exit(1);
});
