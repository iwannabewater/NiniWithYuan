"use strict";

// Movement contracts, exercised through the real fixed-step simulation.

const assert = require("node:assert/strict");
const Physics = require("../../src/sim/physics.js");
const { jumpApex } = require("../../src/data/characters.js");
const {
  Sim, CHARACTERS, DT, TILE, chapterById, syntheticChapter, makeWorld, run, press, release, eventsOf,
} = require("../helpers/sim.js");

const C = Sim.CONSTANTS;
const FLOOR_Y = TILE * 14;

/* -- jump apex: four-tile gaps stay clearable, Nini out-jumps Yuan ---------- */

for (const id of ["nini", "yuan"]) {
  const apex = jumpApex(CHARACTERS[id]);
  assert.ok(apex >= TILE * 4 + 4, `${id} jump apex ${apex.toFixed(1)}px must clear four-tile platform steps`);
}
assert.ok(jumpApex(CHARACTERS.nini) > jumpApex(CHARACTERS.yuan), "Nini keeps the higher jump for precision platforming");

for (const id of ["nini", "yuan"]) {
  const world = makeWorld(syntheticChapter(), id);
  const startY = world.player.y;
  let peak = startY;
  run(world, 120, (frame, input) => {
    if (frame === 0) press(input, "jump");
    peak = Math.min(peak, world.player.y);
  });
  const simulated = startY - peak;
  const theory = jumpApex(CHARACTERS[id]);
  assert.ok(Math.abs(simulated - theory) < 8, `${id} simulated apex ${simulated.toFixed(1)} should track theory ${theory.toFixed(1)}`);
}

/* -- horizontal response contracts ---------------------------------------- */

function durationUntil(start, target, options, predicate) {
  let velocity = start;
  let elapsed = 0;
  while (!predicate(velocity) && elapsed < 1) {
    const frameOptions = typeof options === "function" ? options(elapsed) : options;
    velocity = Physics.horizontalVelocity(velocity, target, frameOptions, DT);
    elapsed += DT;
  }
  return elapsed;
}

for (const character of [CHARACTERS.nini, CHARACTERS.yuan]) {
  const launch = durationUntil(0, character.speed, { baseAcceleration: character.accel, grounded: true, intent: 1 }, (v) => v >= character.speed);
  const reverse = durationUntil(character.speed, -character.speed, (elapsed) => ({
    baseAcceleration: character.accel, grounded: true, intent: -1, turning: elapsed < 0.1,
  }), (v) => v <= -character.speed);
  const stop = durationUntil(character.speed, 0, { baseAcceleration: character.accel, grounded: true, intent: 0 }, (v) => v === 0);
  assert.ok(launch <= 0.14, `${character.id} reaches full ground speed within 140 ms (got ${launch})`);
  assert.ok(reverse < 0.19, `${character.id} full-speed reversal finishes under 190 ms (got ${reverse})`);
  assert.ok(stop < 0.12, `${character.id} neutral ground stop finishes under 120 ms (got ${stop})`);
  const drift = Physics.horizontalVelocity(character.speed, character.speed * -0.14, {
    baseAcceleration: character.accel, grounded: true, intent: 0,
  }, DT);
  assert.equal(drift, character.speed - character.accel * DT, "environmental drift keeps base acceleration under neutral intent");
}

/* -- coyote time and the jump buffer ---------------------------------------- */

{
  // Run off a ledge, then press jump inside the coyote window: a full ground
  // jump that does not spend Nini's air jump.
  const ledge = syntheticChapter({
    platforms: [
      { x: 0, y: FLOOR_Y, w: TILE * 6, h: TILE * 2, type: "ground", phase: "" },
      { x: TILE * 12, y: FLOOR_Y, w: TILE * 30, h: TILE * 2, type: "ground", phase: "" },
    ],
  });
  const world = makeWorld(ledge, "nini");
  world.player.x = TILE * 6 - 40;
  let leftAt = -1;
  run(world, 90, (frame, input) => {
    input.right = true;
    if (leftAt < 0 && !world.player.onGround) leftAt = frame;
    if (leftAt >= 0 && frame === leftAt + Math.floor(0.08 / DT)) press(input, "jump");
  });
  assert.ok(leftAt > 0, "the player must leave the ledge");
  assert.equal(world.player.airJumps, 1, "a coyote jump is a ground jump and keeps Nini's air jump");
  assert.ok(eventsOf(world, "jump").some((event) => event.air === false), "the coyote jump is reported as a ground jump");
}

for (const [dropHeight, expectJump] of [[15, true], [60, false]]) {
  // From rest, 15 px of fall takes ~114 ms (inside the 140 ms buffer) and 60 px
  // takes ~228 ms (outside it). Yuan has no air jump, so only the buffer can fire.
  const world = makeWorld(syntheticChapter(), "yuan");
  world.player.y = FLOOR_Y - 56 - dropHeight;
  world.player.onGround = false;
  world.player.coyote = 0;
  run(world, 40, (frame, input) => {
    if (frame === 0) press(input, "jump");
  });
  assert.equal(
    eventsOf(world, "jump").length,
    expectJump ? 1 : 0,
    expectJump ? "a jump pressed within 140 ms of landing fires on touchdown" : "an expired buffer must not fire on touchdown",
  );
}

/* -- the opening jump --------------------------------------------------------- */

for (const id of ["nini", "yuan"]) {
  const world = makeWorld(chapterById("sakura"), id);
  assert.equal(world.player.onGround, true, `${id} begins grounded on the authored opening platform`);
  run(world, 6, (frame, input) => {
    if (frame === 5) press(input, "jump");
  });
  const jumps = eventsOf(world, "jump");
  assert.equal(jumps.length, 1, `${id} can jump within the first 100 ms`);
  assert.equal(jumps[0].air, false, `${id}'s opening jump is a ground jump`);
  if (id === "nini") assert.equal(world.player.airJumps, 1, "Nini keeps her air jump after the opening jump");
}

/* -- variable jump height ----------------------------------------------------- */

{
  const held = makeWorld(syntheticChapter(), "nini");
  const cut = makeWorld(syntheticChapter(), "nini");
  let heldPeak = held.player.y;
  let cutPeak = cut.player.y;
  run(held, 90, (frame, input) => {
    if (frame === 0) press(input, "jump");
    heldPeak = Math.min(heldPeak, held.player.y);
  });
  run(cut, 90, (frame, input) => {
    if (frame === 0) press(input, "jump");
    if (frame === 6) release(input, "jump");
    cutPeak = Math.min(cutPeak, cut.player.y);
  });
  assert.ok(cutPeak - heldPeak > 60, "releasing jump early cuts the arc");
  assert.equal(C.JUMP_CUT_THRESHOLD, -160);
  assert.equal(C.JUMP_CUT_MULTIPLIER, 0.56);
  assert.equal(C.COYOTE_TIME, 0.12);
  assert.equal(C.JUMP_BUFFER, 0.14);
}

/* -- Nini's double jump and glide -------------------------------------------- */

{
  const world = makeWorld(syntheticChapter(), "nini");
  run(world, 40, (frame, input) => {
    if (frame === 0) press(input, "jump");
    if (frame === 20) press(input, "jump");
    if (frame === 30) press(input, "jump");
  });
  const jumps = eventsOf(world, "jump");
  assert.equal(jumps.length, 2, "Nini gets exactly one air jump");
  assert.equal(jumps[1].air, true);
}

{
  // A sub-step skill tap while airborne opens the 120 ms glide intent window;
  // the cooldown starts when the glide starts, not when the key was pressed.
  const world = makeWorld(syntheticChapter(), "nini");
  let glideStarted = -1;
  run(world, 50, (frame, input) => {
    if (frame === 0) press(input, "jump");
    if (frame === 12) {
      input.skillPressed = true;
      input.skill = false;
    }
    if (glideStarted < 0 && world.player.glide > 0) glideStarted = frame;
  });
  assert.ok(glideStarted >= 12 && glideStarted <= 13, `a skill tap opens the glide immediately (started at ${glideStarted})`);
  assert.ok(world.player.skillCd > 0, "the cooldown begins when the glide begins");
  assert.equal(C.NINI_GLIDE_MIN_TAP, 0.12);
}

{
  const world = makeWorld(syntheticChapter(), "nini");
  world.player.y = TILE * 2;
  world.player.onGround = false;
  world.player.vy = 600;
  let maxFall = 0;
  run(world, 60, (frame, input) => {
    input.skill = true;
    if (frame > 20) maxFall = Math.max(maxFall, world.player.vy);
  });
  // The cap applies before the step's reduced glide gravity is integrated.
  const glideGravityStep = CHARACTERS.nini.gravity * 0.26 * DT;
  assert.ok(maxFall <= C.NINI_GLIDE_FALL_SPEED + glideGravityStep + 1e-6, `gliding caps descent near ${C.NINI_GLIDE_FALL_SPEED}px/s (got ${maxFall})`);
  assert.ok(C.NINI_GLIDE_DURATION >= 1 && C.NINI_GLIDE_FALL_SPEED <= 210, "glide stays long and slow enough to read");
}

/* -- Yuan's dash -------------------------------------------------------------- */

{
  const distance = C.YUAN_DASH_SPEED * C.YUAN_DASH_TIME;
  assert.ok(distance >= C.YUAN_DASH_MIN_DISTANCE && distance <= C.YUAN_DASH_MAX_DISTANCE, `dash distance ${distance} stays within contract`);

  const world = makeWorld(syntheticChapter(), "yuan");
  world.player.facing = -1;
  world.player.x = TILE * 30;
  run(world, 4, (frame, input) => {
    if (frame === 0) input.skillPressed = true;
  });
  assert.equal(world.player.dashDir, -1, "the dash records its direction when it begins");
  assert.ok(world.player.vx <= -C.YUAN_DASH_SPEED + 1, "the dash drives at full speed in its recorded direction");
}

{
  // On the ground, a dash that reaches a ledge cancels its remaining dash time
  // (the edge brake) unless the player is jumping, so it travels far less than
  // the same dash on open ground. Residual momentum is not removed.
  const travel = (platformWidth, jumping) => {
    const world = makeWorld(syntheticChapter({
      platforms: [{ x: 0, y: FLOOR_Y, w: platformWidth, h: TILE * 2, type: "ground", phase: "" }],
    }), "yuan");
    world.player.x = TILE * 10 - 80;
    const startX = world.player.x;
    run(world, 40, (frame, input) => {
      if (frame === 0) input.skillPressed = true;
      input.jump = jumping;
    });
    return world.player.x - startX;
  };
  const openGround = travel(TILE * 60, false);
  const atLedge = travel(TILE * 10, false);
  assert.ok(atLedge < openGround * 0.6, `the edge brake shortens a ground dash at a ledge (${atLedge.toFixed(1)} vs ${openGround.toFixed(1)})`);
  assert.ok(travel(TILE * 10, true) > atLedge + 20, "holding jump opts out of the edge brake");
}

{
  // Regression: the dash shatters an amber crystal it runs into. The old
  // post-move overlap test could never see a crystal the body was resolved
  // flush against, so this mechanic silently never fired.
  const crystal = { x: TILE * 20, y: FLOOR_Y - TILE * 2, w: TILE, h: TILE * 2, type: "breakable", phase: "" };
  const chapter = syntheticChapter({
    platforms: [{ x: 0, y: FLOOR_Y, w: TILE * 60, h: TILE * 2, type: "ground", phase: "" }, crystal],
  });
  const world = makeWorld(chapter, "yuan");
  world.player.x = crystal.x - 34 - 20;
  run(world, 30, (frame, input) => {
    input.right = true;
    if (frame === 1) input.skillPressed = true;
  });
  const runtimeCrystal = world.level.platforms.find((p) => p.type === "breakable");
  assert.equal(runtimeCrystal.broken, true, "Yuan's dash breaks the crystal in its path");
  assert.equal(eventsOf(world, "crystal").length, 1);
  assert.ok(world.player.x > crystal.x, "the dash carries through the shattered crystal");

  const walker = makeWorld(chapter, "yuan");
  walker.player.x = crystal.x - 34 - 20;
  run(walker, 60, (frame, input) => {
    input.right = true;
  });
  assert.equal(walker.level.platforms.find((p) => p.type === "breakable").broken, undefined, "walking into a crystal does not break it");
}

/* -- wind fields ------------------------------------------------------------- */

for (const force of [300, 310, 340, 360]) {
  const strength = force / C.WIND_REFERENCE_FORCE;
  for (const character of [CHARACTERS.nini, CHARACTERS.yuan]) {
    const air = character.speed * C.WIND_AIR_DRIFT * strength;
    const ground = character.speed * C.WIND_GROUND_DRIFT * strength;
    assert.ok(air >= 145 && air <= 240, `${character.id} air wind target ${air.toFixed(1)} changes landings but stays traversable`);
    assert.ok(ground <= 90, `${character.id} ground wind ${ground.toFixed(1)} does not overpower walking`);
    assert.ok(character.speed - air >= character.speed * 0.52, `${character.id} can still make progress into the wind`);
  }
}
assert.ok(C.WIND_MAX_SPEED >= 1.2 && C.WIND_MAX_SPEED <= 1.4, "same-direction wind speed ceiling stays noticeable but bounded");

{
  const world = makeWorld(syntheticChapter({ wind: [{ x: 0, y: 0, w: TILE * 60, h: TILE * 16, force: 320 }] }), "nini");
  const x0 = world.player.x;
  run(world, 60);
  assert.ok(world.player.x > x0 + 20, "a wind field drifts an idle player downwind");
  assert.equal(world.player.windDir, 1, "the player exposes the active wind direction to presentation");
}

/* -- pickups, springs, and moving platforms -------------------------------- */

{
  const player = { x: 8 * TILE, y: 14 * TILE - 56, w: 34, h: 56 };
  const berry = { x: 8 * TILE + 10, y: 12 * TILE + 10, w: 30, h: 30 };
  assert.equal(Physics.bodyOverlaps(player, berry), false, "the physical body misses a head-height pickup");
  assert.equal(Physics.pickupOverlaps(player, berry), true, "standing pickup reach collects visible food without a jump");

  const world = makeWorld(syntheticChapter({
    powerups: [{ x: TILE * 2 + 10, y: TILE * 12 + 10, w: 30, h: 30, kind: "heart", phase: "", taken: false }],
  }), "nini");
  run(world, 2);
  assert.equal(world.level.powerups[0].taken, true, "the simulation collects pickups through the reach rect");
}

{
  const world = makeWorld(syntheticChapter({
    springs: [{ x: TILE * 3, y: FLOOR_Y - 18, w: TILE, h: 18, power: 1100 }],
  }), "nini");
  world.player.x = TILE * 3 + 4;
  world.player.y = FLOOR_Y - 18 - 56;
  run(world, 2);
  assert.ok(world.player.vy < -1000, "a spring launches the player with its authored power");
  assert.equal(eventsOf(world, "spring").length, 1);
}

{
  const lift = { x: TILE * 4, y: TILE * 10, w: TILE * 3, h: 18, ox: TILE * 4, oy: TILE * 10, range: TILE * 4, speed: 90, axis: "x", dir: 1, dx: 0, dy: 0, type: "jade", phase: "" };
  const world = makeWorld(syntheticChapter({ moving: [lift] }), "nini");
  world.player.x = TILE * 5;
  world.player.y = TILE * 10 - 56;
  run(world, 4);
  const startX = world.player.x;
  run(world, 60);
  // 90 px/s for 0.5 s is 45 px of carry; the player supplies no input.
  assert.ok(Math.abs(world.player.x - startX - 45) < 2, `a moving platform carries a standing player (${(world.player.x - startX).toFixed(2)} px)`);
}

console.log("sim/movement: apex, response, coyote, buffer, jump cut, glide, dash, crystal, wind, pickups, springs, and carry passed");
