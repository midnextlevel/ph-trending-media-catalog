const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://flixpatrol.com/top10/streaming/philippines/');
  await page.waitForTimeout(5000);

  const titles = await page.$$eval('table tbody tr td a', rows =>
    rows
      .map(el => el.innerText.trim())
      .filter(text =>
        text.length > 0 &&
        !text.includes('Mar') &&
        !text.includes('VOD') &&
        !text.includes('charts')
      )
  );

  // Remove duplicates
  const unique = [...new Set(titles)];

  console.log(JSON.stringify(unique, null, 2));

  await browser.close();
})();
