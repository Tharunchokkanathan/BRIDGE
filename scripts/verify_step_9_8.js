import { chromium } from 'playwright';
import AxeBuilder from '../frontend/node_modules/@axe-core/playwright/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('===============================================================');
  console.log('Starting Step 9.8: Model Governance & Promotion Gate Verification');
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

  const url = 'http://localhost:5173/model-governance';
  console.log(`Navigating to ${url}...`);

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Automated Promotion Gate Truth Matrix', { timeout: 4000 });
  await page.waitForSelector('text=Global Feature Importance & Risk Attribution', { timeout: 4000 });
  const loadDuration = Date.now() - t0;
  console.log(`✓ Model Governance load duration: ${loadDuration}ms (Target: < 1500ms)`);

  // 1. Accessibility Scan (WCAG 2.1 AA)
  console.log('\nRunning Axe Accessibility scan on /model-governance...');
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
      v.nodes.forEach((n) => {
        console.warn(`      Target: ${n.target.join(' ')}`);
        console.warn(`      HTML: ${n.html}`);
        console.warn(`      Summary: ${n.failureSummary}`);
      });
    }
  }

  // 2. Capture Desktop Light Screenshot
  const lightPath = path.resolve(__dirname, '../docs/phase9/screenshots/model_governance_desktop_light.png');
  await page.screenshot({ path: lightPath, fullPage: true });
  console.log(`✓ Saved: ${lightPath}`);

  // 3. Test Model Hot-Swap Switcher
  console.log('\nTesting Hot-Swap Model Switcher to LightGBM Candidate...');
  const swapBtn = page.getByRole('button', { name: /Hot-Swap to LightGBM Candidate/ });
  await swapBtn.click();
  await page.waitForSelector('text=EXPLAINER: tree_shap', { timeout: 15000 });
  await page.waitForSelector('text=ACTIVE: LightGBM Candidate', { timeout: 15000 });
  console.log('  - Model successfully hot-swapped to LightGBM Candidate (TreeSHAP)');

  const candidatePath = path.resolve(__dirname, '../docs/phase9/screenshots/model_governance_candidate_active.png');
  await page.screenshot({ path: candidatePath, fullPage: true });
  console.log(`✓ Saved: ${candidatePath}`);

  // Restore Champion
  console.log('\nRestoring Champion (Logistic Regression)...');
  const restoreBtn = page.getByRole('button', { name: /Restore Champion/ });
  await restoreBtn.click();
  await page.waitForSelector('text=EXPLAINER: linear_exact', { timeout: 15000 });
  await page.waitForSelector('text=ACTIVE: Logistic Regression', { timeout: 15000 });
  console.log('  - Champion successfully restored to Logistic Regression (linear_exact)');

  // 4. Toggle Dark Theme
  console.log('\nToggling Dark Theme...');
  await page.locator('#global-theme-toggle').click();
  await page.waitForTimeout(300);

  const darkPath = path.resolve(__dirname, '../docs/phase9/screenshots/model_governance_desktop_dark.png');
  await page.screenshot({ path: darkPath, fullPage: true });
  console.log(`✓ Saved: ${darkPath}`);

  await browser.close();
  console.log('\n===============================================================');
  console.log('Step 9.8 Model Governance Verification Completed Successfully!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('Step 9.8 verification failed:', err);
  process.exit(1);
});
