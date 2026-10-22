import { chromium } from 'playwright';
import AxeBuilder from '../frontend/node_modules/@axe-core/playwright/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROUTES = [
  { name: 'Command Center', path: '/command-center', selector: 'h1:has-text("Command Center")' },
  { name: 'Risk Queue', path: '/risk-queue', selector: 'h1:has-text("Risk Queue")' },
  { name: 'Route Optimizer', path: '/route-optimizer', selector: 'h1:has-text("Route Optimizer")' },
  { name: 'Interventions', path: '/interventions', selector: 'h1:has-text("Interventions")' },
  { name: 'Zone Priors', path: '/zone-priors', selector: 'h1:has-text("Dynamic Zone Priors")' },
  { name: 'Batch Scoring', path: '/batch-scoring', selector: 'h1:has-text("Batch Scoring")' },
  { name: 'Model Governance', path: '/model-governance', selector: 'h1:has-text("Model Governance")' },
  { name: 'Audit Disclosures', path: '/audit-disclosures', selector: 'h1:has-text("Audit Guardrails")' },
];

async function runAudit() {
  console.log('======================================================================');
  console.log('Starting Step 9.10: Full Application Accessibility & Visual Audit');
  console.log('======================================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  const auditResults = [];
  let totalViolations = 0;
  let totalCriticalSerious = 0;

  // 1. Audit each screen in Light and Dark mode
  for (const route of ROUTES) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Auditing: ${route.name} (${route.path})`);
    console.log(`--------------------------------------------------`);

    // --- Light Mode ---
    await page.goto(`http://localhost:5173${route.path}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector(route.selector, { timeout: 6000 });

    const axeLight = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critLight = axeLight.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    console.log(`  [Light Mode] Axe Violations: ${axeLight.violations.length} total, ${critLight.length} critical/serious.`);
    if (critLight.length > 0) {
      critLight.forEach(v => console.warn(`    - [${v.impact}] ${v.id}: ${v.description} (${v.nodes[0]?.target})`));
    }

    // Capture screenshot
    const lightShot = path.resolve(__dirname, `../docs/phase9/screenshots/audit_9_10_${route.name.toLowerCase().replace(/\s+/g, '_')}_light.png`);
    await page.screenshot({ path: lightShot, fullPage: false });

    // --- Dark Mode ---
    // Toggle theme to dark
    const themeBtn = page.locator('#global-theme-toggle');
    await themeBtn.click();
    await page.waitForTimeout(300);

    const axeDark = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critDark = axeDark.violations.filter(v => v.impact === 'critical' || v.impact === 'serious');
    console.log(`  [Dark Mode]  Axe Violations: ${axeDark.violations.length} total, ${critDark.length} critical/serious.`);
    if (critDark.length > 0) {
      critDark.forEach(v => console.warn(`    - [${v.impact}] ${v.id}: ${v.description} (${v.nodes[0]?.target})`));
    }

    // Capture dark screenshot
    const darkShot = path.resolve(__dirname, `../docs/phase9/screenshots/audit_9_10_${route.name.toLowerCase().replace(/\s+/g, '_')}_dark.png`);
    await page.screenshot({ path: darkShot, fullPage: false });

    // Toggle back to light mode for next route
    await themeBtn.click();
    await page.waitForTimeout(300);

    const routeTotalCrit = critLight.length + critDark.length;
    totalViolations += axeLight.violations.length + axeDark.violations.length;
    totalCriticalSerious += routeTotalCrit;

    auditResults.push({
      name: route.name,
      path: route.path,
      lightViolations: axeLight.violations.length,
      lightCritical: critLight.length,
      darkViolations: axeDark.violations.length,
      darkCritical: critDark.length,
      passed: routeTotalCrit === 0,
    });
  }

  // 2. Keyboard Walkthrough Test on /risk-queue
  console.log(`\n--------------------------------------------------`);
  console.log('Running Keyboard-Only Walkthrough on Risk Queue...');
  console.log(`--------------------------------------------------`);

  await page.goto('http://localhost:5173/risk-queue', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('table', { timeout: 5000 });

  // Press '?' to trigger Keyboard Shortcut Sheet
  await page.keyboard.press('Shift+?');
  await page.waitForSelector('text=Keyboard Shortcuts', { timeout: 2000 });
  console.log('  ✓ Keyboard shortcut sheet opened with "?"');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  console.log('  ✓ Keyboard shortcut sheet closed with Escape');

  // Open Command Palette with Meta+K / Control+K
  await page.keyboard.press('Control+k');
  await page.waitForSelector('input[placeholder*="command"]', { timeout: 3000 });
  console.log('  ✓ Command Palette opened with Control+K');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  console.log('  ✓ Command Palette closed with Escape');

  // Navigate to first table row with keyboard arrow keys and trigger with Enter
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.waitForSelector('div[aria-label="Package Details Drawer"]', { timeout: 4000 });
  console.log('  ✓ Package details drawer opened with Enter key');

  // Close drawer with Escape
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const isDrawerClosed = !(await page.isVisible('div[aria-label="Package Details Drawer"]'));
  console.log(`  ✓ Package details drawer closed with Escape: ${isDrawerClosed}`);

  // 3. Print Sign-off Summary Table
  console.log('\n======================================================================');
  console.log('Step 9.10 Accessibility & Anti-AI Audit Matrix:');
  console.log('======================================================================');
  console.table(auditResults);
  console.log(`Total Violations: ${totalViolations} | Critical/Serious: ${totalCriticalSerious}`);

  await browser.close();

  if (totalCriticalSerious > 0) {
    console.error(`Audit failed: ${totalCriticalSerious} critical/serious accessibility violations detected.`);
    process.exit(1);
  } else {
    console.log('\nAudit SUCCESS: 0 Critical / Serious Accessibility Violations!');
  }
}

runAudit().catch((err) => {
  console.error('Audit failed with error:', err);
  process.exit(1);
});
