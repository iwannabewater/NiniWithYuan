((root) => {
  "use strict";

  let veil = null;

  function ensureVeil() {
    if (veil?.isConnected) return veil;
    if (!root.document) return null;
    const host = root.document.getElementById("shell") || root.document.body;
    if (!host) return null;
    veil = root.document.createElement("div");
    veil.className = "respawn-veil";
    veil.setAttribute("aria-hidden", "true");
    veil.addEventListener("animationend", () => veil?.classList.remove("playing"));
    host.appendChild(veil);
    return veil;
  }

  function flash(durationMs = 180) {
    const el = ensureVeil();
    if (!el) return;
    el.style.setProperty("--respawn-veil-duration", `${Math.max(40, Number(durationMs) || 180)}ms`);
    el.classList.remove("playing");
    void el.offsetWidth;
    el.classList.add("playing");
  }

  function clear() {
    if (!veil) return;
    veil.classList.remove("playing");
    veil.remove();
    veil = null;
  }

  const api = { flash, clear };
  root.NiniYuanRespawnVeil = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
