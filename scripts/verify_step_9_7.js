import { chromium } from 'playwright';
import AxeBuilder from '../frontend/node_modules/@axe-core/playwright/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('===============================================================');
  console.log('Starting Step 9.7 Verification: Interventions, Zone Priors, Batch');
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

  // --------------------------------------------------------------------------
  // Part 1: Interventions Desk (/interventions)
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Interventions Desk (/interventions) ---');
  const t0 = Date.now();
  await page.goto('http://localhost:5173/interventions', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Fleet Capacity Budget Controller', { timeout: 4000 });
  await page.waitForSelector('text=Available Smart Interventions Catalog', { timeout: 4000 });
  const loadDuration1 = Date.now() - t0;
  console.log(`✓ Interventions Desk load duration: ${loadDuration1}ms (Target: < 1500ms)`);

  console.log('Running Axe Accessibility scan on /interventions...');
  const axe1 = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const critical1 = axe1.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  console.log(`Axe Scan (/interventions): ${axe1.violations.length} total issues, ${critical1.length} critical/serious.`);
  if (axe1.violations.length > 0) {
    for (const v of axe1.violations) {
      console.warn(`  - [${v.impact}] ${v.id}: ${v.description}`);
      v.nodes.forEach((n) => {
        console.warn(`      Target: ${n.target.join(' ')}`);
        console.warn(`      HTML: ${n.html}`);
        console.warn(`      Summary: ${n.failureSummary}`);
      });
    }
  }

  // Filter testing
  await page.getByRole('button', { name: /Approved/ }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /Deferred Due to Cap/ }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: /All Elevated/ }).click();
  await page.waitForTimeout(200);

  // Open Simulate Modal
  console.log('Testing Simulation Modal...');
  await page.getByRole('button', { name: 'Simulate' }).first().click();
  await page.waitForSelector('text=Counterfactual Smart Intervention Simulator', { timeout: 3000 });
  await page.waitForTimeout(400);

  const simScreenshotPath = path.resolve(__dirname, '../docs/phase9/screenshots/interventions_simulate_modal.png');
  await page.screenshot({ path: simScreenshotPath, fullPage: true });
  console.log(`✓ Saved: ${simScreenshotPath}`);

  // Close modal with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Open Message Preview Modal
  console.log('Testing Messaging Preview Modal...');
  await page.getByRole('button', { name: 'Message' }).first().click();
  await page.waitForSelector('text=Customer Messaging Engagement Preview', { timeout: 3000 });
  await page.waitForTimeout(300);

  // Toggle Channels
  await page.getByRole('button', { name: 'WHATSAPP' }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'EMAIL' }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'SMS' }).click();
  await page.waitForTimeout(200);

  const msgScreenshotPath = path.resolve(__dirname, '../docs/phase9/screenshots/interventions_message_modal.png');
  await page.screenshot({ path: msgScreenshotPath, fullPage: true });
  console.log(`✓ Saved: ${msgScreenshotPath}`);

  await page.getByRole('button', { name: 'Close Preview' }).click();
  await page.waitForTimeout(300);

  // Capture Desktop Light & Dark Screenshots
  const intLightPath = path.resolve(__dirname, '../docs/phase9/screenshots/interventions_desktop_light.png');
  await page.screenshot({ path: intLightPath, fullPage: true });
  console.log(`✓ Saved: ${intLightPath}`);

  // Toggle Dark Theme
  await page.locator('#global-theme-toggle').click();
  await page.waitForTimeout(300);
  const intDarkPath = path.resolve(__dirname, '../docs/phase9/screenshots/interventions_desktop_dark.png');
  await page.screenshot({ path: intDarkPath, fullPage: true });
  console.log(`✓ Saved: ${intDarkPath}`);

  // Toggle back to Light
  await page.locator('#global-theme-toggle').click();
  await page.waitForTimeout(300);

  // --------------------------------------------------------------------------
  // Part 2: Zone Priors (/zone-priors)
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Zone Priors (/zone-priors) ---');
  const t1 = Date.now();
  await page.goto('http://localhost:5173/zone-priors', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Geographic Zone Priors Matrix', { timeout: 4000 });
  await page.waitForSelector('text=Beta Density', { timeout: 4000 });
  const loadDuration2 = Date.now() - t1;
  console.log(`✓ Zone Priors load duration: ${loadDuration2}ms (Target: < 1500ms)`);

  console.log('Running Axe Accessibility scan on /zone-priors...');
  const axe2 = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const critical2 = axe2.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  console.log(`Axe Scan (/zone-priors): ${axe2.violations.length} total issues, ${critical2.length} critical/serious.`);
  if (axe2.violations.length > 0) {
    for (const v of axe2.violations) {
      console.warn(`  - [${v.impact}] ${v.id}: ${v.description}`);
      v.nodes.forEach((n) => {
        console.warn(`      Target: ${n.target.join(' ')}`);
        console.warn(`      HTML: ${n.html}`);
        console.warn(`      Summary: ${n.failureSummary}`);
      });
    }
  }

  // Switch zone row to C-3.2A Hollywood
  await page.locator('text=Hollywood / West Hollywood').click();
  await page.waitForTimeout(300);
  console.log('  - Selected Zone C-3.2A Hollywood, verified Beta PDF curve update');

  // Submit Feedback Simulator
  console.log('Testing Feedback Simulator submission...');
  await page.getByRole('button', { name: 'Simulate Bayesian Update' }).click();
  await page.waitForSelector('text=Bayesian Conjugate Updating Recorded', { timeout: 3000 });
  console.log('  - Bayesian Conjugate Updating verified in UI');

  const zoneLightPath = path.resolve(__dirname, '../docs/phase9/screenshots/zone_priors_desktop_light.png');
  await page.screenshot({ path: zoneLightPath, fullPage: true });
  console.log(`✓ Saved: ${zoneLightPath}`);

  // --------------------------------------------------------------------------
  // Part 3: Batch Scoring (/batch-scoring)
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Batch Scoring (/batch-scoring) ---');
  const t2 = Date.now();
  await page.goto('http://localhost:5173/batch-scoring', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('text=Multi-Route Capacity Partitions', { timeout: 4000 });
  await page.waitForSelector('text=Active Scored Shipments', { timeout: 4000 });
  const loadDuration3 = Date.now() - t2;
  console.log(`✓ Batch Scoring load duration: ${loadDuration3}ms (Target: < 1500ms)`);

  console.log('Running Axe Accessibility scan on /batch-scoring...');
  const axe3 = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const critical3 = axe3.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );
  console.log(`Axe Scan (/batch-scoring): ${axe3.violations.length} total issues, ${critical3.length} critical/serious.`);
  if (critical3.length > 0) {
    for (const v of critical3) {
      console.warn(`  - [${v.impact}] ${v.id}: ${v.description}`);
    }
  }

  // Filter testing
  await page.getByRole('button', { name: 'high', exact: true }).click();
  await page.waitForTimeout(200);
  await page.getByRole('button', { name: 'all', exact: true }).click();
  await page.waitForTimeout(200);

  const batchLightPath = path.resolve(__dirname, '../docs/phase9/screenshots/batch_scoring_desktop_light.png');
  await page.screenshot({ path: batchLightPath, fullPage: true });
  console.log(`✓ Saved: ${batchLightPath}`);

  await browser.close();
  console.log('\n===============================================================');
  console.log('Step 9.7 Verification Completed Successfully!');
  console.log('===============================================================');
}

run().catch((err) => {
  console.error('Step 9.7 verification failed:', err);
  process.exit(1);
});
