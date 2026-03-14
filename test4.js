const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://flixpatrol.com/top10/streaming/philippines/');
  await page.waitForTimeout(6000);

  const results = await page.evaluate(() => {
    const output = [];

    const providerSections = document.querySelectorAll('.content.mb-12');

    providerSections.forEach(section => {

      const h2 = section.querySelector('h2 span:last-child');
      if (!h2) return;

      const providerText = h2.innerText.trim();
      const providerMatch = providerText.match(/^(.+?) TOP 10/i);
      if (!providerMatch) return;

      const provider = providerMatch[1];

      const cards = section.querySelectorAll('.card');

      cards.forEach(card => {

        const header = card.querySelector('h3');
        if (!header) return;

        const type = header.innerText.includes('Movies') ? 'movie' : 'tv';

        const rows = card.querySelectorAll('tbody tr');

        rows.forEach(row => {
          const rankCell = row.querySelector('td');
          const link = row.querySelector('td a');

          if (!rankCell || !link) return;

          const rank = parseInt(rankCell.innerText.replace('.', '').trim(), 10);
          const title = link.innerText.trim();
          const slug = link.getAttribute('href');

          output.push({
            provider,
            type,
            rank,
            title,
            slug
          });
        });

      });

    });

    return output;
  });

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
})();
