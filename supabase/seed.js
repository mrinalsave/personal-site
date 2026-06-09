/**
 * Seed Supabase tables from local JSON files.
 *
 * Prerequisites:
 *   npm install @supabase/supabase-js
 *   cp .env.local.example .env.local  (fill in SUPABASE_SERVICE_ROLE_KEY)
 *
 * Run from repo root:
 *   node supabase/seed.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

// Load .env.local manually (no dotenv dependency needed)
const envFile = join(root, '.env.local');
const env = Object.fromEntries(
  readFileSync(envFile, 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const [k, ...v] = l.split('=');
      return [k.trim(), v.join('=').trim()];
    })
);

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY  // service role key to bypass RLS
);

function loadJSON(relPath) {
  return JSON.parse(readFileSync(join(root, relPath), 'utf8'));
}

// ─── Nintendo Games ────────────────────────────────────────────────────────

async function seedNintendoGames() {
  const games = loadJSON('nintendo-games/assets/data/switch.json');

  const rows = games.map(g => ({
    sort_order: g.id,
    title: g.title,
    cover_path: g.cover.replace('./assets/images/games/', ''),
    store_url: g.url,
  }));

  const { error } = await supabase.from('nintendo_games').upsert(rows, {
    onConflict: 'title',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`nintendo_games: ${error.message}`);
  console.log(`✓ nintendo_games — ${rows.length} rows`);
}

// ─── Pokemon Cards ─────────────────────────────────────────────────────────

async function seedPokemonCards() {
  const cards = loadJSON('pokemon-cards/assets/data/cards.json');
  const gifs  = loadJSON('pokemon-cards/assets/data/gifs.json');

  const rows = [
    ...cards.map(filename => ({ filename, type: 'card' })),
    ...gifs.map(filename  => ({ filename, type: 'gif'  })),
  ];

  const { error } = await supabase.from('pokemon_cards').upsert(rows, {
    onConflict: 'filename',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`pokemon_cards: ${error.message}`);
  console.log(`✓ pokemon_cards — ${rows.length} rows (${cards.length} cards, ${gifs.length} gifs)`);
}

// ─── Oreo Reviewers ────────────────────────────────────────────────────────

async function seedOreoReviewers() {
  const raw = readFileSync(join(root, 'oreos/reviewers.txt'), 'utf8');
  const names = raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && l !== 'Number of Reviewers: 31');

  const rows = names.map(name => ({ name }));
  const { error } = await supabase.from('oreo_reviewers').upsert(rows, {
    onConflict: 'name',
    ignoreDuplicates: true,
  });
  if (error) throw new Error(`oreo_reviewers: ${error.message}`);
  console.log(`✓ oreo_reviewers — ${rows.length} rows`);
}

// ─── Oreo Flavors + Reviews ────────────────────────────────────────────────

async function seedOreoData() {
  const ratings = loadJSON('oreos/assets/data/ratings.json');

  for (const [flavorName, entries] of Object.entries(ratings)) {
    // Metadata lives on the "Average" entry for every flavor
    const avgEntry = entries.find(e => e.Name === 'Average');
    if (!avgEntry) {
      console.warn(`  ⚠ No Average entry for "${flavorName}" — skipping`);
      continue;
    }

    // Upsert the flavor
    const { data: flavor, error: flavorErr } = await supabase
      .from('oreo_flavors')
      .upsert({
        name:       flavorName,
        image_path: avgEntry.Image   ?? null,
        wafers:     avgEntry.Wafers  ?? null,
        type:       avgEntry.Type    ?? null,
        tags:       avgEntry.Tags    ?? null,
      }, { onConflict: 'name' })
      .select('id')
      .single();

    if (flavorErr) throw new Error(`oreo_flavors "${flavorName}": ${flavorErr.message}`);

    // Upsert all reviews for this flavor
    const reviewRows = entries.map(e => ({
      flavor_id:     flavor.id,
      reviewer_name: e.Name,
      rating:        e.Rating,
      comment:       e.Comment ?? null,
      is_average:    e.Name === 'Average',
    }));

    const { error: reviewErr } = await supabase
      .from('oreo_reviews')
      .upsert(reviewRows, { onConflict: 'flavor_id,reviewer_name', ignoreDuplicates: true });

    if (reviewErr) throw new Error(`oreo_reviews "${flavorName}": ${reviewErr.message}`);
  }

  console.log(`✓ oreo_flavors + oreo_reviews — ${Object.keys(ratings).length} flavors`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding Supabase...\n');
  await seedNintendoGames();
  await seedPokemonCards();
  await seedOreoReviewers();
  await seedOreoData();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
