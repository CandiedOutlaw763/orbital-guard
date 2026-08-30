const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => {
    if(msg.text().includes('GLOBE_SIZE')) console.log('PAGE LOG:', msg.text());
  });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
  await browser.close();
})();
