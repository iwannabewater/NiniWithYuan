((root) => {
  "use strict";

  // World-finale warden encounters. One data-authored engine serves every
  // guardian: stage profiles choose cadence and attack order, and
  // `damageWarden` is the only damage entry, open only during `recover`.

  const Physics = dependency("NiniYuanPhysics", "./physics.js");
  const World = dependency("NiniYuanWorld", "./world.js");
  const Damage = dependency("NiniYuanDamage", "./damage.js");

  const TILE = 48;
  const WARDEN_TELEGRAPH = 0.55;
  const WARDEN_RECOVER = 0.7;
  const WARDEN_HIT_FLASH = 0.16;
  const WARDEN_CONTACT_COOLDOWN = 0.5;
  const WARDEN_BOLT_SPEED = 330;
  const WARDEN_SHARD_SPEED = 520;
  const WARDEN_SWEEP_SPEED = 520;
  const WARDEN_WAVE_SPEED = 430;
  const WARDEN_SWEEP_TIME = 1.35;
  const WARDEN_WAKE_DELAY = 1.2;
  const WARDEN_SUMMON_CAP = 4;

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the warden encounter`);
  }

  /**
   * Runtime state for one encounter. The authored record stays immutable;
   * everything that changes during the fight lives here so a restart is a
   * fresh object rather than a partially reset one.
   */
  function createWardenState(level) {
    const data = level.warden;
    if (!data) return null;
    return {
      data,
      x: data.home.x,
      y: data.home.y,
      w: data.w,
      h: data.h,
      homeX: data.home.x,
      homeY: data.home.y,
      health: data.health,
      maxHealth: data.health,
      active: false,
      defeated: false,
      hitTimer: 0,
      contactCd: 0,
      phase: "idle",
      phaseTimer: 1.1,
      attack: "",
      attackIndex: 0,
      sweepDir: -1,
      hurtCount: 0,
      bob: 0,
      markers: [],
    };
  }

  function activeWarden(world) {
    const warden = world.warden;
    return warden && !warden.defeated ? warden : null;
  }

  function wardenStage(warden) {
    if (!warden) return null;
    const ratio = warden.maxHealth > 0 ? warden.health / warden.maxHealth : 0;
    const stages = warden.data.stages;
    for (const stage of stages) {
      if (ratio > stage.above) return stage;
    }
    return stages[stages.length - 1];
  }

  /** True while the guardian is inside its punishable recovery window. */
  function wardenIsOpen(world) {
    const warden = world.warden;
    return Boolean(warden && warden.active && !warden.defeated && warden.phase === "recover");
  }

  function goalIsSealed(world) {
    return Boolean(world.warden && !world.warden.defeated);
  }

  /** While a warden is awake its arena edge is solid, so the fight cannot be skipped. */
  function holdInsideArena(world) {
    const active = activeWarden(world);
    if (!active || !active.active) return;
    const player = world.player;
    const edge = active.data.arena.x;
    if (player.x >= edge) return;
    player.x = edge;
    if (player.vx < 0) player.vx = 0;
    World.emit(world, "syncPresentation");
  }

  function updateWarden(world, dt) {
    const warden = world.warden;
    if (!warden || warden.defeated) return;
    const player = world.player;
    warden.hitTimer = Math.max(0, warden.hitTimer - dt);
    warden.contactCd = Math.max(0, warden.contactCd - dt);
    warden.bob += dt;
    if (!warden.active) {
      if (player.x + player.w > warden.data.arena.x + TILE) {
        warden.active = true;
        warden.phase = "wait";
        warden.phaseTimer = WARDEN_WAKE_DELAY;
        World.emit(world, "shake", { amount: 10 });
        World.emit(world, "cue", { name: "warden_wake" });
        World.emit(world, "wardenWake", { name: warden.data.name });
      }
      return;
    }
    const stage = wardenStage(warden);
    warden.phaseTimer -= dt;
    if (warden.phase === "wait" && warden.phaseTimer <= 0) beginWardenAttack(world, stage);
    else if (warden.phase === "telegraph" && warden.phaseTimer <= 0) fireWardenAttack(world, stage);
    else if (warden.phase === "act") advanceWardenAct(world, dt);
    else if (warden.phase === "recover" && warden.phaseTimer <= 0) {
      warden.phase = "wait";
      warden.phaseTimer = stage.cadence;
    }
    if (warden.phase !== "act" || warden.attack !== "sweep") driftWardenHome(world, dt);
    resolveWardenContact(world);
  }

  /**
   * Hover behaviour. The guardian rides high while it winds up and drops into
   * player reach during its recovery beat, so every exchange has one readable
   * opening instead of a war of attrition at an unreachable altitude.
   */
  function driftWardenHome(world, dt) {
    const warden = world.warden;
    const player = world.player;
    const openingY = warden.data.ground - warden.h - 26;
    const restingY = warden.homeY + Math.sin(warden.bob * 1.5) * 10;
    const targetY = warden.phase === "recover" ? openingY : restingY;
    const targetX = Physics.clamp(
      player.x + player.w / 2 - warden.w / 2,
      warden.data.arena.x + TILE,
      warden.data.arena.x + warden.data.arena.w - warden.w - TILE,
    );
    const settle = warden.phase === "recover" ? 0.0006 : 0.02;
    warden.x = Physics.lerp(warden.x, Physics.lerp(warden.homeX, targetX, 0.55), 1 - Math.pow(0.02, dt));
    warden.y = Physics.lerp(warden.y, targetY, 1 - Math.pow(settle, dt));
  }

  function beginWardenAttack(world, stage) {
    const warden = world.warden;
    const player = world.player;
    const patterns = stage.patterns;
    warden.attack = patterns[warden.attackIndex % patterns.length];
    warden.attackIndex += 1;
    warden.phase = "telegraph";
    warden.phaseTimer = WARDEN_TELEGRAPH;
    if (warden.attack === "rain") {
      const arena = warden.data.arena;
      warden.markers = [0, 1, 2, 3].map((i) => arena.x + TILE * 2 + ((arena.w - TILE * 4) / 3) * i);
    } else if (warden.attack === "sweep") {
      warden.sweepDir = player.x + player.w / 2 < warden.x + warden.w / 2 ? -1 : 1;
    }
    World.emit(world, "cue", { name: "warden_charge" });
    World.emit(world, "wardenTelegraph", { attack: warden.attack });
  }

  function recover(warden, extra = 0) {
    warden.phase = "recover";
    warden.phaseTimer = WARDEN_RECOVER + extra;
  }

  function fireWardenAttack(world, stage) {
    const warden = world.warden;
    const player = world.player;
    const center = { x: warden.x + warden.w / 2, y: warden.y + warden.h / 2 };
    if (warden.attack === "volley") {
      const dx = player.x + player.w / 2 - center.x;
      const dy = player.y + player.h / 2 - center.y;
      const base = Math.atan2(dy, dx);
      const count = stage.patterns.length >= 4 ? 5 : 3;
      for (let i = 0; i < count; i += 1) {
        const angle = base + (i - (count - 1) / 2) * 0.22;
        world.bolts.push({
          x: center.x - 9,
          y: center.y - 9,
          w: 18,
          h: 18,
          vx: Math.cos(angle) * WARDEN_BOLT_SPEED,
          vy: Math.sin(angle) * WARDEN_BOLT_SPEED,
          life: 3.4,
          kind: "bolt",
        });
      }
      recover(warden);
      World.emit(world, "cue", { name: "warden_volley" });
    } else if (warden.attack === "rain") {
      for (const markerX of warden.markers) {
        world.bolts.push({
          x: markerX - 11,
          y: warden.y + warden.h * 0.5,
          w: 22,
          h: 26,
          vx: 0,
          vy: WARDEN_SHARD_SPEED,
          life: 3.4,
          kind: "shard",
        });
      }
      warden.markers = [];
      recover(warden);
      World.emit(world, "cue", { name: "warden_rain" });
    } else if (warden.attack === "summon") {
      spawnWardenMinions(world);
      recover(warden);
      World.emit(world, "cue", { name: "warden_summon" });
    } else if (warden.attack === "wave") {
      // A pair of ground waves rolls outward from beneath the guardian. Each
      // is low enough to clear with any jump and dies at the arena wall.
      const arena = warden.data.arena;
      const groundY = warden.data.ground;
      for (const dir of [-1, 1]) {
        world.bolts.push({
          x: center.x - 16 + dir * 20,
          y: groundY - 34,
          w: 32,
          h: 34,
          vx: dir * WARDEN_WAVE_SPEED,
          vy: 0,
          life: arena.w / WARDEN_WAVE_SPEED + 0.2,
          kind: "wave",
          minX: arena.x,
          maxX: arena.x + arena.w,
        });
      }
      recover(warden, 0.15);
      World.emit(world, "shake", { amount: 6 });
      World.emit(world, "cue", { name: "warden_wave" });
    } else {
      warden.phase = "act";
      warden.phaseTimer = WARDEN_SWEEP_TIME;
      World.emit(world, "cue", { name: "warden_sweep" });
    }
  }

  function advanceWardenAct(world, dt) {
    const warden = world.warden;
    const arena = warden.data.arena;
    const groundY = warden.data.ground - warden.h - 6;
    warden.y = Physics.moveToward(warden.y, groundY, 900 * dt);
    warden.x += warden.sweepDir * WARDEN_SWEEP_SPEED * dt;
    const minX = arena.x + 8;
    const maxX = arena.x + arena.w - warden.w - 8;
    if (warden.x <= minX || warden.x >= maxX) {
      warden.x = Physics.clamp(warden.x, minX, maxX);
      warden.sweepDir *= -1;
      World.emit(world, "burst", { x: warden.x + warden.w / 2, y: groundY + warden.h, tone: "gold", count: 10 });
      World.emit(world, "shake", { amount: 6 });
    }
    if (warden.phaseTimer <= 0) {
      recover(warden, 0.25);
      warden.attack = "";
    }
  }

  function spawnWardenMinions(world) {
    const warden = world.warden;
    const arena = warden.data.arena;
    const enemies = world.level.enemies;
    let living = 0;
    for (const enemy of enemies) if (enemy.summoned && enemy.alive) living += 1;
    if (living >= WARDEN_SUMMON_CAP) return;
    for (const offset of [TILE * 3, arena.w - TILE * 4]) {
      enemies.push({
        x: arena.x + offset,
        y: warden.data.ground - TILE * 3,
        w: 38,
        h: 34,
        baseX: arena.x + offset,
        baseY: warden.data.ground - TILE * 3,
        vx: 70,
        patrol: TILE * 2,
        type: "wisp",
        alive: true,
        phase: 0,
        summoned: true,
      });
    }
  }

  function resolveWardenContact(world) {
    const warden = world.warden;
    const player = world.player;
    if (!Physics.bodyOverlaps(player, warden)) return;
    const stomping = player.vy > 140 && player.y + player.h - warden.y < 34;
    if (stomping) {
      damageWarden(world, 2, "stomp");
      player.vy = -640;
      return;
    }
    const dashing = world.characterId === "yuan" && player.skillTimer > 0;
    if (player.superInvuln > 0 || dashing) {
      if (warden.contactCd > 0) return;
      warden.contactCd = WARDEN_CONTACT_COOLDOWN;
      damageWarden(world, dashing ? 2 : 1, "impact");
      return;
    }
    Damage.hurt(world, 1);
  }

  /**
   * The sole damage arbitration entry. A closed shell deflects with the shared
   * armour language and changes nothing else; callers keep their own bounce,
   * contact cooldown, and pierce rules either way.
   */
  function damageWarden(world, amount, source) {
    const warden = world.warden;
    if (!warden || warden.defeated) return false;
    const cx = warden.x + warden.w / 2;
    const cy = warden.y + warden.h / 2;
    if (!wardenIsOpen(world)) {
      warden.hitTimer = WARDEN_HIT_FLASH;
      World.emit(world, "burst", { x: cx, y: cy, tone: "moon", count: 8 });
      World.emit(world, "float", { text: "护甲", x: warden.x, y: warden.y, tone: "moon" });
      World.emit(world, "cue", { name: "deflect" });
      return false;
    }
    const stomp = source === "stomp";
    warden.health = Math.max(0, warden.health - amount);
    warden.hitTimer = WARDEN_HIT_FLASH;
    warden.hurtCount += 1;
    World.emit(world, "hitstop", { ms: stomp ? 60 : 40 });
    World.emit(world, "shake", { amount: stomp ? 9 : 6 });
    World.emit(world, "burst", {
      x: cx,
      y: cy,
      tone: "gold",
      count: stomp ? 22 : 14,
      shape: stomp ? "ring" : "shard",
      gravity: stomp ? 120 : 520,
    });
    World.chainReward(world, 3, cx, warden.y, "gold");
    World.emit(world, "cue", { name: stomp ? "stomp" : "hit_enemy" });
    if (warden.health <= 0) defeatWarden(world);
    return true;
  }

  function defeatWarden(world) {
    const warden = world.warden;
    warden.defeated = true;
    warden.active = false;
    world.bolts = [];
    for (const enemy of world.level.enemies) if (enemy.summoned) enemy.alive = false;
    const cx = warden.x + warden.w / 2;
    const cy = warden.y + warden.h / 2;
    World.emit(world, "shake", { amount: 18 });
    World.emit(world, "burst", { x: cx, y: cy, tone: "gold", count: 90, shape: "shard", gravity: 620 });
    World.emit(world, "float", { text: `${warden.data.name} 归位`, x: warden.x, y: warden.y, tone: "gold" });
    World.emit(world, "cue", { name: "warden_fall" });
    World.emit(world, "wardenDefeated", {
      levelId: world.level.id,
      name: warden.data.name,
      flawless: !world.run.damaged,
    });
  }

  const api = {
    WARDEN_TELEGRAPH,
    WARDEN_RECOVER,
    WARDEN_HIT_FLASH,
    WARDEN_CONTACT_COOLDOWN,
    WARDEN_BOLT_SPEED,
    WARDEN_SHARD_SPEED,
    WARDEN_SWEEP_SPEED,
    WARDEN_WAVE_SPEED,
    createWardenState,
    activeWarden,
    wardenStage,
    wardenIsOpen,
    goalIsSealed,
    holdInsideArena,
    updateWarden,
    resolveWardenContact,
    damageWarden,
    defeatWarden,
  };

  root.NiniYuanWardenSim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
