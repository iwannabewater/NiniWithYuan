((root) => {
  "use strict";

  // Hostile behaviour. Ranges and trigger distances are world-space constants:
  // a chapter must play identically on a phone and on a wide desktop, so
  // nothing here may read the viewport.

  const Physics = dependency("NiniYuanPhysics", "./physics.js");
  const World = dependency("NiniYuanWorld", "./world.js");

  const TILE = 48;
  const WISP_HOVER_RANGE = 6;
  const ENEMY_HIT_FLASH_DURATION = 0.18;
  const SENTRY_TELEGRAPH = 0.45;
  const SENTRY_RANGE = 560;
  const SENTRY_BOLT_SPEED = 330 * 0.82;

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the hostile rules`);
  }

  /** Star dew a hostile is worth before the chain multiplier. */
  function enemyReward(enemy) {
    if (enemy.type === "warder") return 4;
    if (enemy.type === "sentry") return 3;
    if (enemy.type === "wisp") return 3;
    return 2;
  }

  function enemyHitPoints(enemy) {
    if (enemy.type === "sentry") return 2;
    if (enemy.type === "ember") return 3;
    return 2;
  }

  /** Shelled hostiles ignore projectiles; only impact answers them. */
  function resistsProjectiles(enemy) {
    return enemy?.type === "warder";
  }

  function updateEnemies(world, dt) {
    for (const e of world.level.enemies) {
      if (!e.alive) continue;
      e.hitTimer = Math.max(0, (e.hitTimer || 0) - dt);
      e.phase += dt;
      if (e.type === "sentry") {
        updateSentry(world, e, dt);
        continue;
      }
      if (e.type === "wisp") {
        e.y = e.baseY + Math.sin(e.phase * 4) * WISP_HOVER_RANGE;
        e.x += e.vx * dt;
        if (Math.abs(e.x - e.baseX) > e.patrol) {
          e.x = e.baseX + Math.sign(e.x - e.baseX) * e.patrol;
          e.vx *= -1;
        }
        continue;
      }

      const support = World.supportPlatform(world, e);
      if (!support) {
        e.vx *= -1;
        continue;
      }

      e.y = support.y - e.h;
      const minX = support.x + 3;
      const maxX = support.x + support.w - e.w - 3;
      if (maxX <= minX) {
        e.x = Physics.clamp(e.x, support.x, support.x + Math.max(0, support.w - e.w));
        continue;
      }
      let nextX = e.x + e.vx * dt;
      if (nextX < minX || nextX > maxX) {
        nextX = Physics.clamp(nextX, minX, maxX);
        e.vx *= -1;
      }
      e.x = nextX;
      e.y = support.y - e.h;
    }
  }

  /**
   * 哨星 sentry. A fixed emplacement that faces the player, telegraphs for a
   * readable beat, then fires one slow bolt. It never moves, so the answer is
   * always positioning rather than reaction speed.
   */
  function updateSentry(world, e, dt) {
    const player = world.player;
    const support = World.supportPlatform(world, e);
    if (support) e.y = support.y - e.h;
    const toPlayer = player.x + player.w / 2 - (e.x + e.w / 2);
    if (Math.abs(toPlayer) > 24) e.facing = Math.sign(toPlayer);
    const inRange = Math.abs(toPlayer) < SENTRY_RANGE && Math.abs(player.y - e.y) < TILE * 6;
    if (!inRange) {
      e.fireTimer = Math.min(e.fireTimer, e.cadence * 0.5);
      return;
    }
    e.fireTimer -= dt;
    if (e.fireTimer > 0) return;
    e.fireTimer = e.cadence;
    world.bolts.push({
      x: e.x + e.w / 2 - 8 + e.facing * 16,
      y: e.y + e.h * 0.34,
      w: 16,
      h: 16,
      vx: e.facing * SENTRY_BOLT_SPEED,
      vy: -30,
      life: 2.6,
      kind: "sentry",
    });
    World.emit(world, "burst", { x: e.x + e.w / 2 + e.facing * 18, y: e.y + e.h * 0.4, tone: "danger", count: 6 });
    World.emit(world, "cue", { name: "sentry_fire" });
  }

  /** Sentry charge in [0, 1] for the telegraph ring; presentation only. */
  function sentryCharge(enemy) {
    return Physics.clamp(1 - enemy.fireTimer / Math.max(0.01, SENTRY_TELEGRAPH), 0, 1);
  }

  const api = {
    WISP_HOVER_RANGE,
    ENEMY_HIT_FLASH_DURATION,
    SENTRY_TELEGRAPH,
    SENTRY_RANGE,
    enemyReward,
    enemyHitPoints,
    resistsProjectiles,
    updateEnemies,
    updateSentry,
    sentryCharge,
  };

  root.NiniYuanEnemySim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
