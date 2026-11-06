(function () {
  const config = window.MARVEL_STATS || {};
  const collectUrl = typeof config.collectUrl === "string" ? config.collectUrl.trim() : "";
  if (!collectUrl) return;

  const path = window.location.pathname || "/";
  const payload = JSON.stringify({ path });

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon(collectUrl, blob);
      return;
    }
  } catch {
    /* fall through to fetch */
  }

  fetch(collectUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
    mode: "cors",
  }).catch(() => {});
})();
