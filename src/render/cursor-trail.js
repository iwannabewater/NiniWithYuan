((root) => {
  "use strict";

  const TONES = ["", "tone-rose", "tone-jade"];
  const MAX_PARTICLES = 32;
  const MIN_INTERVAL_MS = 28;

  function attachCursorTrail(target, options = {}) {
    if (!target) return () => {};
    if (typeof window === "undefined") return () => {};
    const matchMedia = window.matchMedia ? window.matchMedia.bind(window) : null;
    if (!matchMedia) return () => {};
    const fineHover = matchMedia("(hover: hover) and (pointer: fine)");
    if (!fineHover.matches) return () => {};
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
    if (reduceMotion.matches) return () => {};

    const container = options.container || document.body;
    const layer = document.createElement("div");
    layer.className = "cursor-trail";
    layer.setAttribute("aria-hidden", "true");
    container.appendChild(layer);

    let lastEmit = 0;
    let active = 0;
    const onEnter = () => { lastEmit = 0; };
    const onLeave = () => { lastEmit = 0; };
    const onMove = (event) => {
      const now = performance.now();
      if (now - lastEmit < MIN_INTERVAL_MS) return;
      if (active >= MAX_PARTICLES) return;
      lastEmit = now;
      const rect = layer.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const spark = document.createElement("span");
      const tone = TONES[Math.floor(Math.random() * TONES.length)];
      spark.className = tone ? `cursor-spark ${tone}` : "cursor-spark";
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      const drift = (Math.random() - 0.5) * 14;
      spark.style.setProperty("--drift", `${drift}px`);
      spark.addEventListener("animationend", () => {
        spark.remove();
        active = Math.max(0, active - 1);
      }, { once: true });
      layer.appendChild(spark);
      active += 1;
    };

    target.addEventListener("pointerenter", onEnter);
    target.addEventListener("pointerleave", onLeave);
    target.addEventListener("pointermove", onMove);

    return function detach() {
      target.removeEventListener("pointerenter", onEnter);
      target.removeEventListener("pointerleave", onLeave);
      target.removeEventListener("pointermove", onMove);
      layer.remove();
    };
  }

  function init() {
    const heroes = document.querySelector(".menu-heroes");
    if (heroes) attachCursorTrail(heroes, { container: heroes });
    const brand = document.querySelector("#menu .brand h1");
    if (brand) attachCursorTrail(brand, { container: brand });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    } else {
      init();
    }
  }

  const api = { attachCursorTrail };
  root.NiniYuanCursorTrail = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
