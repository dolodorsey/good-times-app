import test from 'node:test';
import { withContractDatabase } from './db-contract/database.mjs';
import { runPromotionScenario } from './db-contract/promotion.mjs';
import { runReviewedIngestScenario } from './db-contract/reviewed-ingest.mjs';
import { runPriorityIngestScenario } from './db-contract/priority-ingest.mjs';

// Keep PGlite instances sequential: each scenario gets an isolated empty database.
// npm test discovers this file; no network, credentials, or audit exports are needed.
test('database migration contracts', { concurrency: false, timeout: 120_000 }, async context => {
  await context.test('source promotion', context => withContractDatabase(context, runPromotionScenario));
  await context.test('reviewed spreadsheet ingestion', context => withContractDatabase(context, runReviewedIngestScenario));
  await context.test('official priority ingestion', context => withContractDatabase(context, runPriorityIngestScenario, { priority: true }));
});
