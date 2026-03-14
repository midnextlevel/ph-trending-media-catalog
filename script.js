const { chromium } = require('playwright');
const fs = require('fs');

const fetch = global.fetch;

const TMDB_API_KEY = process.env.TMDB_API_KEY;

if (!TMDB_API_KEY) {
  console.error("TMDB_API_KEY is not defined.");
  process.exit(1);
}

const providerWeights = {
  "Netflix": 1.4,
  "Amazon Prime": 0.7,
  "HBO Max": 0.6,
  "Apple TV": 0.4
};

function extractYearFromSlug(slug) {
  const match = slug.match(/-(\d{4})\//);
  return match ? parseInt(match[1]) : null;
}

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

  // Multi-platform bonus
  for (const entry of map.values()) {
    if (entry.providers.size > 1) {
      entry.totalScore += 25;
    }
  }

  return [...map.values()]
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, 20);
}

async function searchTMDB(title, type, year) {

  const endpoint = type === "movie"
    ? "search/movie"
    : "search/tv";

  let url = `https://api.themoviedb.org/3/${endpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`;

  if (year) {
    if (type === "movie") {
      url += `&year=${year}`;
    } else {
      url += `&first_air_date_year=${year}`;
    }
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.results && data.results.length > 0) {
      return data.results[0].id;
    }

    return null;

  } catch (err) {
    console.error(`TMDB error for ${title}`);
    return null;
  }
}

(async () => {

  console.log("Launching Playwright...");

  const browser = await chromium.launch({
    headless: true,
    args: ['--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  });

  const page = await context.newPage();

  await page.goto(
    'https://flixpatrol.com/top10/streaming/philippines/',
    { waitUntil: 'domcontentloaded' }
  );

  await page.waitForSelector('.content.mb-12', { timeout: 20000 });

  console.log("Scraping rankings...");

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

  console.log(`Scraped ${results.length} entries.`);

  const topMovies = cleanAndRank(results, "movie");
  const topTV = cleanAndRank(results, "tv");

  console.log("Matching with TMDB...");

  const movieMetas = [];
  const tvMetas = [];

  for (const item of topMovies) {
    const year = extractYearFromSlug(item.slug);
    const tmdbId = await searchTMDB(item.title, "movie", year);

    if (tmdbId) {
      movieMetas.push({
        id: `tmdb:${tmdbId}`,
        type: "movie",
        name: item.title
      });
    }
  }

  for (const item of topTV) {
    const year = extractYearFromSlug(item.slug);
    const tmdbId = await searchTMDB(item.title, "tv", year);

    if (tmdbId) {
      tvMetas.push({
        id: `tmdb:${tmdbId}`,
        type: "series",
        name: item.title
      });
    }
  }

  fs.mkdirSync("movies", { recursive: true });
  fs.mkdirSync("tv", { recursive: true });

  fs.writeFileSync(
    "movies/catalog.json",
    JSON.stringify({ metas: movieMetas }, null, 2)
  );

  fs.writeFileSync(
    "tv/catalog.json",
    JSON.stringify({ metas: tvMetas }, null, 2)
  );

  console.log("Catalog files generated successfully.");

})();
