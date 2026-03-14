const { chromium } = require('playwright');

const providerWeights = {
  "Netflix": 1.4,
  "Amazon Prime": 0.7,
  "HBO Max": 0.6,
  "Apple TV": 0.4
};

function cleanAndRank(data, typeFilter) {

  const map = new Map();

  data
    .filter(x => providerWeights[x.provider])
    .filter(x => x.type === typeFilter)
    .forEach(item => {

      const weight = providerWeights[item.provider];
      const baseScore = (11 - item.rank);
      const score = (baseScore * baseScore) * weight;

      const key = item.slug;

      if (!map.has(key)) {
        map.set(key, {
          slug: item.slug,
          title: item.title,
          totalScore: 0,
          providers: new Set()
        });
      }

      const entry = map.get(key);
      entry.totalScore += score;
      entry.providers.add(item.provider);
    });

  for (const entry of map.values()) {
    if (entry.providers.size > 1) {
      entry.totalScore += 25;
    }
  }

  return [...map.values()]
    .map(x => ({
      slug: x.slug,
      title: x.title,
      totalScore: Number(x.totalScore.toFixed(2)),
      providers: [...x.providers]
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 20);
}

(async () => {

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  });

  const page = await context.newPage();

  await page.goto(
    'https://flixpatrol.com/top10/streaming/philippines/',
    { waitUntil: 'domcontentloaded' }
  );

  await page.waitForSelector('.content.mb-12', { timeout: 15000 });

  const results = await page.evaluate(() => {

    const output = [];
    const providerSections = document.querySelectorAll('.content.mb-12');

    providerSections.forEach(section => {

      const h2 = section.querySelector('h2 span:last-child');
      if (!h2) return;

      const providerMatch = h2.innerText.match(/^(.+?) TOP 10/i);
      if (!providerMatch) return;

      const provider = providerMatch[1];
      const cards = section.querySelectorAll('.card');

      cards.forEach(card => {

        const header = card.querySelector('h3');
        if (!header) return;

       let type = null;

if (header.innerText.includes('Movies')) {
  type = 'movie';
} else if (header.innerText.includes('TV')) {
  type = 'tv';
} else {
  return; // skip "Overall"
}
        const rows = card.querySelectorAll('tbody tr');

        rows.forEach(row => {

          const rankCell = row.querySelector('td');
          const link = row.querySelector('td a');

          if (!rankCell || !link) return;

          const rank = parseInt(rankCell.innerText.replace('.', '').trim(), 10);
          const title = link.innerText.trim();
          const slug = link.getAttribute('href');

          output.push({ provider, type, rank, title, slug });

        });

      });

    });

    return output;
  });

  await browser.close();

  const topMovies = cleanAndRank(results, "movie");
  const topTV = cleanAndRank(results, "tv");

  console.log("\n=== TOP 20 MOVIES (PH) ===");
  console.log(JSON.stringify(topMovies, null, 2));

  console.log("\n=== TOP 20 TV SHOWS (PH) ===");
  console.log(JSON.stringify(topTV, null, 2));

console.log("Raw entries scraped:", results.length);

})();
