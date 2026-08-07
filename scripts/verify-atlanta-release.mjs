import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

const index = read("index.html")
const timezoneGuard = read("public/gt-timezone-guard.js")
const stabilizer = read("public/gt-stabilizer.js")
const stabilizedEntry = read("src/stabilized-entry.jsx")
const catalogApi = read("api/catalog.js")
const dataApi = read("api/data.js")

new vm.Script(timezoneGuard, { filename: "public/gt-timezone-guard.js" })
new vm.Script(stabilizer, { filename: "public/gt-stabilizer.js" })

const timezoneIndex = index.indexOf('<script src="/gt-timezone-guard.js"></script>')
const stabilizerIndex = index.indexOf('<script src="/gt-stabilizer.js"></script>')
const entryIndex = index.indexOf('<script type="module" src="/src/stabilized-entry.jsx"></script>')

assert.ok(timezoneIndex >= 0, "Timezone guard must be present in the customer shell.")
assert.ok(stabilizerIndex > timezoneIndex, "Stabilizer must load after the timezone guard.")
assert.ok(entryIndex > stabilizerIndex, "The stabilized React entry must load after the stabilizer.")
assert.match(stabilizedEntry, /__GT_STABILIZER_READY__/, "React boot must wait for stabilizer readiness.")
assert.match(stabilizedEntry, /import\(['\"]\.\/main\.jsx['\"]\)/, "Stabilized entry must boot the main React application.")

assert.match(stabilizer, /window\.fetch\s*=\s*function stabilizedFetch/, "Stabilizer must protect live API fetches.")
assert.match(stabilizer, /\/api\/data/, "Primary GOOD TIMES data API must be protected by the stabilizer.")
assert.match(stabilizer, /\/api\/catalog/, "Catalog API must be protected by the stabilizer.")
assert.match(stabilizer, /stale-fallback/, "Stabilizer must retain bounded stale fallback behavior.")
assert.match(stabilizer, /gt_api_cache_v4:/, "Session response cache contract must be present.")

assert.match(catalogApi, /gt_venue_taxonomy_directory_cache/, "Canonical bounded directory cache must be wired.")
assert.match(catalogApi, /gt_venue_taxonomy_count_cache/, "Canonical taxonomy count cache must be wired.")
assert.match(catalogApi, /'latitude','longitude'/, "Directory payload must expose coordinates.")
assert.match(catalogApi, /const seen=new Set\(\)/, "Directory output must deduplicate venue IDs.")
assert.match(catalogApi, /taxonomy_confidence\.desc/, "Directory output must preserve quality ordering.")

assert.match(dataApi, /gt_shows\?select=/, "Primary customer event inventory must read from canonical shows.")
assert.match(dataApi, /gt_venues\?select=/, "Primary customer venue inventory must read from canonical venues.")
assert.match(dataApi, /dedupeCustomerVenues/, "Customer venue output must deduplicate records.")
assert.match(dataApi, /dedupeCustomerEvents/, "Customer event output must deduplicate records.")
assert.match(dataApi, /customerReadyVenue/, "Customer venue readiness filtering must remain active.")

assert.doesNotMatch(index, /app-id=XXXXXXXXX/, "Placeholder App Store ID must not ship.")

const migrations = [
  "supabase/migrations/20260731010000_good_times_atlanta_taxonomy.sql",
  "supabase/migrations/20260731011000_good_times_atlanta_ranked_feed.sql",
  "supabase/migrations/20260731012000_good_times_atlanta_operations.sql",
]
for (const path of migrations) {
  assert.ok(fs.existsSync(new URL(`../${path}`, import.meta.url)), `Missing migration: ${path}`)
}

console.log("Atlanta release contract passed for the current stabilized customer architecture.")
