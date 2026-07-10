((root) => {
  "use strict";

  const BASE_AMMO_CAP = 14;
  const RESERVE_AMMO_CAP = 24;
  const DEFAULT_PLAYER_HEIGHT = 56;
  const OUTCOME_DEATH = "death";
  const OUTCOME_COMPLETE = "complete";

  function finiteNumber(value, fallback = 0) {
    try {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    } catch {
      return fallback;
    }
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function calculateStarRating(collectedValue, totalCollectibleValue) {
    const total = Math.max(0, finiteNumber(totalCollectibleValue));
    if (total <= 0) return 1;
    const collected = clamp(finiteNumber(collectedValue), 0, total);
    const ratio = collected / total;
    if (ratio > 0.82) return 3;
    if (ratio > 0.52) return 2;
    return 1;
  }

  function clampAmmo(value, cap = RESERVE_AMMO_CAP) {
    const limit = finiteNumber(cap) <= BASE_AMMO_CAP ? BASE_AMMO_CAP : RESERVE_AMMO_CAP;
    return Math.floor(clamp(finiteNumber(value), 0, limit));
  }

  function resolveTerminalOutcome(state = {}) {
    const settledOutcome = state && typeof state === "object" ? state.settledOutcome : null;
    if (state && state.isDead === true) return OUTCOME_DEATH;
    if (settledOutcome === OUTCOME_DEATH || settledOutcome === OUTCOME_COMPLETE) return settledOutcome;
    if (state && state.reachedGoal === true) return OUTCOME_COMPLETE;
    return null;
  }

  function groundedSpawnY(platformTop, playerHeight = DEFAULT_PLAYER_HEIGHT) {
    const top = Math.max(0, finiteNumber(platformTop));
    const heightValue = finiteNumber(playerHeight, DEFAULT_PLAYER_HEIGHT);
    const height = heightValue > 0 ? heightValue : DEFAULT_PLAYER_HEIGHT;
    return Math.max(0, top - Math.min(height, top));
  }

  const api = {
    BASE_AMMO_CAP,
    RESERVE_AMMO_CAP,
    DEFAULT_PLAYER_HEIGHT,
    OUTCOME_DEATH,
    OUTCOME_COMPLETE,
    calculateStarRating,
    clampAmmo,
    resolveTerminalOutcome,
    groundedSpawnY,
  };

  root.NiniRules = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
