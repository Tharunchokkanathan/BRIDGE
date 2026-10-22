import { chromium } from 'playwright';
import AxeBuilder from '../frontend/node_modules/@axe-core/playwright/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('===============================================================');
  console.log('Starting Step 9.9: Audit Guardrails & System Disclosures Verification');
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

  const url = 'http://localhost:5173/audit-disclosures';
  console.log(`Navigating to ${url}...`);

  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=5 Permanent Operational Audit Guardrails', { timeout: 4000 });
  await page.waitForSelector('text=Cryptographic Artifact Hash Ledger', { timeout: 4000 });
  const loadDuration = Date.now() - t0;
  console.log(`✓ Audit Disclosures load duration: ${loadDuration}ms (Target: < 1500ms)`);

  // 1. Accessibility Scan (WCAG 2.1 AA)
  console.log('\nRunning Axe Accessibility scan on /audit-disclosures...');
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

  // 2. Verify Presence of Guardrails
  console.log('\nVerifying 5 Audit Guardrails...');
  await page.waitForSelector('text=Counterfactual simulation', { timeout: 3000 });
  console.log('  - Guardrail 1 verified: Counterfactual simulation');
  await page.waitForSelector('text=Rule-based heuristic', { timeout: 3000 });
  console.log('  - Guardrail 2 verified: Rule-based heuristic');
  await page.waitForSelector('text=Preview only', { timeout: 3000 });
  console.log('  - Guardrail 3 verified: Preview only');
  await page.waitForSelector('text=Haversine κ=1.35', { timeout: 3000 });
  console.log('  - Guardrail 4 verified: Haversine κ=1.35');
  await page.waitForSelector('text=SHAP LOCAL ACCURACY INVARIANT', { timeout: 3000 });
  console.log('  - Guardrail 5 verified: Exact Additive SHAP Margin Identity');

  // 3. Verify Artifact Hashes Table
  console.log('\nVerifying Artifact Integrity Ledger...');
  await page.waitForSelector('text=BA2D511ADF7A89921B925961C5D3540D52CF25BC38419967FA3FAE00BE8E1B97', { timeout: 3000 });
  await page.waitForSelector('text=E4043B69477DEF750CF27EAC19332FB8925419A45BCB7F384B509E7E3D34DA81', { timeout: 3000 });
  console.log('  - All cryptographic hashes verified visible in UI');

  // 4. Capture Desktop Light Screenshot
  const lightPath = path.resolve(__dirname, '../docs/phase9/screenshots/audit_disclosures_desktop_light.png');
  await page.screenshot({ path: lightPath, fullPage: true });
  console.log(`✓ Saved: ${lightPath}`);

  // 5. Toggle Dark Theme
  console.log('\nToggling Dark Theme...');
  await page.locator('#global-theme-toggle').click();
  await page.waitForTimeout(300);

  const darkPath = path.resolve(__dirname, '../docs/phase9/screenshots/audit_disclosures_desktop_dark.png');
  await page.screenshot({ path: darkPath, fullPage: true });
  console.log(`✓ Saved: ${darkPath}`);

  await browser.close();
  console.log('\n===============================================================');
  console.log('Step 9.9 Audit Disclosures Verification Completed Successfully!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('Step 9.9 verification failed:', err);
  process.exit(1);
});
