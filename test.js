const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://flixpatrol.com/top10/streaming/philippines/');
  await page.waitForTimeout(5000);

  const titles = await page.$$eval('a.hover\\:underline', elements =>
    elements
      .map(el => el.innerText.trim())
      .filter(text => text.length > 0)
  );

  console.log(JSON.stringify(titles, null, 2));

  await browser.close();
})();
