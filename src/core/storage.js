((root) => {
  "use strict";

  const STORAGE_KEY = "nini-yuan-save-v1";
  const SAVE_SCHEMA_VERSION = 2;
  const DEFAULT_LEVEL_COUNT = 8;

  const defaultSave = {
    schemaVersion: SAVE_SCHEMA_VERSION,
    selected: "nini",
    unlocked: 1,
    totalCoins: 0,
    bestTimes: {},
    levelStars: {},
    settings: {
      volume: 70,
      touch: 98,
      fx: true,
      bgmVolume: 60,
    },
  };

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

  function sanitizeSettings(raw = {}) {
    const settings = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    return {
      volume: sanitizeInteger(settings.volume, defaultSave.settings.volume, 0, 100),
      touch: sanitizeInteger(settings.touch, defaultSave.settings.touch, 60, 140),
      fx: settings.fx !== false,
      bgmVolume: sanitizeInteger(settings.bgmVolume, defaultSave.settings.bgmVolume, 0, 100),
    };
  }

  function sanitizeSave(raw = {}, options = {}) {
    const data = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
    const levelCount = Math.max(1, Number(options.levelCount) || DEFAULT_LEVEL_COUNT);
    const bestTimes = sanitizeRecord(data.bestTimes, (n) => Number.isFinite(n) && n > 0 && n < 36000, options);
    const levelStars = sanitizeRecord(data.levelStars, (n) => Number.isInteger(n) && n >= 0 && n <= 3, options);
    let unlocked = sanitizeInteger(data.unlocked, defaultSave.unlocked, 1, levelCount);
    if (levelCount >= 6 && (bestTimes.auroracitadel || levelStars.auroracitadel > 0)) {
      unlocked = Math.max(unlocked, 6);
    }
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      selected: data.selected === "yuan" ? "yuan" : "nini",
      unlocked,
      totalCoins: sanitizeInteger(data.totalCoins, defaultSave.totalCoins, 0, Number.MAX_SAFE_INTEGER),
      bestTimes,
      levelStars,
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
