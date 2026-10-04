((root) => {
  "use strict";

  // Health, invulnerability, and respawn. Every damage source in the
  // simulation (hazards, contact, hostile bolts, falls) funnels through `hurt`,
  // so terminal-outcome precedence and assist rules live in exactly one place.

  const Physics = dependency("NiniYuanPhysics", "./physics.js");
  const World = dependency("NiniYuanWorld", "./world.js");
  const Rules = dependency("NiniRules", "../core/game-rules.js");

  const SUPER_GUARD_FEEDBACK_COOLDOWN = 0.18;
  const HURT_INVULNERABILITY = 1.1;
  const RESPAWN_INVULNERABILITY = 1.2;
  const HURT_KNOCKBACK_X = 360;
  const HURT_KNOCKBACK_Y = -540;

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the damage rules`);
  }

  function refreshGroundedState(world) {
    const player = world.player;
    player.onGround = Physics.isSupported(player, World.solids(world));
    if (player.onGround) {
      player.coyote = Physics.COYOTE_TIME;
      player.airJumps = World.airJumpBudget(world);
    }
  }

  function centerBurst(world, tone, count, options) {
    const player = world.player;
    World.emit(world, "burst", {
      x: player.x + player.w / 2,
      y: player.y + player.h / 2,
      tone,
      count,
      ...(options || {}),
    });
  }

  /**
   * Apply `damage` to the player. A fall passes `forceRespawn`, which costs one
   * heart and returns the player to the last lit lantern even through Moon
   * Sugar or ordinary invulnerability, because there is nothing to stand on.
   */
  function hurt(world, damage, forceRespawn = false) {
    const player = world.player;
    if (player.superInvuln > 0 && !forceRespawn) {
      if (player.guardFeedbackCd > 0) return;
      player.guardFeedbackCd = SUPER_GUARD_FEEDBACK_COOLDOWN;
      World.emit(world, "shake", { amount: 5 });
      centerBurst(world, "moon", 12);
      World.emit(world, "cue", { name: "hit_super" });
      return;
    }
    if (player.invuln > 0 && !forceRespawn) return;
    if (world.assist.invulnerable) {
      // Assist absorbs the damage. A fall still returns the player to the last
      // lit lantern, because the level below the floor has nowhere to stand.
      if (forceRespawn) {
        respawn(world);
        return;
      }
      if (player.guardFeedbackCd > 0) return;
      player.guardFeedbackCd = SUPER_GUARD_FEEDBACK_COOLDOWN;
      centerBurst(world, "moon", 10);
      World.emit(world, "cue", { name: "hit_super" });
      return;
    }
    World.emit(world, "hitstop", { ms: 70 });
    world.run.damaged = true;
    World.breakCombo(world);
    player.health -= damage;
    player.invuln = HURT_INVULNERABILITY;
    player.hurtFlash = 0.3;
    player.vx = -player.facing * HURT_KNOCKBACK_X;
    player.vy = HURT_KNOCKBACK_Y;
    World.emit(world, "shake", { amount: 13 });
    centerBurst(world, "danger", 24);
    World.emit(world, "cue", { name: "hit_take" });
    World.emit(world, "hurt", { health: player.health, maxHealth: player.maxHealth });
    if (player.health <= 0 || forceRespawn) {
      if (player.health <= 0) {
        player.settledOutcome = Rules.OUTCOME_DEATH;
        World.emit(world, "outcome", { outcome: Rules.OUTCOME_DEATH });
      } else {
        respawn(world);
      }
    }
  }

  /** Return the player to the respawn anchor, bottom-aligned for any body size. */
  function respawn(world) {
    const player = world.player;
    World.emit(world, "respawn");
    world.bolts = [];
    World.breakCombo(world);
    player.x = player.spawn.x;
    // Spawn anchors are authored for the base silhouette. Bottom-align instead
    // of copying y directly, so respawning while enlarged does not start the
    // player inside the platform.
    player.y = player.spawn.y + player.baseH - player.h;
    player.vx = 0;
    player.vy = 0;
    World.emit(world, "snap", { camera: true });
    player.invuln = RESPAWN_INVULNERABILITY;
    player.skillTimer = 0;
    player.glide = 0;
    player.glideIntent = 0;
    player.dashDir = player.facing;
    player.guardFeedbackCd = 0;
    refreshGroundedState(world);
    World.emit(world, "cameraReset");
    World.emit(world, "hitstopReset");
    World.emit(world, "shake", { amount: 9 });
  }

  const api = {
    SUPER_GUARD_FEEDBACK_COOLDOWN,
    HURT_INVULNERABILITY,
    RESPAWN_INVULNERABILITY,
    refreshGroundedState,
    hurt,
    respawn,
  };

  root.NiniYuanDamage = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
