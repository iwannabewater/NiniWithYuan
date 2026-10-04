((root) => {
  "use strict";

  // World state for one chapter attempt.
  //
  // The simulation never calls into rendering, audio, the DOM, or the save. It
  // records what happened as plain events on `world.events`; the runtime drains
  // that queue after every fixed step and turns it into particles, sound,
  // camera feedback, notices, and persistent records. That boundary is what
  // lets tests drive a whole chapter headlessly in Node.

  const Physics = dependency("NiniYuanPhysics", "./physics.js");
  const Progression = dependency("NiniProgression", "../core/progression.js");

  const PHASE_DEFAULT_PERIOD = 3.2;
  const PHASE_WARNING_DEFAULT = 0.45;
  const COMBO_DECAY_GRACE = 0.35;

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the simulation`);
  }

  function cloneChapter(level) {
    return {
      ...level,
      platforms: level.platforms.map((p) => ({ ...p })),
      coins: level.coins.map((c) => ({ ...c, taken: false })),
      powerups: (level.powerups || []).map((p) => ({ ...p, taken: false })),
      enemies: level.enemies.map((e) => ({ ...e })),
      springs: level.springs.map((s) => ({ ...s })),
      hazards: level.hazards.map((h) => ({ ...h })),
      moving: level.moving.map((m) => ({ ...m })),
      wind: (level.wind || []).map((w) => ({ ...w })),
      updrafts: (level.updrafts || []).map((u) => ({ ...u })),
      bridges: (level.bridges || []).map((b) => ({ ...b })),
      portals: (level.portals || []).map((p) => ({ ...p })),
      lanterns: (level.lanterns || []).map((l) => ({ ...l, lit: false })),
      marrow: level.marrow ? { ...level.marrow, taken: false } : null,
      warden: level.warden
        ? {
            ...level.warden,
            arena: { ...level.warden.arena },
            home: { ...level.warden.home },
            stages: level.warden.stages.map((stage) => ({ ...stage, patterns: [...stage.patterns] })),
          }
        : null,
    };
  }

  /**
   * Phase-tide clock. Pure: the same chapter and elapsed time always resolve to
   * the same phase, so the HUD countdown, collision, and rendering agree.
   */
  function tideAt(level, elapsed, out = {}) {
    if (!level || !level.phaseTide) {
      out.enabled = false;
      out.active = "";
      out.progress = 0;
      out.remaining = 0;
      out.warning = false;
      out.urgency = 0;
      out.period = 0;
      return out;
    }
    const period = Math.max(0.8, Number(level.phaseTide.period) || PHASE_DEFAULT_PERIOD);
    const warningWindow = Math.max(0, Number(level.phaseTide.warning) || PHASE_WARNING_DEFAULT);
    const offset = Number(level.phaseTide.offset) || 0;
    const cycle = period * 2;
    const t = (((Number(elapsed) || 0) + offset) % cycle + cycle) % cycle;
    const phaseTime = t % period;
    const remaining = Math.max(0, period - phaseTime);
    out.enabled = true;
    out.active = t < period ? "a" : "b";
    out.progress = phaseTime / period;
    out.remaining = remaining;
    out.warning = warningWindow > 0 && remaining <= warningWindow;
    out.urgency = warningWindow > 0 ? Physics.clamp(1 - remaining / warningWindow, 0, 1) : 0;
    out.period = period;
    return out;
  }

  function isPhaseItem(item) {
    return item?.phase === "a" || item?.phase === "b";
  }

  function phaseIsActive(item, tide) {
    if (!item?.phase || !tide?.enabled) return true;
    return item.phase === tide.active;
  }

  function createPlayer(spawn, airJumps) {
    return {
      x: spawn.x,
      y: spawn.y,
      w: Physics.PLAYER_W,
      h: Physics.PLAYER_H,
      baseW: Physics.PLAYER_W,
      baseH: Physics.PLAYER_H,
      vx: 0,
      vy: 0,
      spawn: { ...spawn },
      health: 3,
      maxHealth: 3,
      ammo: 14,
      ammoRegen: 0,
      invuln: 0,
      superInvuln: 0,
      onGround: true,
      coyote: Physics.COYOTE_TIME,
      jumpBuffer: 0,
      airJumps,
      facing: 1,
      moveIntent: 0,
      dashDir: 1,
      skillCd: 0,
      skillTimer: 0,
      shootCd: 0,
      shootTimer: 0,
      turnTimer: 0,
      landingTimer: 0,
      glide: 0,
      glideIntent: 0,
      bigTimer: 0,
      ammoTimer: 0,
      boostTimer: 0,
      windTimer: 0,
      windDir: 0,
      updraftTimer: 0,
      portalCd: 0,
      portalTimer: 0,
      portalLock: "",
      tidePhase: "",
      coins: 0,
      collectedValue: 0,
      gems: 0,
      elapsed: 0,
      completed: false,
      hurtFlash: 0,
      prevVy: 0,
      dashFreeze: 0,
      gaitPhase: 0,
      guardFeedbackCd: 0,
      settledOutcome: null,
    };
  }

  /**
   * Bottom-align the spawn to the authored opening platform so every chapter
   * begins grounded and eligible for a buffered first jump.
   */
  function groundedStart(level, Rules) {
    const start = { ...level.start };
    const centerX = start.x + Physics.PLAYER_W / 2;
    let support = null;
    for (const platform of level.platforms) {
      if (platform.phase || centerX < platform.x || centerX > platform.x + platform.w) continue;
      if (!support || platform.y < support.y) support = platform;
    }
    if (support) start.y = Rules.groundedSpawnY(support.y, Physics.PLAYER_H);
    return start;
  }

  /**
   * Build the mutable state for one attempt at `chapter`.
   * `options.character` is the stat record, `options.assist` the sanitized
   * assist settings, and `options.createWarden` the encounter factory.
   */
  function createWorld(chapter, options = {}) {
    const Rules = options.rules || dependency("NiniRules", "../core/game-rules.js");
    const level = cloneChapter(chapter);
    const character = options.character;
    const assist = options.assist || {};
    const world = {
      level,
      character,
      characterId: character.id,
      assist: {
        invulnerable: assist.enabled === true && assist.invulnerable === true,
        infiniteSkill: assist.enabled === true && assist.infiniteSkill === true,
        extraJump: assist.enabled === true && assist.extraJump === true,
      },
      player: null,
      projectiles: [],
      bolts: [],
      warden: null,
      combo: { chain: 0, remaining: 0, multiplier: 1, best: 0, flash: 0 },
      run: { damaged: false, stomps: 0, marrow: false, deaths: 0, assist: assist.enabled === true },
      tide: tideAt(level, 0, {}),
      solids: [],
      solidsKey: "",
      solidsDirty: true,
      events: [],
    };
    world.player = createPlayer(groundedStart(level, Rules), airJumpBudget(world));
    world.player.ammo = Rules.BASE_AMMO_CAP;
    if (typeof options.createWarden === "function") world.warden = options.createWarden(level);
    refreshTide(world);
    return world;
  }

  function airJumpBudget(world) {
    return world.character.airJumps + (world.assist.extraJump ? 1 : 0);
  }

  function refreshTide(world) {
    const previous = world.tide.active;
    tideAt(world.level, world.player ? world.player.elapsed : 0, world.tide);
    if (world.tide.active !== previous) world.solidsDirty = true;
    return world.tide;
  }

  /**
   * Every platform the player can currently collide with: unbroken authored
   * platforms then moving platforms, filtered by the live tide phase. The list
   * is rebuilt only when a crystal breaks or the tide turns.
   */
  function solids(world) {
    if (!world.solidsDirty) return world.solids;
    const list = [];
    const tide = world.tide;
    for (const p of world.level.platforms) {
      if (!p.broken && phaseIsActive(p, tide)) list.push(p);
    }
    for (const m of world.level.moving) {
      if (phaseIsActive(m, tide)) list.push(m);
    }
    for (const bridge of world.level.bridges) {
      if (bridge.solid !== false) list.push(bridge);
    }
    world.solids = list;
    world.solidsDirty = false;
    return list;
  }

  function invalidateSolids(world) {
    world.solidsDirty = true;
  }

  function emit(world, type, fields) {
    const event = fields ? { type, ...fields } : { type };
    world.events.push(event);
    return event;
  }

  function drainEvents(world) {
    const events = world.events;
    world.events = [];
    return events;
  }

  function activeWindZone(world, body) {
    let zone = null;
    for (const w of world.level.wind) {
      if (!Physics.bodyOverlaps(body, w)) continue;
      if (!zone || Math.abs(w.force) > Math.abs(zone.force)) zone = w;
    }
    return zone;
  }

  /** The highest solid under an enemy's feet, used for grounding and patrol bounds. */
  function supportPlatform(world, e) {
    const probeX = e.x + 4;
    const probeY = e.y + e.h - 2;
    const probeW = e.w - 8;
    const probeH = 48 + 4;
    let support = null;
    for (const p of solids(world)) {
      if (p.broken || p.y < e.y + e.h - 3) continue;
      if (!(probeX < p.x + p.w && probeX + probeW > p.x && probeY < p.y + p.h && probeY + probeH > p.y)) continue;
      if (!support || p.y < support.y) support = p;
    }
    return support;
  }

  // --- chain scoring ----------------------------------------------------------
  // The chain only ever multiplies star dew. The collection rating still reads
  // `player.collectedValue`, which chain rewards never touch.

  function chainWindow() {
    return Progression.COMBO_WINDOW + COMBO_DECAY_GRACE;
  }

  function updateCombo(world, dt) {
    const combo = world.combo;
    const next = Progression.decayCombo(combo, dt);
    if (combo.chain > 0 && next.chain === 0) emit(world, "cue", { name: "combo_end" });
    combo.chain = next.chain;
    combo.remaining = next.remaining;
    combo.multiplier = next.multiplier;
    combo.flash = Math.max(0, combo.flash - dt);
  }

  /** Register one chain link and return the star dew it is worth. */
  function chainReward(world, base, x, y, tone) {
    const combo = world.combo;
    const previousMultiplier = combo.multiplier;
    const next = Progression.advanceCombo(combo, { window: Progression.COMBO_WINDOW });
    combo.chain = next.chain;
    combo.remaining = chainWindow();
    combo.multiplier = next.multiplier;
    combo.best = Math.max(combo.best, combo.chain);
    combo.flash = 0.32;
    if (combo.multiplier > previousMultiplier) {
      emit(world, "cue", { name: "combo_up" });
      emit(world, "float", { text: `连星 ×${combo.multiplier}`, x, y: y - 26, tone: "gold" });
    }
    const amount = Progression.comboReward(base, combo.chain);
    world.player.coins += amount;
    emit(world, "float", { text: `+${amount}`, x, y, tone });
    emit(world, "chain", { chain: combo.chain, multiplier: combo.multiplier, x, y });
    return amount;
  }

  function breakCombo(world) {
    const combo = world.combo;
    if (combo.chain === 0) return;
    combo.chain = 0;
    combo.remaining = 0;
    combo.multiplier = 1;
    combo.flash = 0;
  }

  const api = {
    PHASE_DEFAULT_PERIOD,
    PHASE_WARNING_DEFAULT,
    COMBO_DECAY_GRACE,
    cloneChapter,
    tideAt,
    isPhaseItem,
    phaseIsActive,
    createPlayer,
    groundedStart,
    createWorld,
    airJumpBudget,
    refreshTide,
    solids,
    invalidateSolids,
    emit,
    drainEvents,
    activeWindZone,
    supportPlatform,
    chainWindow,
    updateCombo,
    chainReward,
    breakCombo,
  };

  root.NiniYuanWorld = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
