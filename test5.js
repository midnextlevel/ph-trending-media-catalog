const { chromium } = require('playwright');

const providerWeights = {
  "Netflix": 1.0,
  "Amazon Prime": 0.75,
  "HBO Max": 0.65,
  "Apple TV": 0.45
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

  return [...map.values()]
    .map(x => ({
      slug: x.slug,
      title: x.title,
      totalScore: Number(x.totalScore.toFixed(2)),
      providers: [...x.providers]
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 15);
}

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

      const providerMatch = h2.innerText.match(/^(.+?) TOP 10/i);
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

          output.push({ provider, type, rank, title, slug });

        });

      });

    });

    return output;
  });

  await browser.close();

  const topMovies = cleanAndRank(results, "movie");
  const topTV = cleanAndRank(results, "tv");

  console.log("=== TOP 15 MOVIES ===");
  console.log(JSON.stringify(topMovies, null, 2));

  console.log("=== TOP 15 TV SHOWS ===");
  console.log(JSON.stringify(topTV, null, 2));

})();
