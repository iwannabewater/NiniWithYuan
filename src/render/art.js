((root) => {
  "use strict";

  // Shared art utilities: colour math, deterministic randomness, periodic
  // noise for seamless tiles, and cached offscreen sprites.
  //
  // Everything that draws a decorative layer is seeded from authored data, so
  // the same chapter always paints the same landscape and screenshots stay
  // reproducible. Offscreen canvases come from an injected factory; in Node
  // there is no canvas, and callers fall back to drawing directly.

  let canvasFactory = defaultCanvasFactory;
  const glowCache = new Map();
  const rgbCache = new Map();

  function defaultCanvasFactory(width, height) {
    if (typeof root.OffscreenCanvas === "function") {
      try {
        return new root.OffscreenCanvas(width, height);
      } catch {
        // Fall through to a DOM canvas.
      }
    }
    if (root.document && typeof root.document.createElement === "function") {
      const canvas = root.document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      return canvas;
    }
    return null;
  }

  function setCanvasFactory(factory) {
    canvasFactory = typeof factory === "function" ? factory : defaultCanvasFactory;
    glowCache.clear();
  }

  function createCanvas(width, height) {
    const w = Math.max(1, Math.ceil(width));
    const h = Math.max(1, Math.ceil(height));
    const canvas = canvasFactory(w, h);
    if (!canvas) return null;
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    return canvas;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(edge0, edge1, value) {
    const t = clamp((value - edge0) / (edge1 - edge0 || 1), 0, 1);
    return t * t * (3 - 2 * t);
  }

  // --- colour ---------------------------------------------------------------

  function hexToRgb(hex) {
    const key = String(hex);
    const cached = rgbCache.get(key);
    if (cached) return cached;
    let value = key.replace("#", "");
    if (value.length === 3) value = value.split("").map((c) => c + c).join("");
    const n = parseInt(value.slice(0, 6), 16) || 0;
    const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(key, rgb);
    return rgb;
  }

  function toHex(rgb) {
    return `#${rgb.map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0")).join("")}`;
  }

  /** `#rrggbb` at an alpha, as an rgba() string. */
  function rgba(hex, alpha) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r},${g},${b},${clamp(alpha, 0, 1).toFixed(3)})`;
  }

  /** Mix two hex colours in RGB space. */
  function mix(a, b, t) {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    return toHex([lerp(ca[0], cb[0], t), lerp(ca[1], cb[1], t), lerp(ca[2], cb[2], t)]);
  }

  /** Scale lightness: amount < 0 darkens toward black, > 0 lightens toward white. */
  function shade(hex, amount) {
    return amount < 0 ? mix(hex, "#000000", -amount) : mix(hex, "#ffffff", amount);
  }

  // --- deterministic randomness ----------------------------------------------

  function hashString(value) {
    let h = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /** Mulberry32: a small, fast, well-distributed seeded generator. */
  function rng(seed) {
    let a = (typeof seed === "string" ? hashString(seed) : seed >>> 0) || 1;
    const next = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.range = (min, max) => min + (max - min) * next();
    next.int = (min, max) => Math.floor(min + (max - min + 1) * next());
    next.pick = (list) => list[Math.floor(next() * list.length) % list.length];
    next.chance = (p) => next() < p;
    return next;
  }

  /**
   * Smooth periodic noise in [-1, 1]: a sum of sines whose frequencies are
   * integer multiples of the period, so a tile repeats with no seam.
   */
  function periodicNoise(seed, octaves = 5) {
    const random = rng(seed);
    const terms = [];
    for (let i = 0; i < octaves; i += 1) {
      const harmonic = i === 0 ? 1 : Math.round(2 + i * 2 + random() * 3);
      terms.push({ harmonic, phase: random() * Math.PI * 2, amplitude: 1 / (1 + i * 0.9) });
    }
    const total = terms.reduce((sum, term) => sum + term.amplitude, 0);
    return (x, period) => {
      const u = (x / period) * Math.PI * 2;
      let sum = 0;
      for (const term of terms) sum += Math.sin(u * term.harmonic + term.phase) * term.amplitude;
      return sum / total;
    };
  }

  // --- sprites ----------------------------------------------------------------

  /**
   * A cached soft radial glow, used in place of canvas `shadowBlur`, which is
   * expensive on mobile GPUs. Returns null when no canvas is available.
   */
  function glowSprite(color, radius, falloff = 0.55) {
    const r = Math.max(2, Math.round(radius));
    const key = `${color}|${r}|${falloff}`;
    if (glowCache.has(key)) return glowCache.get(key);
    const canvas = createCanvas(r * 2, r * 2);
    if (!canvas) {
      glowCache.set(key, null);
      return null;
    }
    const g = canvas.getContext("2d");
    const gradient = g.createRadialGradient(r, r, 0, r, r, r);
    gradient.addColorStop(0, rgba(color, 0.9));
    gradient.addColorStop(falloff * 0.5, rgba(color, 0.42));
    gradient.addColorStop(falloff, rgba(color, 0.14));
    gradient.addColorStop(1, rgba(color, 0));
    g.fillStyle = gradient;
    g.fillRect(0, 0, r * 2, r * 2);
    glowCache.set(key, canvas);
    return canvas;
  }

  /** Draw a cached glow centred at (x, y); falls back to a plain gradient. */
  function drawGlow(ctx, x, y, radius, color, alpha = 1) {
    if (alpha <= 0.002 || radius <= 0.5) return;
    const sprite = glowSprite(color, Math.min(256, radius));
    const previous = ctx.globalAlpha;
    ctx.globalAlpha = previous * clamp(alpha, 0, 1);
    if (sprite) {
      ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
    } else {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, rgba(color, 0.9));
      gradient.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = previous;
  }

  function clearSpriteCaches() {
    glowCache.clear();
  }

  const api = {
    setCanvasFactory,
    createCanvas,
    clamp,
    lerp,
    smoothstep,
    hexToRgb,
    rgba,
    mix,
    shade,
    hashString,
    rng,
    periodicNoise,
    glowSprite,
    drawGlow,
    clearSpriteCaches,
  };

  root.NiniYuanArt = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
