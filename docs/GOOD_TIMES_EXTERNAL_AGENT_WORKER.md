# GOOD TIMES external agent worker

The `good-times-agent-worker` Supabase Edge Function is the external executor for
the durable `gt_agent_work_items` queue in the canonical GOOD TIMES gateway
project. It is separate from BLACK PAGES and does not read or write any
`black_pages_*` tables.

The worker:

1. Authenticates a private dispatcher token stored in Vault.
2. Atomically leases one due work item with a four-minute lease.
3. Runs the item's named GOOD TIMES agent through the serialized external RPC.
4. Acknowledges success with result/evidence, or moves failures to `waiting`
   with bounded backoff until `max_attempts` is reached.
5. Runs every five minutes. One item is intentional because an agent invocation
   may dispatch a batch of downstream jobs.

Operational checks:

```sql
select status, count(*) from gt_agent_work_items group by status order by status;
select id, agent_key, work_type, status, attempts, completed_at, error_message
from gt_agent_work_items
where evidence->>'external_worker' = 'good-times-agent-worker'
order by updated_at desc limit 20;
select jobname, schedule, active from cron.job
where jobname = 'good-times-external-agent-worker';
```

Rollback is in
`supabase/rollbacks/20260806231713_external_agent_worker.rollback.sql`. It
unschedules dispatch and removes the worker RPC/table contract. It intentionally
retains the Vault secret so rollback is recoverable and does not destroy
credentials. Delete or rotate that secret separately only if the worker is being
permanently retired.
