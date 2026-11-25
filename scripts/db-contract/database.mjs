import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';

const migrations = [
  '20261007034323_good_times_discover_data_contract_v1.sql',
  '20261007034441_good_times_reviewed_sheet_ingest_v1.sql',
  '20261007034451_good_times_priority_occurrence_updates_v1.sql',
];

export const quoteIdentifier = value => '"' + value.replaceAll('"', '""') + '"';

export async function withContractDatabase(context, scenario, { priority = false } = {}) {
  const db = new PGlite();
  const q = async (sql, args) => (await db.query(sql, args)).rows;
  let passed = 0;
  try {
    await db.exec(await readFile(new URL('./fixtures/baseline.sql', import.meta.url), 'utf8'));
    for (const filename of migrations.slice(0, priority ? 3 : 2)) {
      const url = new URL(`../../supabase/migrations/${filename}`, import.meta.url);
      await db.exec(await readFile(url, 'utf8'));
    }
    const [{ version }] = await q('select version() as version');
    context.diagnostic(`Isolated engine: ${version}; production target: PostgreSQL 17.6`);
    const check = async (name, fn) => {
      let failure;
      await context.test(name, async () => {
        try {
          await fn();
          passed += 1;
        } catch (error) {
          failure = error;
          throw error;
        }
      });
      // Later checks in a scenario share state; stop if their setup contract failed.
      if (failure) throw failure;
    };
    await scenario({ db, q, check });
    context.diagnostic(`${passed} contract checks passed`);
  } finally {
    await db.close();
  }
}
