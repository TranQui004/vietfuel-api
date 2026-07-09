import assert from 'assert';
import { fileURLToPath } from 'url';
import scrapers from '../../src/scraper.js';
const { scrapePetrolimex } = scrapers;

export async function run() {
  const startedAt = Date.now();
  const result = await scrapePetrolimex();

  assert(result, 'Petrolimex result is undefined');
  assert(Array.isArray(result.prices), 'Petrolimex prices must be an array');
  assert(result.prices.length > 0, 'Petrolimex must return at least one product');
  assert(typeof result.scrapedAt === 'string', 'Petrolimex scrapedAt must be a string');

  return {
    name: 'scrapers/petrolimex.smoke',
    ok: true,
    count: result.prices.length,
    durationMs: Date.now() - startedAt,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run()
    .then((summary) => {
      console.log(`[PASS] ${summary.name} - ${summary.count} items (${summary.durationMs}ms)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[FAIL] scrapers/petrolimex.smoke:', err.message);
      process.exit(1);
    });
}

