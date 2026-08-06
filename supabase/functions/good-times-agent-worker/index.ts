import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const workerId = "good-times-agent-worker";

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return response({ error: "Worker environment is incomplete" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = request.headers.get("x-worker-token") || "";
  const { data: authorized, error: authError } = await supabase.rpc("gt_authorize_external_worker_token", {
    p_token: token,
  });
  if (authError || authorized !== true) return response({ error: "Unauthorized" }, 401);

  let input: { limit?: number } = {};
  try { input = await request.json(); } catch { input = {}; }
  const limit = Math.min(10, Math.max(1, Number(input.limit) || 4));
  const outcomes: unknown[] = [];

  for (let index = 0; index < limit; index += 1) {
    const { data: item, error: claimError } = await supabase.rpc("gt_claim_external_work_item", {
      p_worker_id: workerId,
    });
    if (claimError) return response({ error: claimError.message, outcomes }, 500);
    if (!item) break;

    const itemId = String(item.id);
    try {
      const { data: result, error: runError } = await supabase.rpc("gt_run_agent_external", {
        p_agent_key: item.agent_key,
        p_trigger: `external:${item.work_type}`,
      });
      if (runError) throw runError;
      if (result?.status === "failed") throw new Error(String(result.error || "Agent cycle failed"));

      const { data: acknowledged, error: completeError } = await supabase.rpc("gt_complete_external_work_item", {
        p_item_id: itemId,
        p_worker_id: workerId,
        p_result: { work_item: item, agent_cycle: result },
      });
      if (completeError || acknowledged !== true) throw completeError || new Error("Work item acknowledgement failed");
      outcomes.push({ id: itemId, agent_key: item.agent_key, status: "completed" });
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : typeof error === "object" && error !== null
          ? JSON.stringify(error)
          : String(error);
      const { data: retryStatus } = await supabase.rpc("gt_fail_external_work_item", {
        p_item_id: itemId,
        p_worker_id: workerId,
        p_error: message,
      });
      outcomes.push({ id: itemId, agent_key: item.agent_key, status: retryStatus || "failed", error: message });
    }
  }

  console.log(JSON.stringify({ level: "info", message: "GOOD TIMES external worker cycle", processed: outcomes.length, outcomes }));
  return response({ ok: true, worker_id: workerId, processed: outcomes.length, outcomes });
});
