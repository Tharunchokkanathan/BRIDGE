import { chromium } from 'playwright';
import AxeBuilder from '../frontend/node_modules/@axe-core/playwright/dist/index.js';

async function inspectDarkViolations() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const routes = ['/command-center', '/route-optimizer', '/zone-priors', '/model-governance'];

  for (const r of routes) {
    await page.goto(`http://localhost:5173${r}`, { waitUntil: 'domcontentloaded' });
    // Switch to dark
    await page.locator('#global-theme-toggle').click();
    await page.waitForTimeout(400);

    const axe = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    console.log(`\n=== Route: ${r} ===`);
    axe.violations.forEach(v => {
      console.log(`Violation [${v.impact}]: ${v.id} - ${v.description}`);
      v.nodes.forEach(n => {
        console.log(`  HTML: ${n.html}`);
        console.log(`  Target: ${n.target.join(' ')}`);
        console.log(`  Summary: ${n.failureSummary}`);
      });
    });
  }

  await browser.close();
}

inspectDarkViolations().catch(console.error);
