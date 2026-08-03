(() => {
  "use strict";
  if (window.__GT_TIMEZONE_GUARD_ACTIVE__) return;
  window.__GT_TIMEZONE_GUARD_ACTIVE__ = true;

  const GATEWAY_ORIGIN = "https://dzlmtvodpyhetvektfuo.supabase.co";
  const ATLANTA_TIME_ZONE = "America/New_York";
  const nativeFetch = window.fetch.bind(window);

  const dateInTimeZone = (timeZone) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  window.fetch = (input, init) => {
    const rawUrl = typeof input === "string" ? input : input?.url;
    if (!rawUrl) return nativeFetch(input, init);

    let url;
    try {
      url = new URL(rawUrl, location.href);
    } catch {
      return nativeFetch(input, init);
    }

    const shouldRewriteAtlantaDate =
      url.origin === GATEWAY_ORIGIN &&
      url.pathname === "/rest/v1/v_gt_atlanta_ranked_feed" &&
      url.searchParams.has("event_date");

    if (!shouldRewriteAtlantaDate) return nativeFetch(input, init);

    url.searchParams.set("event_date", `gte.${dateInTimeZone(ATLANTA_TIME_ZONE)}`);
    const nextInput = typeof input === "string"
      ? url.toString()
      : new Request(url.toString(), input);

    return nativeFetch(nextInput, init);
  };
})();
