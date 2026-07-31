import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const runtimePath = new URL("../public/gt-runtime.js", import.meta.url);
const indexPath = new URL("../index.html", import.meta.url);
const runtime = fs.readFileSync(runtimePath, "utf8");
const index = fs.readFileSync(indexPath, "utf8");

new vm.Script(runtime, { filename: "public/gt-runtime.js" });

assert.match(index, /<script src="\/gt-runtime\.js"><\/script><script type="module" src="\/src\/main\.jsx"><\/script>/,
  "Atlanta runtime must load before React so it can protect and enrich existing data requests.");
assert.match(runtime, /v_gt_atlanta_ranked_feed/, "Canonical ranked feed must be wired.");
assert.match(runtime, /eventbrite_events/, "Eventbrite backup lane must remain city-filtered.");
assert.match(runtime, /gt_sourced_events/, "Sourced-event records must feed the app.");
assert.match(runtime, /v_gt_active_banners/, "Database-driven banner CMS must be wired.");
assert.match(runtime, /gt_banner_events/, "Banner analytics must be wired.");
assert.match(runtime, /prefers-reduced-motion/, "Motion accessibility fallback is required.");
assert.match(runtime, /IntersectionObserver/, "Offscreen motion must pause.");
assert.doesNotMatch(index, /app-id=XXXXXXXXX/, "Placeholder App Store ID must not ship.");

const migrations = [
  "supabase/migrations/20260731010000_good_times_atlanta_taxonomy.sql",
  "supabase/migrations/20260731011000_good_times_atlanta_ranked_feed.sql",
  "supabase/migrations/20260731012000_good_times_atlanta_operations.sql",
];
for (const path of migrations) {
  assert.ok(fs.existsSync(new URL(`../${path}`, import.meta.url)), `Missing migration: ${path}`);
}

console.log("Atlanta release contract passed.");
