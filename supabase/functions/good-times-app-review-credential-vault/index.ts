import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((req: Request) => {
  const headers = { "cache-control": "no-store", "content-type": "application/json" };

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  return new Response(
    JSON.stringify({
      error: "Credential delivery path retired",
      code: "credential_path_retired",
      guidance:
        "Use an approved platform secret store. Credentials must not be embedded in Edge Function source.",
    }),
    { status: 410, headers },
  );
});
