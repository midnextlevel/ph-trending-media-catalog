const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto('https://flixpatrol.com/top10/streaming/philippines/');
  await page.waitForTimeout(6000);

  const results = await page.evaluate(() => {
    const data = [];

    // Each provider block
    const providerBlocks = document.querySelectorAll('.content.mb-12');

    providerBlocks.forEach(block => {
      const providerSpan = block.querySelector('h2 span');
      if (!providerSpan) return;

      const providerText = providerSpan.innerText.trim();
      const providerMatch = providerText.match(/^(.+?) TOP 10/i);
      if (!providerMatch) return;

      const provider = providerMatch[1];

      // Inside provider block, find both tables
      const sectionHeaders = block.querySelectorAll('h3');

      sectionHeaders.forEach(header => {
        const sectionText = header.innerText.trim();
        const type = sectionText.includes('Movies') ? 'movie' : 'tv';

        // The table is inside the same parent container
        const table = header.parentElement.querySelector('table.card-table');
        if (!table) return;

        const rows = table.querySelectorAll('tbody tr');

        rows.forEach(row => {
          const rankCell = row.querySelector('td');
          const link = row.querySelector('td a');
          if (!rankCell || !link) return;

          const rank = parseInt(rankCell.innerText.replace('.', '').trim(), 10);
          const title = link.innerText.trim();
          const slug = link.getAttribute('href');

          data.push({
            provider,
            type,
            rank,
            title,
            slug
          });
        });
      });
    });

    return data;
  });

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
})();
