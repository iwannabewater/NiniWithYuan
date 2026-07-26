((root) => {
  "use strict";

  const STORAGE_KEY = "nini-yuan-save-v1";
  const SAVE_SCHEMA_VERSION = 4;
  const DEFAULT_LEVEL_COUNT = 15;

  const defaultSave = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    selected: "nini",
    unlocked: 1,
    totalCoins: 0,
    bestTimes: {},
    levelStars: {},
    // v2.0.0 — Astral Echo meta-progression records. Every map below is keyed by
    // an allow-listed chapter or achievement id and holds 1 for "recorded".
    marrow: {},
    wardens: {},
    flawless: {},
    achievements: {},
    clears: { nini: {}, yuan: {} },
    stats: { deaths: 0, stomps: 0, bestCombo: 0, wardenFlawless: 0, letters: 0 },
    assistUsed: false,
    settings: {
      volume: 70,
      touch: 76,
      touchOpacity: 68,
      hudScale: 100,
      shake: true,
      fx: true,
      bgmVolume: 60,
      assist: {
        enabled: false,
        invulnerable: false,
        infiniteSkill: false,
        extraJump: false,
        speed: 100,
      },
    },
  };

  const STAT_KEYS = ["deaths", "stomps", "bestCombo", "wardenFlawless", "letters"];

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function toFiniteNumber(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function sanitizeInteger(value, fallback, min, max) {
    const n = toFiniteNumber(value, fallback);
    return clamp(Math.floor(n), min, max);
  }

  function allowedRecordKey(key, allowedKeys) {
    if (allowedKeys && allowedKeys.size) return allowedKeys.has(key);
    return /^[a-z0-9_-]{1,48}$/i.test(key);
  }

  function sanitizeRecord(value, predicate, options = {}) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const allowedKeys = options.levelIds ? new Set(options.levelIds) : null;
    const result = {};
    for (const [key, raw] of Object.entries(value)) {
      if (!allowedRecordKey(key, allowedKeys)) continue;
      const n = Number(raw);
      if (predicate(n)) result[key] = n;
    }
    return result;
  }

  /**
   * Boolean-style records collapse to exactly 1, so a tampered save cannot
   * smuggle arbitrary numbers into achievement or collection counts. Any
   * positive finite marker counts as "recorded", which keeps the map readable if
   * a later schema stores something richer than 1 under the same key.
   */
  function sanitizeFlagRecord(value, allowedKeys) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    const allowed = allowedKeys && allowedKeys.length ? new Set(allowedKeys) : null;
    const result = {};
    for (const [key, raw] of Object.entries(value)) {
      if (!allowedRecordKey(key, allowed)) continue;
      const marker = raw === true ? 1 : Number(raw);
      if (Number.isFinite(marker) && marker > 0) result[key] = 1;
    }
    return result;
  }

  function sanitizeStats(raw = {}) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const stats = {};
    for (const key of STAT_KEYS) {
      stats[key] = sanitizeInteger(source[key], 0, 0, 9999999);
    }
    return stats;
  }

  /**
   * Chapters cleared by each character, keyed by chapter id. Storing ids rather
   * than a counter means replaying one chapter cannot inflate the total.
   */
  function sanitizeClears(raw = {}, levelIds = null) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      nini: sanitizeFlagRecord(source.nini, levelIds),
      yuan: sanitizeFlagRecord(source.yuan, levelIds),
    };
  }

  function sanitizeAssist(raw = {}) {
    const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const defaults = defaultSave.settings.assist;
    return {
      enabled: source.enabled === true,
      invulnerable: source.invulnerable === true,
      infiniteSkill: source.infiniteSkill === true,
      extraJump: source.extraJump === true,
      speed: sanitizeInteger(source.speed, defaults.speed, 60, 100),
    };
  }

  function sanitizeSettings(raw = {}) {
    const settings = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      volume: sanitizeInteger(settings.volume, defaultSave.settings.volume, 0, 100),
      touch: sanitizeInteger(settings.touch, defaultSave.settings.touch, 64, 84),
      touchOpacity: sanitizeInteger(settings.touchOpacity, defaultSave.settings.touchOpacity, 45, 100),
      hudScale: sanitizeInteger(settings.hudScale, defaultSave.settings.hudScale, 90, 140),
      shake: settings.shake !== false,
      fx: settings.fx !== false,
      bgmVolume: sanitizeInteger(settings.bgmVolume, defaultSave.settings.bgmVolume, 0, 100),
      assist: sanitizeAssist(settings.assist),
    };
  }

  function sanitizeSave(raw = {}, options = {}) {
    const data = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const levelCount = Math.max(1, Number(options.levelCount) || DEFAULT_LEVEL_COUNT);
    const bestTimes = sanitizeRecord(data.bestTimes, (n) => Number.isFinite(n) && n > 0 && n < 36000, options);
    const levelStars = sanitizeRecord(data.levelStars, (n) => Number.isInteger(n) && n >= 0 && n <= 3, options);
    const levelIds = Array.isArray(options.levelIds) ? options.levelIds : null;
    let unlocked = sanitizeInteger(data.unlocked, defaultSave.unlocked, 1, levelCount);
    if (levelCount >= 6 && (bestTimes.auroracitadel || levelStars.auroracitadel > 0)) {
      unlocked = Math.max(unlocked, 6);
    }
    if (levelCount >= 9 && (bestTimes.ringconservatory || levelStars.ringconservatory > 0)) {
      unlocked = Math.max(unlocked, 9);
    }
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      selected: data.selected === "yuan" ? "yuan" : "nini",
      unlocked,
      totalCoins: sanitizeInteger(data.totalCoins, defaultSave.totalCoins, 0, Number.MAX_SAFE_INTEGER),
      bestTimes,
      levelStars,
      marrow: sanitizeFlagRecord(data.marrow, levelIds),
      wardens: sanitizeFlagRecord(data.wardens, levelIds),
      flawless: sanitizeFlagRecord(data.flawless, levelIds),
      achievements: sanitizeFlagRecord(data.achievements, options.achievementIds),
      clears: sanitizeClears(data.clears, levelIds),
      stats: sanitizeStats(data.stats),
      assistUsed: data.assistUsed === true,
      settings: sanitizeSettings(data.settings),
    };
  }

  function getStorage(options = {}) {
    if (options.storage) return options.storage;
    return root.localStorage;
  }

  function loadSave(options = {}) {
    try {
      const storage = getStorage(options);
      const raw = JSON.parse(storage.getItem(STORAGE_KEY) || "{}");
      return sanitizeSave(raw, options);
    } catch {
      return sanitizeSave({}, options);
    }
  }

  function persist(save, options = {}) {
    try {
      const storage = getStorage(options);
      const sanitized = sanitizeSave(save, options);
      storage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
      return true;
    } catch {
      if (typeof options.onError === "function") options.onError();
      return false;
    }
  }

  const api = {
    STORAGE_KEY,
    SAVE_SCHEMA_VERSION,
    defaultSave,
    cloneDefaultSave: () => clone(defaultSave),
    sanitizeSave,
    loadSave,
    persist,
  };

  root.NiniYuanStorage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
