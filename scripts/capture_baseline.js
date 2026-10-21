const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '..', 'docs', 'phase9', 'baseline');
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'tablet', width: 834, height: 1112 },
    { name: 'mobile', width: 390, height: 844 }
];

const tabs = [
    { id: 'dispatcher-view', name: 'dispatcher' },
    { id: 'route-view', name: 'route' },
    { id: 'customer-view', name: 'interventions' },
    { id: 'audit-view', name: 'audit' }
];

async function capture() {
    console.log('Launching browser to capture baseline screenshots...');
    const browser = await chromium.launch();
    
    for (const vp of viewports) {
        console.log(`Capturing for viewport: ${vp.name} (${vp.width}x${vp.height})`);
        const context = await browser.newContext({
            viewport: { width: vp.width, height: vp.height },
            deviceScaleFactor: 1
        });
        const page = await context.newPage();
        await page.goto('http://127.0.0.1:8000', { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);

        for (const tab of tabs) {
            console.log(` - View: ${tab.name}`);
            const tabBtn = page.locator(`button[data-target="${tab.id}"]`);
            if (await tabBtn.count() > 0) {
                await tabBtn.click();
                await page.waitForTimeout(500);
            }
            const filename = path.join(outDir, `${tab.name}_${vp.name}.png`);
            await page.screenshot({ path: filename, fullPage: true });
            console.log(`   Saved: ${filename}`);
        }
        await context.close();
    }

    await browser.close();
    console.log('Baseline screenshots capture complete!');
}

capture().catch(err => {
    console.error('Error capturing screenshots:', err);
    process.exit(1);
});
