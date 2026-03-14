const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://flixpatrol.com/top10/streaming/philippines/');
  await page.waitForTimeout(8000);

  await page.screenshot({ path: 'debug.png', fullPage: true });

  const html = await page.content();
  console.log("Contains War Machine:", html.includes("War Machine"));
  console.log("Contains Netflix TOP 10:", html.includes("Netflix TOP 10"));

  await browser.close();
})();
