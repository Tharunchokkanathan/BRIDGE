import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2, // HiDPI crisp screenshots
  });

  const page = await context.newPage();
  const url = 'http://localhost:5173/styleguide';
  console.log(`Navigating to ${url}...`);

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const lightPath = path.resolve(__dirname, '../docs/phase9/screenshots/styleguide_light.png');
  await page.screenshot({ path: lightPath, fullPage: true });
  console.log(`Captured Light Mode: ${lightPath}`);

  // Toggle theme to dark
  console.log('Clicking theme toggle...');
  await page.click('#theme-toggle-btn');
  await page.waitForTimeout(500);

  const darkPath = path.resolve(__dirname, '../docs/phase9/screenshots/styleguide_dark.png');
  await page.screenshot({ path: darkPath, fullPage: true });
  console.log(`Captured Dark Mode: ${darkPath}`);

  await browser.close();
  console.log('Done!');
}

capture().catch((err) => {
  console.error('Capture failed:', err);
  process.exit(1);
});
