((root) => {
  "use strict";

  // The fixed-step simulation facade. `step` preserves the authored update
  // order: moving platforms, the player, hostiles, hostile bolts, the warden,
  // projectiles, pickups, then the chain. A settled terminal outcome stops the
  // step at the next boundary, so a death can never be followed by rewards in
  // the same tick.

  const Physics = dependency("NiniYuanPhysics", "./physics.js");
  const World = dependency("NiniYuanWorld", "./world.js");
  const Damage = dependency("NiniYuanDamage", "./damage.js");
  const Enemies = dependency("NiniYuanEnemySim", "./enemies.js");
  const Projectiles = dependency("NiniYuanProjectileSim", "./projectiles.js");
  const Warden = dependency("NiniYuanWardenSim", "./warden.js");
  const Mechanics = dependency("NiniYuanMechanics", "./mechanics.js");
  const PlayerSim = dependency("NiniYuanPlayerSim", "./player.js");

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before the simulation facade`);
  }

  function createInput() {
    return {
      left: false,
      right: false,
      jump: false,
      skill: false,
      shoot: false,
      jumpPressed: false,
      jumpReleased: false,
      skillPressed: false,
      shootPressed: false,
    };
  }

  function createWorld(chapter, options = {}) {
    return World.createWorld(chapter, { ...options, createWarden: Warden.createWardenState });
  }

  function step(world, input, dt) {
    const player = world.player;
    if (!player || player.settledOutcome) return;
    player.elapsed += dt;
    World.refreshTide(world);
    Mechanics.updateMoving(world, dt);
    const wasOnGround = player.onGround;
    player.prevVy = player.vy;
    PlayerSim.updatePlayer(world, input, dt);
    if (player.settledOutcome) return;
    if (player.onGround && !wasOnGround && player.prevVy > PlayerSim.LANDING_IMPACT_SPEED) {
      player.landingTimer = 0.18;
      World.emit(world, "landing", {
        x: player.x + player.w / 2,
        y: player.y + player.h,
        intensity: Physics.clamp((player.prevVy - PlayerSim.LANDING_IMPACT_SPEED) / 800, 0.2, 1),
      });
    }
    Enemies.updateEnemies(world, dt);
    // Sentries fire in chapters without a warden, so bolts advance on their own
    // schedule rather than inside the encounter update.
    Projectiles.updateHostileBolts(world, dt);
    if (player.settledOutcome) return;
    Warden.updateWarden(world, dt);
    if (player.settledOutcome) return;
    Projectiles.updateProjectiles(world, dt);
    Mechanics.updatePickups(world);
    World.updateCombo(world, dt);
  }

  const CONSTANTS = Object.freeze({
    TILE: 48,
    PLAYER_W: Physics.PLAYER_W,
    PLAYER_H: Physics.PLAYER_H,
    PICKUP_REACH_X: Physics.PICKUP_REACH_X,
    PICKUP_REACH_TOP: Physics.PICKUP_REACH_TOP,
    PICKUP_REACH_BOTTOM: Physics.PICKUP_REACH_BOTTOM,
    COYOTE_TIME: Physics.COYOTE_TIME,
    JUMP_BUFFER: PlayerSim.JUMP_BUFFER,
    JUMP_CUT_THRESHOLD: PlayerSim.JUMP_CUT_THRESHOLD,
    JUMP_CUT_MULTIPLIER: PlayerSim.JUMP_CUT_MULTIPLIER,
    TURN_POSE_DURATION: PlayerSim.TURN_POSE_DURATION,
    YUAN_DASH_SPEED: PlayerSim.YUAN_DASH_SPEED,
    YUAN_DASH_TIME: PlayerSim.YUAN_DASH_TIME,
    YUAN_DASH_MIN_DISTANCE: PlayerSim.YUAN_DASH_MIN_DISTANCE,
    YUAN_DASH_MAX_DISTANCE: PlayerSim.YUAN_DASH_MAX_DISTANCE,
    NINI_GLIDE_DURATION: PlayerSim.NINI_GLIDE_DURATION,
    NINI_GLIDE_FALL_SPEED: PlayerSim.NINI_GLIDE_FALL_SPEED,
    NINI_GLIDE_MIN_TAP: PlayerSim.NINI_GLIDE_MIN_TAP,
    WIND_REFERENCE_FORCE: PlayerSim.WIND_REFERENCE_FORCE,
    WIND_GROUND_DRIFT: PlayerSim.WIND_GROUND_DRIFT,
    WIND_AIR_DRIFT: PlayerSim.WIND_AIR_DRIFT,
    WIND_MAX_SPEED: PlayerSim.WIND_MAX_SPEED,
    PORTAL_COOLDOWN: Mechanics.PORTAL_COOLDOWN,
    GOAL_REACH_X: Mechanics.GOAL_REACH_X,
    GOAL_REACH_Y: Mechanics.GOAL_REACH_Y,
    ENEMY_HIT_FLASH_DURATION: Enemies.ENEMY_HIT_FLASH_DURATION,
    SENTRY_RANGE: Enemies.SENTRY_RANGE,
    PROJECTILE_CULL_RADIUS: Projectiles.PROJECTILE_CULL_RADIUS,
    SUPER_GUARD_FEEDBACK_COOLDOWN: Damage.SUPER_GUARD_FEEDBACK_COOLDOWN,
    WARDEN_TELEGRAPH: Warden.WARDEN_TELEGRAPH,
    WARDEN_RECOVER: Warden.WARDEN_RECOVER,
    WARDEN_CONTACT_COOLDOWN: Warden.WARDEN_CONTACT_COOLDOWN,
  });

  const api = {
    CONSTANTS,
    createInput,
    createWorld,
    step,
    drainEvents: World.drainEvents,
    solids: World.solids,
    tideAt: World.tideAt,
    phaseIsActive: World.phaseIsActive,
    isPhaseItem: World.isPhaseItem,
    supportPlatform: World.supportPlatform,
    chainWindow: World.chainWindow,
    starCount: Mechanics.starCount,
    wardenIsOpen: Warden.wardenIsOpen,
    wardenStage: Warden.wardenStage,
    goalIsSealed: Warden.goalIsSealed,
    sentryCharge: Enemies.sentryCharge,
  };

  root.NiniYuanSim = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
