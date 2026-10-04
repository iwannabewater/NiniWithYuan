((root) => {
  "use strict";

  // The player controller: movement response, jump timing, Nini's glide, Yuan's
  // dash, contact resolution, and the per-step terminal-outcome check.

  const Physics = dependency("NiniYuanPhysics", "./physics.js");
  const World = dependency("NiniYuanWorld", "./world.js");
  const Rules = dependency("NiniRules", "../core/game-rules.js");
  const Damage = dependency("NiniYuanDamage", "./damage.js");
  const Enemies = dependency("NiniYuanEnemySim", "./enemies.js");
  const Projectiles = dependency("NiniYuanProjectileSim", "./projectiles.js");
  const Warden = dependency("NiniYuanWardenSim", "./warden.js");
  const Mechanics = dependency("NiniYuanMechanics", "./mechanics.js");

  const JUMP_BUFFER = 0.14;
  const JUMP_CUT_THRESHOLD = -160;
  const JUMP_CUT_MULTIPLIER = 0.56;
  const AIR_JUMP_SCALE = 0.9;
  const AIR_ACCEL_SCALE = 0.74;
  const TURN_POSE_DURATION = 0.1;
  const AMMO_REGEN_INTERVAL = 1.6;
  const YUAN_DASH_SPEED = 820;
  const YUAN_DASH_TIME = 0.18;
  const YUAN_DASH_MIN_DISTANCE = 130;
  const YUAN_DASH_MAX_DISTANCE = 170;
  const YUAN_DASH_EDGE_BRAKE = 5200;
  const NINI_GLIDE_DURATION = 1.25;
  const NINI_GLIDE_FALL_SPEED = 190;
  const NINI_GLIDE_MIN_TAP = 0.12;
  const WIND_REFERENCE_FORCE = 320;
  const WIND_GROUND_DRIFT = 0.14;
  const WIND_AIR_DRIFT = 0.38;
  const WIND_MAX_SPEED = 1.3;
  const STOMP_MIN_FALL_SPEED = 160;
  const STOMP_DEPTH = 28;
  const STOMP_BOUNCE = -620;
  const FALL_MARGIN = 260;
  const LANDING_IMPACT_SPEED = 380;

  const DASH_CONTACT_SLACK = 2;

  const edgeProbe = { x: 0, y: 0, w: 18, h: 8 };
  const dashProbe = { x: 0, y: 0, w: 0, h: 0 };

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the player controller`);
  }

  function consumePressed(input) {
    input.jumpPressed = false;
    input.jumpReleased = false;
    input.skillPressed = false;
    input.shootPressed = false;
  }

  /** Landing restores the air-jump budget. Cached per world so a step allocates nothing. */
  function landOnPlatform(world) {
    if (!world.onGrounded) {
      world.onGrounded = (body) => {
        body.airJumps = World.airJumpBudget(world);
      };
    }
    return world.onGrounded;
  }

  function updatePlayerSize(world) {
    const player = world.player;
    const big = player.bigTimer > 0;
    const targetW = big ? Physics.BIG_PLAYER_W : player.baseW;
    const targetH = big ? Physics.BIG_PLAYER_H : player.baseH;
    if (player.w === targetW && player.h === targetH) return;
    const snapshot = { x: player.x, y: player.y, w: player.w, h: player.h };
    const oldBottom = player.y + player.h;
    const oldCenter = player.x + player.w / 2;
    player.w = targetW;
    player.h = targetH;
    player.x = Physics.clamp(oldCenter - player.w / 2, 0, world.level.width - player.w);
    player.y = oldBottom - player.h;
    const blocked = Physics.overlapsAnySolid(player, World.solids(world));
    if (blocked && (targetW > snapshot.w || targetH > snapshot.h)) Object.assign(player, snapshot);
  }

  /**
   * When the tide turns, a newly solid bridge may close around the player.
   * Try the four nearest clear placements before falling back to a respawn,
   * so a phase switch can never soft-lock the body inside geometry.
   */
  function updatePhaseTransition(world) {
    const player = world.player;
    const tide = world.tide;
    if (!tide.enabled) return;
    if (!player.tidePhase) {
      player.tidePhase = tide.active;
      return;
    }
    if (player.tidePhase === tide.active) return;
    player.tidePhase = tide.active;
    const blockers = [];
    for (const p of world.level.platforms) {
      if (!p.broken && World.isPhaseItem(p) && World.phaseIsActive(p, tide) && Physics.bodyOverlaps(player, p)) blockers.push(p);
    }
    for (const m of world.level.moving) {
      if (World.isPhaseItem(m) && World.phaseIsActive(m, tide) && Physics.bodyOverlaps(player, m)) blockers.push(m);
    }
    if (!blockers.length) return;
    for (const blocker of blockers) {
      if (tryPhaseEscape(world, blocker)) return;
    }
    Damage.respawn(world);
    World.emit(world, "tideRecall");
  }

  function tryPhaseEscape(world, blocker) {
    const player = world.player;
    const level = world.level;
    const snapshot = { x: player.x, y: player.y };
    const candidates = [
      { x: player.x, y: blocker.y - player.h },
      { x: blocker.x - player.w + 3, y: player.y },
      { x: blocker.x + blocker.w - 3, y: player.y },
      { x: player.x, y: blocker.y + blocker.h - 3 },
    ];
    for (const candidate of candidates) {
      player.x = Physics.clamp(candidate.x, 0, level.width - player.w);
      player.y = Physics.clamp(candidate.y, 0, level.height - player.h);
      if (!Physics.overlapsAnySolid(player, World.solids(world))) {
        Damage.refreshGroundedState(world);
        return true;
      }
    }
    Object.assign(player, snapshot);
    return false;
  }

  /** Ground dashes brake at a ledge unless the player is deliberately jumping. */
  function dashShouldStopAtEdge(world, input) {
    const player = world.player;
    if (!player.onGround || input.jump || player.vy < -40) return false;
    edgeProbe.x = player.dashDir > 0 ? player.x + player.w + 8 : player.x - 26;
    edgeProbe.y = player.y + player.h + 4;
    const solids = World.solids(world);
    for (let index = 0; index < solids.length; index += 1) {
      if (Physics.rectsOverlap(edgeProbe, solids[index])) return false;
    }
    return true;
  }

  /**
   * Yuan's dash shatters amber crystals it runs into. The probe runs before the
   * move: collision resolution leaves a blocked body exactly flush with the
   * solid, so a post-move overlap test can never see the crystal it hit.
   */
  function breakCrystalsInDashPath(world, dt) {
    const player = world.player;
    const reach = Math.abs(player.vx * dt) + DASH_CONTACT_SLACK;
    const bodyX = player.x + 3;
    const bodyW = player.w - 6;
    dashProbe.x = player.dashDir > 0 ? bodyX : bodyX - reach;
    dashProbe.y = player.y + 3;
    dashProbe.w = bodyW + reach;
    dashProbe.h = player.h - 3;
    for (const p of world.level.platforms) {
      if (p.type !== "breakable" || p.broken || !Physics.rectsOverlap(dashProbe, p)) continue;
      player.vx *= 0.55;
      player.skillTimer = Math.min(player.skillTimer, 0.06);
      World.emit(world, "shake", { amount: 11 });
      Projectiles.breakCrystal(world, p, 35, 30);
    }
  }

  function tickTimers(player, dt) {
    player.dashFreeze = Math.max(0, (player.dashFreeze || 0) - dt);
    player.shootCd = Math.max(0, player.shootCd - dt);
    player.shootTimer = Math.max(0, player.shootTimer - dt);
    player.turnTimer = Math.max(0, player.turnTimer - dt);
    player.landingTimer = Math.max(0, player.landingTimer - dt);
    player.invuln = Math.max(0, player.invuln - dt);
    player.superInvuln = Math.max(0, player.superInvuln - dt);
    player.bigTimer = Math.max(0, player.bigTimer - dt);
    player.ammoTimer = Math.max(0, player.ammoTimer - dt);
    player.boostTimer = Math.max(0, player.boostTimer - dt);
    player.windTimer = Math.max(0, player.windTimer - dt);
    player.updraftTimer = Math.max(0, (player.updraftTimer || 0) - dt);
    player.portalCd = Math.max(0, player.portalCd - dt);
    player.portalTimer = Math.max(0, player.portalTimer - dt);
    player.guardFeedbackCd = Math.max(0, player.guardFeedbackCd - dt);
  }

  function centerOf(player) {
    return { x: player.x + player.w / 2, y: player.y + player.h / 2 };
  }

  /**
   * One fixed step of player control and contact. Returns early, with pressed
   * edges consumed, the moment a terminal outcome settles so nothing
   * downstream can award rewards after death in the same step.
   */
  function updatePlayer(world, input, dt) {
    const player = world.player;
    const level = world.level;
    const ch = world.character;
    const nini = world.characterId === "nini";
    const yuan = world.characterId === "yuan";
    const leftRight = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    player.moveIntent = leftRight;
    if (leftRight) {
      const nextFacing = Math.sign(leftRight);
      if (nextFacing !== player.facing) player.turnTimer = TURN_POSE_DURATION;
      player.facing = nextFacing;
    }

    if (input.jumpPressed) player.jumpBuffer = JUMP_BUFFER;
    player.jumpBuffer -= dt;
    player.coyote -= dt;
    player.skillCd = world.assist.infiniteSkill ? 0 : Math.max(0, player.skillCd - dt);
    player.skillTimer = Math.max(0, player.skillTimer - dt);
    player.glideIntent = Rules.advanceIntentWindow(player.glideIntent, {
      pressed: input.skillPressed,
      eligible: nini && player.skillCd <= 0 && (!player.onGround || input.jumpPressed),
      dt,
      minimum: NINI_GLIDE_MIN_TAP,
    });
    tickTimers(player, dt);
    player.ammoRegen += dt;
    if (player.ammo < Rules.BASE_AMMO_CAP && player.ammoRegen >= AMMO_REGEN_INTERVAL) {
      player.ammo += 1;
      player.ammoRegen = 0;
    }
    player.hurtFlash = Math.max(0, player.hurtFlash - dt);
    updatePlayerSize(world);
    updatePhaseTransition(world);

    let gravity = ch.gravity;
    const windZone = World.activeWindZone(world, player);
    const windDirection = windZone ? Math.sign(windZone.force) : 0;
    const windStrength = windZone ? Physics.clamp(Math.abs(windZone.force) / WIND_REFERENCE_FORCE, 0.75, 1.25) : 0;
    const windTarget = windDirection * ch.speed * (player.onGround ? WIND_GROUND_DRIFT : WIND_AIR_DRIFT) * windStrength;
    const target = Physics.clamp(leftRight * ch.speed + windTarget, -ch.speed * WIND_MAX_SPEED, ch.speed * WIND_MAX_SPEED);
    const accel = player.onGround ? ch.accel : ch.accel * AIR_ACCEL_SCALE;
    player.vx = Physics.horizontalVelocity(player.vx, target, {
      baseAcceleration: accel,
      grounded: player.onGround,
      intent: leftRight,
      turning: player.turnTimer > 0,
    }, dt);
    player.windDir = windDirection;
    if (windZone) player.windTimer = 0.18;

    const skillCooldown = ch.skillCooldown * (player.boostTimer > 0 ? 0.55 : 1);
    const canNiniGlide =
      nini &&
      (input.skill || player.glideIntent > 0) &&
      !player.onGround &&
      player.glide < NINI_GLIDE_DURATION &&
      (player.skillCd <= 0 || player.glide > 0);
    if (canNiniGlide) {
      if (player.glide === 0) {
        player.skillCd = skillCooldown;
        World.emit(world, "burst", { ...centerOf(player), tone: "accent", count: 14 });
        World.emit(world, "skill", { id: "nini" });
      }
      player.glide = Math.min(NINI_GLIDE_DURATION, player.glide + dt);
      gravity *= player.vy < -80 ? 0.68 : 0.26;
      if (player.vy > -70) player.vy = Math.min(player.vy, NINI_GLIDE_FALL_SPEED);
    } else if (!input.skill && !player.onGround) {
      player.glide = 0;
    } else if (player.onGround) {
      player.glide = 0;
      if (!input.jumpPressed) player.glideIntent = 0;
    }

    if (input.skillPressed && player.skillCd <= 0 && yuan) {
      player.skillTimer = YUAN_DASH_TIME;
      player.dashDir = player.facing;
      player.skillCd = skillCooldown;
      player.dashFreeze = 0.045;
      World.emit(world, "hitstop", { ms: 45 });
      player.vx = player.dashDir * YUAN_DASH_SPEED;
      player.vy *= 0.45;
      World.emit(world, "shake", { amount: 7 });
      World.emit(world, "burst", { ...centerOf(player), tone: "accent", count: 22, shape: "streak", gravity: 180, drag: 2.4 });
      World.emit(world, "cue", { name: "dash" });
      World.emit(world, "skill", { id: "yuan" });
    }

    if (yuan && player.skillTimer > 0) {
      if (dashShouldStopAtEdge(world, input)) {
        player.skillTimer = 0;
        player.vx = Physics.moveToward(player.vx, 0, YUAN_DASH_EDGE_BRAKE * dt);
        World.emit(world, "burst", { x: player.x + player.w / 2, y: player.y + player.h, tone: "jade", count: 8, shape: "shard" });
      } else {
        const dashSpeed = YUAN_DASH_SPEED * (player.boostTimer > 0 ? 1.08 : 1);
        player.vx = player.dashDir * Math.max(Math.abs(player.vx), dashSpeed);
      }
    }

    if (input.shootPressed) Projectiles.shootProjectile(world);

    if (player.jumpBuffer > 0 && (player.coyote > 0 || player.airJumps > 0)) {
      const usedAir = player.coyote <= 0;
      player.vy = -ch.jump * (usedAir ? AIR_JUMP_SCALE : 1);
      player.onGround = false;
      player.coyote = 0;
      player.jumpBuffer = 0;
      if (usedAir) player.airJumps -= 1;
      World.emit(world, "burst", { x: player.x + player.w / 2, y: player.y + player.h, tone: "accent2", count: 12, shape: "ring", gravity: 0, drag: 4 });
      World.emit(world, "cue", { name: "jump" });
      World.emit(world, "jump", { air: usedAir, x: player.x + player.w / 2, y: player.y + player.h });
    }
    if (input.jumpReleased && player.vy < JUMP_CUT_THRESHOLD) player.vy *= JUMP_CUT_MULTIPLIER;

    player.vy = Math.min(ch.maxFall, player.vy + gravity * dt);
    const updraft = Mechanics.updraftAt(world, player);
    if (updraft) {
      // The column cancels gravity, then lifts with its own net acceleration.
      player.vy = Math.max(-updraft.max, player.vy - (gravity + updraft.force) * dt);
      if (player.vy < 0) player.onGround = false;
      player.updraftTimer = 0.2;
    }
    if (yuan && player.skillTimer > 0) breakCrystalsInDashPath(world, dt);
    const solids = World.solids(world);
    const onGrounded = landOnPlatform(world);
    const previousX = player.x;
    Physics.moveAxis(player, "x", player.vx * dt, solids, level, onGrounded);
    if (player.onGround) player.gaitPhase = (player.gaitPhase + Math.abs(player.x - previousX) / 22) % (Math.PI * 2);
    Physics.moveAxis(player, "y", player.vy * dt, solids, level, onGrounded);

    Mechanics.applySprings(world);
    Mechanics.updatePortals(world);

    for (const h of level.hazards) {
      if (!World.phaseIsActive(h, world.tide)) continue;
      if (Physics.bodyOverlaps(player, h)) {
        Damage.hurt(world, h.type === "lava" ? 2 : 1);
        if (player.settledOutcome) {
          consumePressed(input);
          return;
        }
      }
    }
    for (const e of level.enemies) {
      if (!e.alive || e.untouchable || !Physics.bodyOverlaps(player, e)) continue;
      const stomp = player.vy > STOMP_MIN_FALL_SPEED && player.y + player.h - e.y < STOMP_DEPTH;
      const ex = e.x + e.w / 2;
      const ey = e.y + e.h / 2;
      if (stomp) {
        e.alive = false;
        player.vy = STOMP_BOUNCE;
        world.run.stomps += 1;
        World.emit(world, "hitstop", { ms: 50 });
        World.emit(world, "burst", { x: ex, y: ey, tone: "gold", count: 20, shape: "shard" });
        World.chainReward(world, Enemies.enemyReward(e), e.x, e.y, "gold");
        World.emit(world, "cue", { name: "stomp" });
        World.emit(world, "defeat", { kind: e.type, x: ex, y: ey, cause: "stomp" });
      } else if (player.superInvuln > 0) {
        e.alive = false;
        World.emit(world, "burst", { x: ex, y: ey, tone: "moon", count: 28, shape: "ring", gravity: 90, drag: 2 });
        World.chainReward(world, Enemies.enemyReward(e), e.x, e.y, "moon");
        World.emit(world, "defeat", { kind: e.type, x: ex, y: ey, cause: "guard" });
      } else if (player.skillTimer > 0 && yuan) {
        e.alive = false;
        World.emit(world, "burst", { x: ex, y: ey, tone: "jade", count: 24, shape: "streak", gravity: 220, drag: 2 });
        World.chainReward(world, Enemies.enemyReward(e) + 1, e.x, e.y, "jade");
        World.emit(world, "defeat", { kind: e.type, x: ex, y: ey, cause: "dash" });
      } else {
        Damage.hurt(world, 1);
        if (player.settledOutcome) {
          consumePressed(input);
          return;
        }
      }
    }

    if (player.y > level.height + FALL_MARGIN) Damage.hurt(world, 1, true);
    if (player.settledOutcome) {
      consumePressed(input);
      return;
    }
    Warden.holdInsideArena(world);
    Mechanics.lightLanterns(world);
    Mechanics.collectMarrow(world);
    const outcome = Rules.resolveTerminalOutcome({
      isDead: player.health <= 0,
      reachedGoal: !player.completed && !Warden.goalIsSealed(world) && Physics.bodyOverlaps(player, Mechanics.goalReachRect(level.goal)),
      settledOutcome: player.settledOutcome,
    });
    if (outcome === Rules.OUTCOME_COMPLETE) Mechanics.completeLevel(world);
    consumePressed(input);
  }

  const api = {
    JUMP_BUFFER,
    JUMP_CUT_THRESHOLD,
    JUMP_CUT_MULTIPLIER,
    AIR_JUMP_SCALE,
    TURN_POSE_DURATION,
    YUAN_DASH_SPEED,
    YUAN_DASH_TIME,
    YUAN_DASH_MIN_DISTANCE,
    YUAN_DASH_MAX_DISTANCE,
    NINI_GLIDE_DURATION,
    NINI_GLIDE_FALL_SPEED,
    NINI_GLIDE_MIN_TAP,
    WIND_REFERENCE_FORCE,
    WIND_GROUND_DRIFT,
    WIND_AIR_DRIFT,
    WIND_MAX_SPEED,
    STOMP_MIN_FALL_SPEED,
    FALL_MARGIN,
    LANDING_IMPACT_SPEED,
    consumePressed,
    updatePlayerSize,
    updatePhaseTransition,
    dashShouldStopAtEdge,
    breakCrystalsInDashPath,
    updatePlayer,
  };

  root.NiniYuanPlayerSim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
