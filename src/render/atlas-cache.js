((root) => {
  "use strict";

  // Display-ready copies of the protagonist atlases.
  //
  // The authored atlases are large paintings (320 px cells) shown at roughly a
  // third of that size. Filtering that reduction on every frame is wasteful
  // and, at low quality, shimmers. Instead each atlas is reduced once to the
  // size it will actually occupy on screen, by repeated halving so detail is
  // averaged rather than skipped, then graded for the chapter's night light.
  // A matching silhouette in moonlight colour supplies the rim light, and each
  // cell's lowest painted row is measured so every pose stands on the ground
  // rather than on the empty margin below its feet.
  //
  // Scales are quantized so a viewport change or a power-up size change
  // reuses a nearby cache instead of rebuilding every frame.

  const Art = dependency("NiniYuanArt", "./art.js");

  const SCALE_STEP = 0.04;
  const MIN_SCALE = 0.12;
  const MAX_SCALE = 1;
  const MAX_ENTRIES = 6;

  // Night grades: a faint wash of the chapter's ambient light over the paint,
  // and the colour of the rim the moon leaves on the silhouette.
  const GRADES = Object.freeze({
    world1: Object.freeze({ tint: "#2b2346", alpha: 0.14, rim: "#f3e6d0" }),
    world2: Object.freeze({ tint: "#123241", alpha: 0.14, rim: "#d9f2ec" }),
    world3: Object.freeze({ tint: "#14213a", alpha: 0.18, rim: "#dcecff" }),
    world4: Object.freeze({ tint: "#221c3c", alpha: 0.15, rim: "#f6efe0" }),
    neutral: Object.freeze({ tint: "#000000", alpha: 0, rim: "#f3ead8" }),
  });

  const entries = [];

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the atlas cache`);
  }

  function quantize(scale) {
    const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    return Math.round(clamped / SCALE_STEP) * SCALE_STEP;
  }

  function gradeFor(worldId) {
    return GRADES[worldId] || GRADES.neutral;
  }

  /** Reduce `image` to `scale` by successive halving, then one final step. */
  function reduce(image, scale) {
    let source = image;
    let w = image.naturalWidth || image.width;
    let h = image.naturalHeight || image.height;
    const targetW = Math.max(1, Math.round(w * scale));
    const targetH = Math.max(1, Math.round(h * scale));
    while (w / 2 >= targetW * 1.0001 && h / 2 >= targetH) {
      const half = Art.createCanvas(Math.ceil(w / 2), Math.ceil(h / 2));
      if (!half) return null;
      const g = half.getContext("2d");
      g.imageSmoothingEnabled = true;
      g.imageSmoothingQuality = "high";
      g.drawImage(source, 0, 0, w, h, 0, 0, half.width, half.height);
      source = half;
      w = half.width;
      h = half.height;
    }
    const out = Art.createCanvas(targetW, targetH);
    if (!out) return null;
    const g = out.getContext("2d");
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = "high";
    g.drawImage(source, 0, 0, w, h, 0, 0, targetW, targetH);
    return out;
  }

  /**
   * Lowest painted row of every cell, as a fraction of cell height. Cells
   * that cannot be read (or are empty) report 1: the cell's own bottom edge.
   */
  function measureBaselines(canvas, cellW, cellH) {
    const columns = Math.max(1, Math.round(canvas.width / cellW));
    const rows = Math.max(1, Math.round(canvas.height / cellH));
    const baselines = new Float32Array(columns * rows).fill(1);
    let data = null;
    try {
      data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    } catch {
      return baselines;
    }
    if (!data || data.length < canvas.width * canvas.height * 4) return baselines;
    for (let cell = 0; cell < baselines.length; cell += 1) {
      const x0 = Math.round((cell % columns) * cellW);
      const y0 = Math.round(Math.floor(cell / columns) * cellH);
      const x1 = Math.min(canvas.width, Math.round(x0 + cellW));
      const y1 = Math.min(canvas.height, Math.round(y0 + cellH));
      let lowest = -1;
      for (let y = y1 - 1; y >= y0 && lowest < 0; y -= 1) {
        const row = y * canvas.width * 4;
        for (let x = x0; x < x1; x += 1) {
          if (data[row + x * 4 + 3] > 60) {
            lowest = y;
            break;
          }
        }
      }
      if (lowest >= 0) baselines[cell] = Math.min(1, (lowest + 1 - y0) / Math.max(1, y1 - y0));
    }
    return baselines;
  }

  function build(image, scale, worldId, frame) {
    const reduced = reduce(image, scale);
    if (!reduced) return null;
    const k = reduced.width / (image.naturalWidth || image.width);
    const baselines = frame ? measureBaselines(reduced, frame.w * k, frame.h * k) : null;
    const grade = gradeFor(worldId);
    if (grade.alpha > 0) {
      const g = reduced.getContext("2d");
      g.globalCompositeOperation = "source-atop";
      g.globalAlpha = grade.alpha;
      g.fillStyle = grade.tint;
      g.fillRect(0, 0, reduced.width, reduced.height);
      g.globalAlpha = 1;
      g.globalCompositeOperation = "source-over";
    }
    const silhouette = Art.createCanvas(reduced.width, reduced.height);
    if (silhouette) {
      const g = silhouette.getContext("2d");
      g.drawImage(reduced, 0, 0);
      // Only the opaque core casts a rim; translucent gauze would otherwise be
      // backed by moonlight and wash out.
      try {
        const pixels = g.getImageData(0, 0, silhouette.width, silhouette.height);
        const data = pixels.data;
        for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 200 ? 255 : 0;
        g.putImageData(pixels, 0, 0);
      } catch {
        // Unreadable canvas: keep the plain silhouette.
      }
      g.globalCompositeOperation = "source-in";
      g.fillStyle = grade.rim;
      g.fillRect(0, 0, silhouette.width, silhouette.height);
      g.globalCompositeOperation = "source-over";
    }
    return { canvas: reduced, silhouette, scale: k, baselines };
  }

  /**
   * The display copy of `image` for a device-pixel `scale` (with per-cell
   * baselines when the atlas `frame` size is given), or null while the
   * image is still loading or no canvas is available (callers then draw the
   * source image directly).
   */
  function get(image, scale, worldId, frame = null) {
    if (!image || !(image.naturalWidth || image.width)) return null;
    const key = quantize(scale);
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entry.image === image && entry.key === key && entry.worldId === worldId) {
        if (i > 0) {
          entries.splice(i, 1);
          entries.unshift(entry);
        }
        return entry.cache;
      }
    }
    const cache = build(image, key, worldId, frame);
    if (!cache) return null;
    entries.unshift({ image, key, worldId, cache });
    if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
    return cache;
  }

  function clear() {
    entries.length = 0;
  }

  const api = { SCALE_STEP, GRADES, quantize, gradeFor, measureBaselines, get, clear };

  root.NiniYuanAtlasCache = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
