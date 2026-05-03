((root) => {
  "use strict";

  const TONES = ["", "tone-rose", "tone-jade", "tone-cyan"];
  const MAX_PARTICLES = 56;
  const MIN_INTERVAL_MS = 12;
  const TRAIL_STEP_PX = 18;
  const MAX_SPARKS_PER_MOVE = 5;
  let sharedLayer = null;
  let attachmentCount = 0;
  let activeParticles = 0;

  function getSharedLayer(container) {
    if (!sharedLayer) {
      sharedLayer = document.createElement("div");
      sharedLayer.className = "cursor-trail";
      sharedLayer.setAttribute("aria-hidden", "true");
      container.appendChild(sharedLayer);
    }
    attachmentCount += 1;
    return sharedLayer;
  }

  function releaseSharedLayer(layer) {
    attachmentCount = Math.max(0, attachmentCount - 1);
    if (attachmentCount > 0 || layer !== sharedLayer) return;
    sharedLayer.remove();
    sharedLayer = null;
    activeParticles = 0;
  }

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
    const layer = getSharedLayer(container);

    let lastEmit = 0;
    let lastPoint = null;
    const onEnter = () => {
      lastEmit = 0;
      lastPoint = null;
    };
    const onLeave = () => {
      lastEmit = 0;
      lastPoint = null;
    };
    const emitSpark = (x, y, age = 0) => {
      if (activeParticles >= MAX_PARTICLES) return false;
      const spark = document.createElement("span");
      const tone = TONES[Math.floor(Math.random() * TONES.length)];
      spark.className = tone ? `cursor-spark ${tone}` : "cursor-spark";
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      const drift = (Math.random() - 0.5) * 24;
      const rise = 30 + Math.random() * 24;
      const size = 7 + Math.random() * 5;
      spark.style.setProperty("--drift", `${drift}px`);
      spark.style.setProperty("--rise", `-${rise}px`);
      spark.style.setProperty("--drift-mid", `${drift * 0.45}px`);
      spark.style.setProperty("--rise-mid", `-${rise * 0.45}px`);
      spark.style.setProperty("--size", `${size}px`);
      spark.style.animationDelay = `${-Math.min(age, 180)}ms`;
      spark.addEventListener("animationend", () => {
        spark.remove();
        activeParticles = Math.max(0, activeParticles - 1);
      }, { once: true });
      layer.appendChild(spark);
      activeParticles += 1;
      return true;
    };
    const onMove = (event) => {
      const now = performance.now();
      if (now - lastEmit < MIN_INTERVAL_MS) return;
      const rect = layer.getBoundingClientRect();
      const point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      if (!lastPoint) {
        emitSpark(point.x, point.y);
        lastPoint = point;
        lastEmit = now;
        return;
      }
      const dx = point.x - lastPoint.x;
      const dy = point.y - lastPoint.y;
      const distance = Math.hypot(dx, dy);
      const count = Math.max(1, Math.min(MAX_SPARKS_PER_MOVE, Math.ceil(distance / TRAIL_STEP_PX)));
      for (let i = 1; i <= count; i += 1) {
        const ratio = i / count;
        if (!emitSpark(lastPoint.x + dx * ratio, lastPoint.y + dy * ratio, (1 - ratio) * 140)) break;
      }
      lastPoint = point;
      lastEmit = now;
    };

    target.addEventListener("pointerenter", onEnter);
    target.addEventListener("pointerleave", onLeave);
    target.addEventListener("pointermove", onMove);

    return function detach() {
      target.removeEventListener("pointerenter", onEnter);
      target.removeEventListener("pointerleave", onLeave);
      target.removeEventListener("pointermove", onMove);
      releaseSharedLayer(layer);
    };
  }

  function init() {
    const heroes = document.querySelector(".menu-heroes");
    if (heroes) attachCursorTrail(heroes);
    const brand = document.querySelector("#menu .brand h1");
    if (brand) attachCursorTrail(brand);
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
