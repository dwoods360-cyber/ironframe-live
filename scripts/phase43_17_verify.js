const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const base = 'http://localhost:3014';
  await page.goto(`${base}/vendors`, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const rows = page.getByTestId('vendor-row');
  await rows.first().waitFor({ timeout: 10000 });
  const rowCount = await rows.count();

  const barCount = await page.getByTestId('risk-sparkbar').count();
  const polylineCount = await page.locator('polyline').count();

  const actionsHeader = page.locator('p[data-print-hide="true"]', { hasText: 'ACTIONS' }).first();
  await actionsHeader.waitFor({ timeout: 10000 });
  const actionsAlign = await actionsHeader.evaluate((el) => window.getComputedStyle(el).textAlign);

  const headerChipBar = page.getByTestId('header-two-chip-bar');
  await headerChipBar.waitFor({ timeout: 10000 });
  const headerChipOrder = await headerChipBar.evaluate((container) =>
    Array.from(container.querySelectorAll('button, a'))
      .map((node) => (node.textContent || '').replace(/\s+/g, ' ').trim())
      .filter(Boolean)
  );
  const addVendorFarLeft = Boolean(headerChipOrder[0] && headerChipOrder[0].includes('ADD VENDOR'));

  const checks = {
    ACTIONS_TEXT_RIGHT: actionsAlign === 'right',
    SPARK_BARS_REPLACED_LINES: barCount === rowCount && polylineCount === 0,
    SUBHEADER_ADD_FAR_LEFT: addVendorFarLeft,
  };

  const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([key]) => key);
  if (failed.length) {
    console.log('PHASE43_17_VERIFY=FAIL');
    console.log(`FAILED=${failed.join(',')}`);
    console.log(`rowCount=${rowCount} barCount=${barCount} polylineCount=${polylineCount} actionsAlign=${actionsAlign}`);
    process.exit(1);
  }

  console.log('PHASE43_17_VERIFY=PASS');
  for (const [key, pass] of Object.entries(checks)) {
    console.log(`${key}=${pass}`);
  }
  console.log(`rowCount=${rowCount} barCount=${barCount} polylineCount=${polylineCount} actionsAlign=${actionsAlign}`);

  await browser.close();
})().catch((error) => {
  console.log('PHASE43_17_VERIFY=FAIL');
  console.log(error.message);
  process.exit(1);
});
