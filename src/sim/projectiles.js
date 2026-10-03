((root) => {
  "use strict";

  // Player projectiles and hostile bolts.

  const Physics = dependency("NiniYuanPhysics", "./physics.js");
  const World = dependency("NiniYuanWorld", "./world.js");
  const Rules = dependency("NiniRules", "../core/game-rules.js");
  const Damage = dependency("NiniYuanDamage", "./damage.js");
  const Enemies = dependency("NiniYuanEnemySim", "./enemies.js");
  const Warden = dependency("NiniYuanWardenSim", "./warden.js");

  const PROJECTILE_LIFE = 1.25;
  // World-space cull radius rather than a viewport-relative one: a projectile
  // must not survive longer on a wide monitor than on a phone. The radius sits
  // beyond the furthest a boosted shot can travel inside its own lifetime, so
  // `life` stays the real limit and this is only a safety net.
  const PROJECTILE_CULL_RADIUS = 1400;
  const HOMING_RANGE = 420;

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the projectile rules`);
  }

  function shootProjectile(world) {
    const player = world.player;
    const ch = world.character;
    const nini = world.characterId === "nini";
    if (player.shootCd > 0 || player.ammo <= 0) return false;
    const boosted = player.ammoTimer > 0;
    player.shootCd = boosted ? 0.12 : nini ? 0.22 : 0.34;
    player.shootTimer = nini ? 0.18 : 0.22;
    player.ammo -= 1;
    player.ammoRegen = 0;
    world.projectiles.push({
      x: player.x + player.w / 2 + player.facing * 22,
      y: player.y + player.h * 0.42,
      w: nini ? 18 : 24,
      h: nini ? 14 : 18,
      vx: player.facing * ch.projectileSpeed * (boosted ? 1.15 : 1),
      vy: nini ? -22 : 0,
      life: PROJECTILE_LIFE,
      owner: world.characterId,
      pierce: ch.projectilePierce + (boosted ? 1 : 0),
      damage: ch.projectileDamage + (boosted ? 1 : 0),
      boosted,
      tone: boosted ? "moon" : "accent2",
    });
    World.emit(world, "burst", {
      x: player.x + player.w / 2 + player.facing * 18,
      y: player.y + player.h * 0.42,
      tone: "accent2",
      count: 8,
    });
    World.emit(world, "cue", { name: nini ? "shoot_nini" : "shoot_yuan" });
    return true;
  }

  /**
   * Nini's mild homing target. It tracks the open guardian too, so the recovery
   * window is usable without pixel-accurate aiming.
   */
  function nearestEnemy(world, pr) {
    if (Warden.wardenIsOpen(world)) return world.warden;
    let best = null;
    let bestDist = Infinity;
    for (const e of world.level.enemies) {
      if (!e.alive || Math.sign(e.x - pr.x) !== Math.sign(pr.vx)) continue;
      const d = Math.abs(e.x - pr.x) + Math.abs(e.y - pr.y) * 1.5;
      if (d < bestDist && d < HOMING_RANGE) {
        best = e;
        bestDist = d;
      }
    }
    return best;
  }

  function breakCrystal(world, p, hitstopMs, shardCount = 22) {
    p.broken = true;
    World.invalidateSolids(world);
    World.emit(world, "hitstop", { ms: hitstopMs });
    World.emit(world, "burst", { x: p.x + p.w / 2, y: p.y + p.h / 2, tone: "gold", count: shardCount, shape: "shard", gravity: 760 });
    World.emit(world, "float", { text: "碎晶", x: p.x, y: p.y, tone: "gold" });
    World.emit(world, "cue", { name: "break_crystal" });
    World.emit(world, "crystal", { x: p.x + p.w / 2, y: p.y + p.h / 2 });
  }

  function updateProjectiles(world, dt) {
    const player = world.player;
    const projectiles = world.projectiles;
    for (const pr of projectiles) {
      pr.life -= dt;
      if (pr.owner === "nini") {
        const nearest = nearestEnemy(world, pr);
        if (nearest) pr.vy = Physics.lerp(pr.vy, Physics.clamp((nearest.y + nearest.h / 2 - pr.y) * 4, -180, 180), 0.035);
      }
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      const solids = World.solids(world);
      for (let index = 0; index < solids.length; index += 1) {
        const p = solids[index];
        if (p.broken || !Physics.rectsOverlap(pr, p)) continue;
        if (p.type === "breakable" && (pr.owner === "yuan" || pr.damage > 2)) {
          pr.life = 0;
          breakCrystal(world, p, 35);
        } else {
          pr.life = 0;
        }
      }
      for (const e of world.level.enemies) {
        if (!e.alive || pr.life <= 0 || !Physics.rectsOverlap(pr, e)) continue;
        if (e.untouchable) continue;
        if (Enemies.resistsProjectiles(e)) {
          // 石胄 shells deflect star bolts; the fight has to be answered with impact.
          e.hitTimer = Enemies.ENEMY_HIT_FLASH_DURATION;
          pr.life = 0;
          World.emit(world, "burst", { x: e.x + e.w / 2, y: e.y + e.h / 2, tone: "moon", count: 8 });
          World.emit(world, "float", { text: "护甲", x: e.x, y: e.y, tone: "moon" });
          World.emit(world, "cue", { name: "deflect" });
          continue;
        }
        e.hp = (e.hp || Enemies.enemyHitPoints(e)) - pr.damage;
        e.hitTimer = Enemies.ENEMY_HIT_FLASH_DURATION;
        World.emit(world, "hitstop", { ms: 35 });
        World.emit(world, "burst", { x: e.x + e.w / 2, y: e.y + e.h / 2, tone: pr.tone, count: 14, shape: e.hp <= 0 ? "shard" : "orb" });
        World.emit(world, "cue", { name: "hit_enemy" });
        if (e.hp <= 0) {
          e.alive = false;
          World.chainReward(world, Enemies.enemyReward(e) + pr.damage, e.x, e.y, "gold");
          World.emit(world, "defeat", { kind: e.type, x: e.x + e.w / 2, y: e.y + e.h / 2, cause: "projectile" });
        }
        if (pr.pierce > 0) pr.pierce -= 1;
        else pr.life = 0;
      }
      const guardian = Warden.activeWarden(world);
      if (guardian && guardian.active && pr.life > 0 && Physics.rectsOverlap(pr, guardian)) {
        Warden.damageWarden(world, pr.damage, "bolt");
        if (pr.pierce > 0) pr.pierce -= 1;
        else pr.life = 0;
      }
    }
    const playerCenter = player.x + player.w / 2;
    let write = 0;
    for (let read = 0; read < projectiles.length; read += 1) {
      const pr = projectiles[read];
      if (pr.life > 0 && Math.abs(pr.x - playerCenter) < PROJECTILE_CULL_RADIUS) projectiles[write++] = pr;
    }
    projectiles.length = write;
  }

  /** Warden bolts, falling shards, ground waves, and sentry bolts. */
  function updateHostileBolts(world, dt) {
    const player = world.player;
    const bolts = world.bolts;
    for (const bolt of bolts) {
      bolt.x += bolt.vx * dt;
      bolt.y += bolt.vy * dt;
      bolt.life -= dt;
      if (bolt.life <= 0) continue;
      if (bolt.y > world.level.height + 200) bolt.life = 0;
      if (bolt.kind === "wave" && (bolt.x < bolt.minX || bolt.x + bolt.w > bolt.maxX)) bolt.life = 0;
      if (Physics.bodyOverlaps(player, bolt)) {
        bolt.life = 0;
        Damage.hurt(world, 1);
        if (player.settledOutcome === Rules.OUTCOME_DEATH) return;
      }
    }
    let write = 0;
    for (let read = 0; read < bolts.length; read += 1) {
      if (bolts[read].life > 0) bolts[write++] = bolts[read];
    }
    bolts.length = write;
  }

  const api = {
    PROJECTILE_LIFE,
    PROJECTILE_CULL_RADIUS,
    HOMING_RANGE,
    shootProjectile,
    nearestEnemy,
    breakCrystal,
    updateProjectiles,
    updateHostileBolts,
  };

  root.NiniYuanProjectileSim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
