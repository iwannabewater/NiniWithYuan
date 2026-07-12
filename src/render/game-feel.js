((root) => {
  "use strict";

  const HITSTOP_CAP_MS = 120;
  const MAX_LOOKAHEAD_X = 56;
  const MAX_LOOKAHEAD_Y = 30;

  let hitstopRemaining = 0;

  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const lerp = (a, b, t) => a + (b - a) * t;
  const moveToward = (current, target, amount) =>
    current < target ? Math.min(current + amount, target) : Math.max(current - amount, target);

  function prefersReducedMotion() {
    try {
      return !!root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    } catch {
      return false;
    }
  }

  function requestHitstop(ms) {
    if (prefersReducedMotion()) return;
    const amount = Number(ms);
    if (!Number.isFinite(amount) || amount <= 0) return;
    hitstopRemaining = Math.min(HITSTOP_CAP_MS, Math.max(hitstopRemaining, amount));
  }

  function consumeHitstop(dt) {
    const frameDt = Math.max(0, Number(dt) || 0);
    if (hitstopRemaining <= 0 || frameDt <= 0) return frameDt;
    const frozenSeconds = Math.min(frameDt, hitstopRemaining / 1000);
    hitstopRemaining = Math.max(0, hitstopRemaining - frozenSeconds * 1000);
    return Math.max(0, frameDt - frozenSeconds);
  }

  function resetHitstop() {
    hitstopRemaining = 0;
  }

  function horizontalVelocity(current, target, options = {}, dt = 0) {
    const velocity = Number(current) || 0;
    const desired = Number(target) || 0;
    const intent = clamp(Number(options.intent) || 0, -1, 1);
    const grounded = options.grounded === true;
    const turning = options.turning === true;
    const baseAcceleration = Math.max(0, Number(options.baseAcceleration) || 0);
    const reversing = intent !== 0 && velocity * intent < 0;
    let responseMultiplier = 1;
    if (turning) responseMultiplier = grounded ? 2 : 1.45;
    else if (reversing) responseMultiplier = grounded ? 1.7 : 1.35;
    else if (intent === 0 && desired === 0 && grounded) responseMultiplier = 1.7;
    return moveToward(velocity, desired, baseAcceleration * responseMultiplier * Math.max(0, Number(dt) || 0));
  }

  function cameraLookaheadOffset(player, view, dt, camera) {
    if (!player || !camera) return { x: 0, y: 0 };
    const moveIntent = clamp(Number(player.moveIntent) || 0, -1, 1);
    const velocityTarget = Math.sign(player.vx || 0) * Math.min(Math.abs(player.vx || 0), 500) / 500;
    const xTarget = moveIntent || velocityTarget;
    const changingDirection = moveIntent !== 0 && (Number(camera.lookX) || 0) * moveIntent < 0;
    const tX = 1 - Math.pow(changingDirection ? 0.00001 : 0.0035, Math.max(0, dt));
    const tY = 1 - Math.pow(0.001, Math.max(0, dt));
    const yTarget = clamp((player.vy || 0) / 600, -0.4, 0.6);
    camera.lookX = lerp(Number(camera.lookX) || 0, xTarget, tX);
    camera.lookY = lerp(Number(camera.lookY) || 0, yTarget, tY);
    const reduced = !!view?.reducedMotion || prefersReducedMotion();
    return {
      x: camera.lookX * (reduced ? 0 : MAX_LOOKAHEAD_X),
      y: camera.lookY * (reduced ? 0 : MAX_LOOKAHEAD_Y),
    };
  }

  function cameraLookaheadReset(camera) {
    if (!camera) return;
    camera.lookX = 0;
    camera.lookY = 0;
  }

  function interpolateCoordinate(previous, current, alpha, options = {}) {
    const from = Number(previous);
    const to = Number(current);
    if (!Number.isFinite(to)) return Number.isFinite(from) ? from : 0;
    if (!Number.isFinite(from) || options.snap === true) return to;
    const snapDistance = Math.max(0, Number(options.snapDistance) || 160);
    if (Math.abs(to - from) >= snapDistance) return to;
    const value = lerp(from, to, clamp(Number(alpha) || 0, 0, 1));
    const quantum = Math.max(0, Number(options.quantum) || 0);
    return quantum > 0 ? Math.round(value / quantum) * quantum : value;
  }

  function shouldSyncPresentationAfterHitstop(options = {}) {
    const before = Math.max(0, Number(options.before) || 0);
    const after = Math.max(0, Number(options.after) || 0);
    const steps = Math.max(0, Math.floor(Number(options.steps) || 0));
    return before > 0 && after === 0 && steps === 0;
  }

  function clampShake(currentShake, eventShake, isMobileLandscape, isReducedMotion) {
    const multiplier = isReducedMotion ? 0.3 : isMobileLandscape ? 0.65 : 1;
    return Math.max(Number(currentShake) || 0, (Number(eventShake) || 0) * multiplier);
  }

  function landingPuff(spawnSparkFn, x, y, intensity, fxOn) {
    if (!fxOn || typeof spawnSparkFn !== "function") return;
    const count = Math.round(3 + clamp(Number(intensity) || 0, 0.2, 1) * 5);
    spawnSparkFn(x, y, "#e7d8b5", count);
  }

  const api = {
    requestHitstop,
    consumeHitstop,
    resetHitstop,
    horizontalVelocity,
    cameraLookaheadOffset,
    cameraLookaheadReset,
    interpolateCoordinate,
    shouldSyncPresentationAfterHitstop,
    clampShake,
    landingPuff,
    getHitstopRemaining: () => hitstopRemaining,
  };

  root.NiniYuanGameFeel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
