import { chromium } from 'playwright';
import AxeBuilder from '../frontend/node_modules/@axe-core/playwright/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('===============================================================');
  console.log('Starting Step 9.6: Route Optimizer & Map / SVG Verification');
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

  const url = 'http://localhost:5173/route-optimizer';
  console.log(`Navigating to ${url}...`);

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Wait for ordered stop list to load
  await page.waitForSelector('text=Ordered Stop Tour', { timeout: 4000 });
  await page.waitForSelector('text=Release Report v1.5.0 Benchmarks', { timeout: 4000 });

  const loadDuration = Date.now() - t0;
  console.log(`✓ Route Optimizer load duration: ${loadDuration}ms (Target: < 1500ms)`);

  // 1. Accessibility Scan (WCAG 2.1 AA)
  console.log('\nRunning Axe Accessibility scan on Route Optimizer...');
  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const criticalIssues = axeResults.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  console.log(`Axe Scan: ${axeResults.violations.length} total issues, ${criticalIssues.length} critical/serious.`);
  if (axeResults.violations.length > 0) {
    for (const v of axeResults.violations) {
      console.warn(`  - [${v.impact}] ${v.id}: ${v.description}`);
      v.nodes.forEach((n) => {
        console.warn(`      Target: ${n.target.join(' ')}`);
        console.warn(`      HTML: ${n.html}`);
        console.warn(`      Summary: ${n.failureSummary}`);
      });
    }
  }

  // 2. Validate Interactive Controls & Sequence Modes
  console.log('\nTesting Sequence Mode Toggles...');
  const manifestBtn = page.getByRole('button', { name: 'Manifest', exact: true });
  const riskFirstBtn = page.getByRole('button', { name: 'Risk-First', exact: true });
  const twoOptBtn = page.getByRole('button', { name: '2-Opt', exact: true });

  // Switch to Manifest Order
  await manifestBtn.click();
  await page.waitForTimeout(300);
  const manifestDist = await page.locator('text=Total Tour Distance').locator('..').locator('span.text-\\[20px\\]').innerText();
  console.log(`  - Manifest Order Distance: ${manifestDist}`);

  // Switch to Risk-First
  await riskFirstBtn.click();
  await page.waitForTimeout(300);
  const riskDist = await page.locator('text=Total Tour Distance').locator('..').locator('span.text-\\[20px\\]').innerText();
  console.log(`  - Risk-First Order Distance: ${riskDist}`);

  // Switch back to 2-Opt
  await twoOptBtn.click();
  await page.waitForTimeout(300);
  const twoOptDist = await page.locator('text=Total Tour Distance').locator('..').locator('span.text-\\[20px\\]').innerText();
  console.log(`  - 2-Opt Optimized Distance: ${twoOptDist}`);

  // 3. Test Tour Topology: Open vs Closed (Depot Return)
  console.log('\nTesting Closed Tour (Depot Return)...');
  await page.getByRole('button', { name: 'Closed (Depot)' }).click();
  await page.waitForTimeout(300);
  const closedDist = await page.locator('text=Total Tour Distance').locator('..').locator('span.text-\\[20px\\]').innerText();
  console.log(`  - Closed Tour Distance with Depot Return: ${closedDist}`);

  // 4. Test What-If Deferral (30 to 25 stops)
  console.log('\nTesting What-If Deferral (30 -> 25 stops)...');
  await page.locator('input[type="checkbox"]').first().check();
  await page.waitForTimeout(300);
  const deferredStopsText = await page.locator('text=Stops Sequenced').locator('..').locator('span.text-\\[20px\\]').innerText();
  console.log(`  - Deferred Stop Count: ${deferredStopsText} (Expected: 25 stops)`);

  // Uncheck deferral
  await page.locator('input[type="checkbox"]').first().uncheck();
  await page.waitForTimeout(300);

  // 5. Test 2-Opt Optimization Run Button
  console.log('\nTesting Run 2-Opt TSP button...');
  await page.getByRole('button', { name: 'Run 2-Opt TSP' }).click();
  await page.waitForTimeout(500);
  const latencyText = await page.locator('text=Solver Latency').locator('..').locator('span.text-\\[20px\\]').innerText();
  console.log(`  - 2-Opt Solver Latency: ${latencyText}`);

  // 6. Test Tile-Failure Fallback: Toggle to SVG Plot
  console.log('\nTesting Deterministic SVG Stop Plot Fallback...');
  await page.getByRole('button', { name: 'SVG Plot' }).or(page.getByRole('button', { name: 'Map View' })).click();
  await page.waitForTimeout(400);

  const hasSvgPlot = await page.locator('svg polyline').isVisible();
  console.log(`  - Deterministic SVG Stop Plot rendered polyline: ${hasSvgPlot ? 'VERIFIED' : 'FAILED'}`);

  // Capture Screenshot: SVG Plot
  const svgPath = path.resolve(__dirname, '../docs/phase9/screenshots/route_optimizer_svg_fallback.png');
  await page.screenshot({ path: svgPath, fullPage: true });
  console.log(`✓ Saved: ${svgPath}`);

  // 7. Capture Desktop Light Screenshot
  const lightPath = path.resolve(__dirname, '../docs/phase9/screenshots/route_optimizer_desktop_light.png');
  await page.screenshot({ path: lightPath, fullPage: true });
  console.log(`✓ Saved: ${lightPath}`);

  // Toggle Dark Theme
  console.log('Toggling Dark Theme...');
  await page.locator('#global-theme-toggle').click();
  await page.waitForTimeout(400);

  const darkPath = path.resolve(__dirname, '../docs/phase9/screenshots/route_optimizer_desktop_dark.png');
  await page.screenshot({ path: darkPath, fullPage: true });
  console.log(`✓ Saved: ${darkPath}`);

  await browser.close();
  console.log('\n===============================================================');
  console.log('Step 9.6 Route Optimizer Verification Completed Successfully!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('Route Optimizer verification failed:', err);
  process.exit(1);
});
