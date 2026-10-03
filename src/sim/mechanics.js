((root) => {
  "use strict";

  // Level mechanics the player interacts with: moving platforms, springs,
  // paired star gates, star lanterns, star marrow, pickups, power-ups, and the
  // goal gate.

  const Physics = dependency("NiniYuanPhysics", "./physics.js");
  const World = dependency("NiniYuanWorld", "./world.js");
  const Rules = dependency("NiniRules", "../core/game-rules.js");
  const Damage = dependency("NiniYuanDamage", "./damage.js");

  const PORTAL_COOLDOWN = 0.34;
  const PORTAL_PRESENTATION_TIME = 0.42;
  const GOAL_REACH_X = 22;
  const GOAL_REACH_Y = 34;
  const POWERUP_LABELS = Object.freeze({
    berry: "星莓：身体变大，生命上限提升",
    moon: "月糖：短时间无敌",
    core: "晶核：弹药强化",
    bell: "风铃果：技能冷却刷新",
    heart: "生命包：生命恢复",
  });

  const exitProbe = { x: 0, y: 0, w: 0, h: 0 };

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the level mechanics`);
  }

  function updateMoving(world, dt) {
    for (const m of world.level.moving) {
      const oldX = m.x;
      const oldY = m.y;
      if (m.axis === "y") {
        m.y += m.dir * m.speed * dt;
        if (Math.abs(m.y - m.oy) > m.range) {
          m.y = m.oy + Math.sign(m.y - m.oy) * m.range;
          m.dir *= -1;
        }
      } else {
        m.x += m.dir * m.speed * dt;
        if (Math.abs(m.x - m.ox) > m.range) {
          m.x = m.ox + Math.sign(m.x - m.ox) * m.range;
          m.dir *= -1;
        }
      }
      m.dx = m.x - oldX;
      m.dy = m.y - oldY;
    }
  }

  function applySprings(world) {
    const player = world.player;
    for (const spring of world.level.springs) {
      if (!Physics.bodyOverlaps(player, spring) || player.vy < 0) continue;
      player.y = spring.y - player.h;
      player.vy = -spring.power;
      player.onGround = false;
      player.coyote = 0;
      World.emit(world, "shake", { amount: 5 });
      World.emit(world, "burst", { x: spring.x + spring.w / 2, y: spring.y, tone: "gold", count: 24, shape: "ring", gravity: 120, drag: 3 });
      World.emit(world, "cue", { name: "spring" });
      World.emit(world, "spring", { x: spring.x + spring.w / 2, y: spring.y });
    }
  }

  function activePortal(world) {
    for (const portal of world.level.portals) {
      if (Physics.bodyOverlaps(world.player, portal)) return portal;
    }
    return null;
  }

  function pairedPortal(world, portal) {
    for (const candidate of world.level.portals) {
      if (candidate.id === portal.pair) return candidate;
    }
    return null;
  }

  function portalExitPosition(portal, body) {
    return {
      x: portal.x + portal.w / 2 - body.w / 2,
      y: portal.y + portal.h - body.h,
    };
  }

  function portalExitIsSafe(world, x, y, w, h) {
    const level = world.level;
    if (x < 0 || y < 0 || x + w > level.width || y + h > level.height) return false;
    exitProbe.x = x;
    exitProbe.y = y;
    exitProbe.w = w;
    exitProbe.h = h;
    return !Physics.overlapsAnySolid(exitProbe, World.solids(world));
  }

  /**
   * Star gates preserve velocity, facing, health, skill state, and ammunition.
   * A short cooldown plus an exit lock stop the player bouncing straight back
   * while standing inside the destination field.
   */
  function updatePortals(world) {
    const player = world.player;
    const portal = activePortal(world);
    if (!portal) {
      player.portalLock = "";
      return;
    }
    if (player.portalLock === portal.id || player.portalCd > 0) return;
    const target = pairedPortal(world, portal);
    if (!target) return;
    const exit = portalExitPosition(target, player);
    if (!portalExitIsSafe(world, exit.x, exit.y, player.w, player.h)) return;
    player.x = exit.x;
    player.y = exit.y;
    World.emit(world, "snap", { camera: true });
    player.portalCd = PORTAL_COOLDOWN;
    player.portalTimer = PORTAL_PRESENTATION_TIME;
    player.portalLock = target.id;
    World.emit(world, "cameraReset");
    Damage.refreshGroundedState(world);
    World.emit(world, "shake", { amount: 4 });
    const tone = `portal:${target.palette}`;
    World.emit(world, "burst", { x: player.x + player.w / 2, y: player.y + player.h / 2, tone, count: 16 });
    World.emit(world, "float", { text: "星门", x: player.x + player.w / 2, y: player.y, tone });
    World.emit(world, "cue", { name: "portal" });
    World.emit(world, "portal", { from: portal.id, to: target.id });
  }

  /**
   * Light any star lantern the player touches and move the respawn anchor
   * there. Lanterns are one-way: progress is never taken back by walking left.
   */
  function lightLanterns(world) {
    const player = world.player;
    const level = world.level;
    for (const lantern of level.lanterns) {
      if (lantern.lit || !Physics.bodyOverlaps(player, lantern)) continue;
      lantern.lit = true;
      player.spawn = {
        x: Physics.clamp(lantern.x + lantern.w / 2 - player.baseW / 2, 0, level.width - player.baseW),
        y: lantern.y + lantern.h - player.baseH,
      };
      World.emit(world, "burst", { x: lantern.x + lantern.w / 2, y: lantern.y + 12, tone: "gold", count: 26 });
      World.emit(world, "cue", { name: "lantern" });
      World.emit(world, "lantern", { x: lantern.x + lantern.w / 2, y: lantern.y });
    }
  }

  /** Star marrow is recorded the moment it is touched; a later failure keeps it. */
  function collectMarrow(world) {
    const marrow = world.level.marrow;
    if (!marrow || marrow.taken || !Physics.pickupOverlaps(world.player, marrow)) return;
    marrow.taken = true;
    world.run.marrow = true;
    World.emit(world, "marrow", { levelId: world.level.id });
    World.emit(world, "shake", { amount: 6 });
    World.emit(world, "burst", { x: marrow.x + marrow.w / 2, y: marrow.y + marrow.h / 2, tone: "rose", count: 44 });
    World.emit(world, "float", { text: "星髓", x: marrow.x, y: marrow.y, tone: "rose" });
    World.emit(world, "cue", { name: "marrow" });
  }

  function updatePickups(world) {
    const player = world.player;
    const level = world.level;
    const tide = world.tide;
    for (const c of level.coins) {
      if (c.taken || !World.phaseIsActive(c, tide) || !Physics.pickupOverlaps(player, c)) continue;
      c.taken = true;
      const gem = c.kind === "gem";
      const amount = gem ? 5 : 1;
      // The collection rating reads `collectedValue`, which always takes the
      // authored value. Only star dew is allowed to grow with the chain.
      player.collectedValue += amount;
      const tone = gem ? "jade" : "gold";
      if (gem) {
        player.gems += 1;
        World.chainReward(world, amount, c.x, c.y, tone);
      } else {
        player.coins += amount;
        // Common star dew keeps a live chain breathing without extending it.
        if (world.combo.chain > 0) world.combo.remaining = World.chainWindow();
        World.emit(world, "float", { text: `+${amount}`, x: c.x, y: c.y, tone });
      }
      World.emit(world, "burst", { x: c.x + 10, y: c.y + 10, tone, count: gem ? 18 : 9 });
      World.emit(world, "cue", { name: gem ? "pickup_gem" : "pickup_coin" });
      World.emit(world, "pickup", { kind: c.kind, x: c.x + c.w / 2, y: c.y + c.h / 2 });
    }
    for (const p of level.powerups) {
      if (p.taken || !World.phaseIsActive(p, tide) || !Physics.pickupOverlaps(player, p)) continue;
      p.taken = true;
      applyPowerup(world, p.kind);
    }
  }

  function applyPowerup(world, kind) {
    const player = world.player;
    if (kind === "berry") {
      player.bigTimer = 20;
      player.maxHealth = Math.max(player.maxHealth, 4);
      player.health = Math.min(player.maxHealth, player.health + 1);
    }
    if (kind === "moon") {
      player.superInvuln = 8;
      player.invuln = Math.max(player.invuln, 8);
    }
    if (kind === "core") {
      player.ammoTimer = 12;
      player.ammo = Rules.clampAmmo(player.ammo + 8, Rules.RESERVE_AMMO_CAP);
    }
    if (kind === "bell") {
      player.boostTimer = 15;
      player.skillCd = 0;
      player.ammo = Rules.clampAmmo(player.ammo + 4, Rules.RESERVE_AMMO_CAP);
    }
    if (kind === "heart") {
      player.health = Math.min(player.maxHealth, player.health + 1);
    }
    World.emit(world, "burst", { x: player.x + player.w / 2, y: player.y + player.h / 2, tone: `powerup:${kind}`, count: 28 });
    World.emit(world, "powerup", { kind, label: POWERUP_LABELS[kind] || "获得强化" });
    World.emit(world, "cue", { name: "pickup_powerup" });
  }

  /**
   * The gate is drawn at its authored rect but accepts a slightly larger
   * reach, the same forgiveness pickups already get.
   */
  function goalReachRect(goal) {
    return {
      x: goal.x - GOAL_REACH_X,
      y: goal.y - GOAL_REACH_Y,
      w: goal.w + GOAL_REACH_X * 2,
      h: goal.h + GOAL_REACH_Y * 2,
    };
  }

  function completeLevel(world) {
    const player = world.player;
    if (player.settledOutcome === Rules.OUTCOME_DEATH || player.completed) return;
    player.settledOutcome = Rules.OUTCOME_COMPLETE;
    player.completed = true;
    World.emit(world, "outcome", { outcome: Rules.OUTCOME_COMPLETE });
  }

  /** Collection rating from authored pickup values only. */
  function starCount(world) {
    let total = 0;
    for (const coin of world.level.coins) total += coin.kind === "gem" ? 5 : 1;
    return Rules.calculateStarRating(world.player.collectedValue, total);
  }

  const api = {
    PORTAL_COOLDOWN,
    GOAL_REACH_X,
    GOAL_REACH_Y,
    POWERUP_LABELS,
    updateMoving,
    applySprings,
    activePortal,
    pairedPortal,
    portalExitPosition,
    portalExitIsSafe,
    updatePortals,
    lightLanterns,
    collectMarrow,
    updatePickups,
    applyPowerup,
    goalReachRect,
    completeLevel,
    starCount,
  };

  root.NiniYuanMechanics = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
