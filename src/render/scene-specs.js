((root) => {
  "use strict";

  // Art direction for every chapter backdrop: a nocturnal
  // blue-green landscape scroll. Ranges are painted in the mineral palette of
  // Song court landscapes (azurite crowns, malachite slopes, umber feet) and
  // then pushed into moonlight. Each world owns a silhouette grammar; each
  // chapter picks its sky, celestial body, architecture, flora, the world
  // beneath the floating isles, and ambient life.
  //
  // Presentation data only. Nothing here is read by the simulation.

  const RANGE_PRESETS = Object.freeze({
    // Mineral blue-green, night tuned. Far ranges sit closer to the sky.
    qinglu: Object.freeze({ crown: "#3c7782", slope: "#2a5a55", foot: "#1d2b2c", ink: "#070b10", rim: "#d6e6dc" }),
    plum: Object.freeze({ crown: "#5d5a86", slope: "#3b3c61", foot: "#1d1f33", ink: "#08090f", rim: "#f2d6e0" }),
    cliff: Object.freeze({ crown: "#4b6c86", slope: "#2e4660", foot: "#161f2c", ink: "#06090e", rim: "#dfe9f2" }),
    ember: Object.freeze({ crown: "#6a4a5c", slope: "#432f40", foot: "#1d141c", ink: "#090507", rim: "#ffcf9a" }),
    snow: Object.freeze({ crown: "#9fb6c6", slope: "#4a6582", foot: "#1b2638", ink: "#06090f", rim: "#f6f2ff" }),
    isle: Object.freeze({ crown: "#3f7c7a", slope: "#2a5654", foot: "#152427", ink: "#05090b", rim: "#d4f1ea" }),
    mirror: Object.freeze({ crown: "#4f7f95", slope: "#2e5468", foot: "#14232e", ink: "#050a0f", rim: "#dff4ff" }),
    river: Object.freeze({ crown: "#5a6e9c", slope: "#34446f", foot: "#161d33", ink: "#06070f", rim: "#fbefd6" }),
  });

  function ranges(preset, layers) {
    return layers.map((layer) => ({ colors: RANGE_PRESETS[preset], ...layer }));
  }

  const WORLD_DEFAULTS = Object.freeze({
    world1: {
      sky: { top: "#0b1022", mid: "#1b2246", horizon: "#4c3a62", glow: "#e3a6b6" },
      stars: { density: 0.9, tint: "#efe4c8" },
      celestial: { kind: "moon", x: 0.78, y: 0.2, size: 0.085, color: "#f4ead2" },
      ranges: ranges("qinglu", [
        { parallax: 0.06, horizon: 0.6, height: 0.3, peaks: 6, sharpness: 0.55, mist: 0.55, res: 0.5 },
        { parallax: 0.14, horizon: 0.7, height: 0.32, peaks: 5, sharpness: 0.62, mist: 0.45, res: 0.6 },
        { parallax: 0.26, horizon: 0.82, height: 0.3, peaks: 4, sharpness: 0.7, mist: 0.3, res: 0.75 },
      ]),
      structures: [{ layer: 1, kinds: ["pavilion", "pagoda"], count: 2 }, { layer: 2, kinds: ["pavilion"], count: 1 }],
      flora: { layer: 2, kinds: ["pine"], count: 5 },
      below: { kind: "mist", color: "#3a3c63" },
      ambient: { kinds: ["mote"], count: 26 },
    },
    world2: {
      sky: { top: "#071423", mid: "#0f2a42", horizon: "#24566a", glow: "#bfe8e4" },
      stars: { density: 1, tint: "#e6f1ea" },
      celestial: { kind: "moon", x: 0.24, y: 0.18, size: 0.07, color: "#eef3e2" },
      ranges: ranges("isle", [
        { parallax: 0.05, horizon: 0.66, height: 0.16, peaks: 9, sharpness: 0.4, mist: 0.6, res: 0.5, islands: true },
        { parallax: 0.13, horizon: 0.74, height: 0.22, peaks: 6, sharpness: 0.5, mist: 0.45, res: 0.6, islands: true },
        { parallax: 0.24, horizon: 0.84, height: 0.24, peaks: 4, sharpness: 0.58, mist: 0.3, res: 0.75, islands: true },
      ]),
      structures: [{ layer: 1, kinds: ["moongate", "pavilion"], count: 2 }],
      flora: { layer: 2, kinds: ["pine", "bamboo"], count: 4 },
      below: { kind: "starsea", color: "#0e2a3c" },
      ambient: { kinds: ["mote", "sparkle"], count: 30 },
    },
    world3: {
      sky: { top: "#050f1c", mid: "#0c2236", horizon: "#1f4d63", glow: "#b6f0f2" },
      stars: { density: 1.1, tint: "#dff4ff" },
      celestial: { kind: "moon", x: 0.7, y: 0.17, size: 0.08, color: "#e8f6ff" },
      ranges: ranges("mirror", [
        { parallax: 0.05, horizon: 0.62, height: 0.2, peaks: 7, sharpness: 0.5, mist: 0.6, res: 0.5 },
        { parallax: 0.13, horizon: 0.72, height: 0.24, peaks: 5, sharpness: 0.58, mist: 0.45, res: 0.6 },
        { parallax: 0.24, horizon: 0.82, height: 0.2, peaks: 4, sharpness: 0.5, mist: 0.35, res: 0.75 },
      ]),
      structures: [{ layer: 1, kinds: ["pavilion"], count: 2 }],
      flora: { layer: 2, kinds: ["reeds"], count: 7 },
      below: { kind: "mirror", color: "#0b2232" },
      ambient: { kinds: ["mote", "sparkle"], count: 32 },
    },
    world4: {
      sky: { top: "#070a1c", mid: "#151a3c", horizon: "#3b3a6a", glow: "#f6dcb0" },
      stars: { density: 1.4, tint: "#fff3dc" },
      celestial: { kind: "starRiver", x: 0.5, y: 0.25, size: 0.2, color: "#fff1d6" },
      ranges: ranges("river", [
        { parallax: 0.05, horizon: 0.64, height: 0.22, peaks: 7, sharpness: 0.45, mist: 0.6, res: 0.5 },
        { parallax: 0.13, horizon: 0.74, height: 0.26, peaks: 5, sharpness: 0.55, mist: 0.45, res: 0.6 },
        { parallax: 0.24, horizon: 0.84, height: 0.24, peaks: 4, sharpness: 0.6, mist: 0.3, res: 0.75 },
      ]),
      structures: [{ layer: 1, kinds: ["pavilion", "paifang"], count: 2 }],
      flora: { layer: 2, kinds: ["willow"], count: 4 },
      below: { kind: "starsea", color: "#141a3a" },
      ambient: { kinds: ["mote", "feather"], count: 30 },
    },
  });

  // Chapter signatures layered over the world defaults.
  const CHAPTER_SCENES = Object.freeze({
    sakura: {
      sky: { top: "#0c0f22", mid: "#211f45", horizon: "#5c3a5f", glow: "#f0aebd" },
      celestial: { kind: "crescent", x: 0.8, y: 0.2, size: 0.07, color: "#f7e8d0" },
      ranges: ranges("plum", [
        { parallax: 0.06, horizon: 0.62, height: 0.22, peaks: 7, sharpness: 0.35, mist: 0.55, res: 0.5 },
        { parallax: 0.14, horizon: 0.72, height: 0.24, peaks: 5, sharpness: 0.4, mist: 0.45, res: 0.6 },
        { parallax: 0.26, horizon: 0.84, height: 0.22, peaks: 4, sharpness: 0.45, mist: 0.3, res: 0.75 },
      ]),
      structures: [{ layer: 1, kinds: ["pavilion", "paifang"], count: 2 }, { layer: 2, kinds: ["moongate"], count: 1 }],
      flora: { layer: 2, kinds: ["plum", "willow"], count: 6 },
      below: { kind: "mist", color: "#3e3561" },
      ambient: { kinds: ["petal", "firefly"], count: 34 },
    },
    moonruin: {
      celestial: { kind: "moon", x: 0.66, y: 0.22, size: 0.13, color: "#eef2f6" },
      ranges: ranges("cliff", [
        { parallax: 0.06, horizon: 0.6, height: 0.34, peaks: 6, sharpness: 0.75, mist: 0.5, res: 0.5 },
        { parallax: 0.14, horizon: 0.72, height: 0.32, peaks: 5, sharpness: 0.8, mist: 0.4, res: 0.6 },
        { parallax: 0.26, horizon: 0.84, height: 0.26, peaks: 4, sharpness: 0.8, mist: 0.3, res: 0.75 },
      ]),
      structures: [{ layer: 1, kinds: ["ruin"], count: 3 }, { layer: 2, kinds: ["ruin", "pagoda"], count: 2 }],
      flora: { layer: 2, kinds: ["pine"], count: 4 },
      below: { kind: "mirror", color: "#14233a" },
      ambient: { kinds: ["mote"], count: 28 },
    },
    cloudsea: {
      sky: { top: "#0a1630", mid: "#1d3a62", horizon: "#4f6f8f", glow: "#f6d58e" },
      celestial: { kind: "moon", x: 0.2, y: 0.24, size: 0.06, color: "#fbefc8" },
      ranges: ranges("cliff", [
        { parallax: 0.05, horizon: 0.56, height: 0.3, peaks: 5, sharpness: 0.8, mist: 0.8, res: 0.5 },
        { parallax: 0.12, horizon: 0.66, height: 0.28, peaks: 4, sharpness: 0.85, mist: 0.75, res: 0.6 },
      ]),
      structures: [{ layer: 1, kinds: ["pagoda"], count: 1 }, { layer: 1, kinds: ["junk"], count: 3, onClouds: true }],
      flora: null,
      below: { kind: "cloudsea", color: "#5f7593" },
      ambient: { kinds: ["cloud", "bird"], count: 14 },
    },
    crystalforge: {
      sky: { top: "#0b0710", mid: "#21121f", horizon: "#5a2a2c", glow: "#ff9a5c" },
      stars: { density: 0.35, tint: "#ffd2a8" },
      celestial: { kind: "ember", x: 0.74, y: 0.22, size: 0.06, color: "#ff8f5a" },
      ranges: ranges("ember", [
        { parallax: 0.06, horizon: 0.58, height: 0.36, peaks: 8, sharpness: 0.85, mist: 0.35, res: 0.5 },
        { parallax: 0.14, horizon: 0.7, height: 0.34, peaks: 6, sharpness: 0.9, mist: 0.3, res: 0.6 },
        { parallax: 0.26, horizon: 0.84, height: 0.3, peaks: 5, sharpness: 0.9, mist: 0.2, res: 0.75 },
      ]),
      structures: [{ layer: 1, kinds: ["chimney"], count: 3 }, { layer: 2, kinds: ["crystals"], count: 4 }],
      flora: null,
      below: { kind: "lava", color: "#ff7a3c" },
      ambient: { kinds: ["ember"], count: 40 },
    },
    auroracitadel: {
      sky: { top: "#060a1c", mid: "#121b44", horizon: "#3a3f78", glow: "#c8b6ff" },
      celestial: { kind: "aurora", x: 0.5, y: 0.2, size: 0.22, color: "#9fe7c9" },
      ranges: ranges("snow", [
        { parallax: 0.06, horizon: 0.58, height: 0.38, peaks: 6, sharpness: 0.8, mist: 0.45, res: 0.5, snowline: 0.55 },
        { parallax: 0.14, horizon: 0.7, height: 0.34, peaks: 5, sharpness: 0.82, mist: 0.4, res: 0.6, snowline: 0.45 },
        { parallax: 0.26, horizon: 0.84, height: 0.26, peaks: 4, sharpness: 0.7, mist: 0.3, res: 0.75 },
      ]),
      structures: [{ layer: 1, kinds: ["palace"], count: 1 }, { layer: 2, kinds: ["pagoda", "pavilion"], count: 2 }],
      flora: { layer: 2, kinds: ["pine"], count: 4 },
      below: { kind: "mist", color: "#2c3364" },
      ambient: { kinds: ["mote", "snow"], count: 36 },
    },
    stargatecove: {
      structures: [{ layer: 1, kinds: ["moongate"], count: 3 }, { layer: 2, kinds: ["pavilion"], count: 1 }],
    },
    loopinglighthouse: {
      celestial: { kind: "moon", x: 0.82, y: 0.16, size: 0.06, color: "#f3f0dc" },
      structures: [{ layer: 1, kinds: ["lighthouse"], count: 2 }, { layer: 2, kinds: ["pavilion"], count: 1 }],
      ambient: { kinds: ["mote", "bird"], count: 18 },
    },
    ringconservatory: {
      sky: { top: "#061420", mid: "#0f2c38", horizon: "#2c5f5d", glow: "#ffd1e0" },
      structures: [{ layer: 1, kinds: ["rings"], count: 2 }, { layer: 2, kinds: ["moongate"], count: 1 }],
      flora: { layer: 2, kinds: ["bamboo", "plum"], count: 6 },
      ambient: { kinds: ["firefly", "petal"], count: 32 },
    },
    starbridgetide: {
      structures: [{ layer: 1, kinds: ["bridge"], count: 2 }, { layer: 2, kinds: ["pavilion"], count: 1 }],
      ambient: { kinds: ["sparkle", "mote"], count: 30 },
    },
    islandstarcore: {
      celestial: { kind: "starCore", x: 0.72, y: 0.24, size: 0.11, color: "#ffe9a8" },
      structures: [{ layer: 1, kinds: ["pagoda", "moongate"], count: 2 }],
      ambient: { kinds: ["mote", "sparkle"], count: 36 },
    },
    phaseshallows: {
      flora: { layer: 2, kinds: ["reeds", "lotus"], count: 8 },
    },
    tidecorridor: {
      structures: [{ layer: 1, kinds: ["colonnade"], count: 2 }, { layer: 2, kinds: ["pavilion"], count: 1 }],
      flora: { layer: 2, kinds: ["reeds"], count: 6 },
    },
    moonmirrorbreak: {
      celestial: { kind: "moon", x: 0.5, y: 0.2, size: 0.12, color: "#eef8ff" },
      structures: [{ layer: 1, kinds: ["bridge", "ruin"], count: 3 }],
    },
    twinstarclocktower: {
      celestial: { kind: "twinStars", x: 0.62, y: 0.2, size: 0.05, color: "#f6e3a8" },
      structures: [{ layer: 1, kinds: ["clocktower"], count: 2 }, { layer: 2, kinds: ["pavilion"], count: 1 }],
    },
    phasetidecourt: {
      celestial: { kind: "aurora", x: 0.5, y: 0.18, size: 0.2, color: "#8fe0e8" },
      structures: [{ layer: 1, kinds: ["palace"], count: 1 }, { layer: 2, kinds: ["colonnade"], count: 1 }],
      flora: { layer: 2, kinds: ["lotus", "reeds"], count: 6 },
    },
    riverford: {
      structures: [{ layer: 1, kinds: ["bridge", "pavilion"], count: 2 }, { layer: 2, kinds: ["paifang"], count: 1 }],
      flora: { layer: 2, kinds: ["willow", "reeds"], count: 6 },
      ambient: { kinds: ["feather", "sparkle"], count: 30 },
    },
    magpiebridge: {
      sky: { top: "#080b1e", mid: "#1a1f46", horizon: "#45406f", glow: "#ffd9b0" },
      structures: [{ layer: 1, kinds: ["bridge"], count: 2 }, { layer: 2, kinds: ["pavilion"], count: 1 }],
      ambient: { kinds: ["bird", "feather"], count: 20 },
    },
    weaverloom: {
      sky: { top: "#0a0a1f", mid: "#1f1d48", horizon: "#4a3c72", glow: "#f3c6e0" },
      celestial: { kind: "starRiver", x: 0.42, y: 0.22, size: 0.2, color: "#ffe7f0" },
      structures: [{ layer: 1, kinds: ["palace"], count: 1 }, { layer: 2, kinds: ["colonnade", "pavilion"], count: 2 }],
      flora: { layer: 2, kinds: ["plum", "willow"], count: 5 },
      ambient: { kinds: ["sparkle", "petal"], count: 30 },
    },
    herdsmanfield: {
      sky: { top: "#071022", mid: "#162a48", horizon: "#3c5a6e", glow: "#e9f0c8" },
      celestial: { kind: "twinStars", x: 0.5, y: 0.2, size: 0.05, color: "#f6e3a8" },
      ranges: ranges("qinglu", [
        { parallax: 0.05, horizon: 0.66, height: 0.18, peaks: 8, sharpness: 0.3, mist: 0.6, res: 0.5 },
        { parallax: 0.13, horizon: 0.76, height: 0.2, peaks: 6, sharpness: 0.35, mist: 0.45, res: 0.6 },
        { parallax: 0.24, horizon: 0.86, height: 0.18, peaks: 5, sharpness: 0.4, mist: 0.3, res: 0.75 },
      ]),
      structures: [{ layer: 1, kinds: ["pavilion"], count: 1 }],
      flora: { layer: 2, kinds: ["willow", "bamboo"], count: 7 },
      below: { kind: "mist", color: "#22344e" },
      ambient: { kinds: ["firefly", "mote"], count: 34 },
    },
    tiangoumoon: {
      sky: { top: "#0b0716", mid: "#22142e", horizon: "#5a2e3c", glow: "#ffb070" },
      stars: { density: 1.1, tint: "#ffe2c6" },
      celestial: { kind: "crescent", x: 0.7, y: 0.22, size: 0.12, color: "#ffd9a8" },
      structures: [{ layer: 1, kinds: ["palace", "pagoda"], count: 2 }, { layer: 2, kinds: ["paifang"], count: 1 }],
      below: { kind: "starsea", color: "#1c1230" },
      ambient: { kinds: ["ember", "feather"], count: 32 },
    },
    menu: {
      sky: { top: "#070b18", mid: "#141b38", horizon: "#3c3560", glow: "#e7b4a6" },
      celestial: { kind: "starRiver", x: 0.55, y: 0.22, size: 0.2, color: "#fff1d6" },
      ranges: ranges("qinglu", [
        { parallax: 0.06, horizon: 0.6, height: 0.3, peaks: 6, sharpness: 0.55, mist: 0.55, res: 0.5 },
        { parallax: 0.14, horizon: 0.72, height: 0.3, peaks: 5, sharpness: 0.62, mist: 0.45, res: 0.6 },
        { parallax: 0.26, horizon: 0.86, height: 0.28, peaks: 4, sharpness: 0.68, mist: 0.3, res: 0.75 },
      ]),
      structures: [{ layer: 1, kinds: ["pagoda", "pavilion"], count: 2 }, { layer: 2, kinds: ["pavilion"], count: 1 }],
      flora: { layer: 2, kinds: ["pine", "plum"], count: 5 },
      below: { kind: "mist", color: "#2e3159" },
      ambient: { kinds: ["firefly", "mote"], count: 30 },
    },
  });

  /** Resolve the scene for a chapter id, falling back to its world. */
  function sceneFor(chapterId, worldId) {
    const base = WORLD_DEFAULTS[worldId] || WORLD_DEFAULTS.world1;
    const chapter = CHAPTER_SCENES[chapterId] || {};
    return {
      id: chapterId,
      world: worldId,
      sky: { ...base.sky, ...(chapter.sky || {}) },
      stars: { ...base.stars, ...(chapter.stars || {}) },
      celestial: { ...base.celestial, ...(chapter.celestial || {}) },
      ranges: chapter.ranges || base.ranges,
      structures: chapter.structures || base.structures,
      flora: chapter.flora === undefined ? base.flora : chapter.flora,
      below: { ...base.below, ...(chapter.below || {}) },
      ambient: { ...base.ambient, ...(chapter.ambient || {}) },
    };
  }

  const api = { RANGE_PRESETS, WORLD_DEFAULTS, CHAPTER_SCENES, sceneFor };
  root.NiniYuanSceneSpecs = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
