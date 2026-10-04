"use strict";

// Combat, damage, outcome, and reward contracts through the real simulation.

const assert = require("node:assert/strict");
const Rules = require("../../src/core/game-rules.js");
const {
  Sim, TILE, syntheticChapter, makeWorld, run, press, eventsOf,
} = require("../helpers/sim.js");

const FLOOR_Y = TILE * 14;

function slimeAt(x, overrides = {}) {
  return {
    x, y: FLOOR_Y - 34, w: 38, h: 34, baseX: x, baseY: FLOOR_Y - 34,
    vx: 0, patrol: 160, type: "slime", alive: true, phase: 0, ...overrides,
  };
}

/* -- stomp and contact ----------------------------------------------------- */

{
  const world = makeWorld(syntheticChapter({ enemies: [slimeAt(TILE * 3)] }), "nini");
  const enemy = world.level.enemies[0];
  world.player.x = enemy.x;
  world.player.y = enemy.y - 56 - 2;
  world.player.vy = 400;
  world.player.onGround = false;
  run(world, 1);
  assert.equal(enemy.alive, false, "falling onto a slime stomps it");
  assert.equal(world.player.vy, -620, "a stomp bounces the player");
  assert.equal(world.run.stomps, 1);
  assert.equal(world.combo.chain, 1, "a stomp links the chain");
  assert.equal(world.player.health, 3, "a stomp costs no health");
}

{
  const world = makeWorld(syntheticChapter({ enemies: [slimeAt(TILE * 2 + 30)] }), "nini");
  run(world, 3);
  assert.equal(world.player.health, 2, "walking into a slime costs one heart");
  assert.ok(world.player.invuln > 1, "damage grants invulnerability");
  assert.equal(world.run.damaged, true);
  run(world, 30);
  assert.equal(world.player.health, 2, "invulnerability blocks repeated contact damage");
}

{
  // Moon Sugar blocks damage continuously but rate-limits its feedback. A
  // hazard strip gives continuous contact (an enemy would be defeated by it).
  const guarded = makeWorld(syntheticChapter({
    hazards: [{ x: TILE * 2, y: FLOOR_Y - TILE, w: TILE * 4, h: TILE, type: "spike", phase: "" }],
  }), "nini");
  guarded.player.superInvuln = 8;
  run(guarded, 60);
  assert.equal(guarded.player.health, 3, "Moon Sugar absorbs hazard damage");
  const guardCues = eventsOf(guarded, "cue").filter((event) => event.name === "hit_super").length;
  assert.ok(guardCues >= 2 && guardCues <= 3, `guard feedback is limited to one cue per 180 ms (got ${guardCues} in 500 ms)`);
}

/* -- hazards and death ------------------------------------------------------ */

{
  const world = makeWorld(syntheticChapter({
    hazards: [{ x: TILE * 2, y: FLOOR_Y - TILE, w: TILE * 2, h: TILE, type: "lava", phase: "" }],
  }), "nini");
  run(world, 2);
  assert.equal(world.player.health, 1, "lava costs two hearts");
}

{
  // Terminal precedence: a lethal hit and the goal in the same step resolve
  // to death, and nothing downstream (pickups, rewards) runs after it.
  const chapter = syntheticChapter({
    goal: { x: TILE * 2, y: FLOOR_Y - 120, w: 70, h: 120 },
    hazards: [{ x: TILE * 2, y: FLOOR_Y - TILE, w: TILE * 2, h: TILE, type: "spike", phase: "" }],
    coins: [{ x: TILE * 2 + 10, y: FLOOR_Y - 60, w: 22, h: 22, kind: "coin", phase: "", taken: false }],
  });
  const world = makeWorld(chapter, "nini");
  world.player.health = 1;
  run(world, 2);
  assert.equal(world.player.settledOutcome, Rules.OUTCOME_DEATH, "death wins over a same-step goal");
  assert.equal(world.player.completed, false);
  assert.equal(world.level.coins[0].taken, false, "a terminal step stops downstream pickups");
  assert.deepEqual(eventsOf(world, "outcome").map((event) => event.outcome), [Rules.OUTCOME_DEATH]);
  const before = world.player.elapsed;
  run(world, 10);
  assert.equal(world.player.elapsed, before, "a settled attempt no longer advances");
}

{
  const world = makeWorld(syntheticChapter({ goal: { x: TILE * 2, y: FLOOR_Y - 120, w: 70, h: 120 } }), "yuan");
  run(world, 2);
  assert.equal(world.player.settledOutcome, Rules.OUTCOME_COMPLETE, "reaching the goal completes the chapter");
  assert.equal(eventsOf(world, "outcome").length, 1);
}

/* -- falls, lanterns, and respawn ------------------------------------------ */

{
  const chapter = syntheticChapter({
    platforms: [
      { x: 0, y: FLOOR_Y, w: TILE * 8, h: TILE * 2, type: "ground", phase: "" },
      { x: TILE * 14, y: FLOOR_Y, w: TILE * 40, h: TILE * 2, type: "ground", phase: "" },
    ],
    lanterns: [{ x: TILE * 5, y: FLOOR_Y - 52, w: 26, h: 52, lit: false }],
  });
  const world = makeWorld(chapter, "nini");
  run(world, 200, (frame, input) => {
    input.right = true;
  });
  assert.equal(world.level.lanterns[0].lit, true, "touching a lantern lights it");
  assert.equal(eventsOf(world, "lantern").length, 1);
  assert.equal(world.player.health, 2, "falling below the floor costs one heart");
  assert.equal(world.player.settledOutcome, null, "a fall does not end the attempt");
  assert.ok(Math.abs(world.player.spawn.x - (TILE * 5 + 13 - 17)) < 1e-6, "the respawn anchor moves to the lantern");
  assert.ok(eventsOf(world, "respawn").length >= 1, "a fall respawns the player");
}

{
  const chapter = syntheticChapter({ platforms: [{ x: 0, y: FLOOR_Y, w: TILE * 4, h: TILE * 2, type: "ground", phase: "" }] });
  const world = makeWorld(chapter, "nini", { enabled: true, invulnerable: true });
  run(world, 220, (frame, input) => {
    input.right = frame < 40;
  });
  assert.equal(world.player.health, 3, "assist invulnerability absorbs the fall damage");
  assert.ok(eventsOf(world, "respawn").length >= 1, "assist still returns a fallen player to the lantern");
}

/* -- projectiles ------------------------------------------------------------ */

{
  const world = makeWorld(syntheticChapter({ enemies: [slimeAt(TILE * 10)] }), "yuan");
  run(world, 1, (frame, input) => {
    input.shootPressed = true;
  });
  assert.equal(world.projectiles.length, 1, "shooting spawns one projectile");
  assert.equal(world.player.ammo, 13, "a shot spends ammunition");
  assert.equal(world.projectiles[0].pierce, 1, "Yuan's bolt pierces once");
  run(world, 60);
  assert.equal(world.level.enemies[0].alive, false, "a two-damage bolt defeats a two-HP slime");
  assert.ok(eventsOf(world, "defeat").some((event) => event.cause === "projectile"));
}

{
  const world = makeWorld(syntheticChapter({ enemies: [slimeAt(TILE * 10, { type: "warder" })] }), "yuan");
  run(world, 1, (frame, input) => {
    input.shootPressed = true;
  });
  run(world, 60);
  assert.equal(world.level.enemies[0].alive, true, "a warder's shell deflects bolts");
  assert.ok(eventsOf(world, "cue").some((event) => event.name === "deflect"));
}

{
  const crystal = { x: TILE * 10, y: FLOOR_Y - TILE * 2, w: TILE, h: TILE * 2, type: "breakable", phase: "" };
  for (const [id, expected] of [["yuan", true], ["nini", undefined]]) {
    const world = makeWorld(syntheticChapter({
      platforms: [{ x: 0, y: FLOOR_Y, w: TILE * 60, h: TILE * 2, type: "ground", phase: "" }, { ...crystal }],
    }), id);
    run(world, 1, (frame, input) => {
      input.shootPressed = true;
    });
    run(world, 80);
    assert.equal(world.level.platforms[1].broken, expected, `${id}'s bolt ${expected ? "breaks" : "does not break"} a crystal`);
  }
}

{
  // Nini's bolt homes on a target slightly above its line of flight.
  const world = makeWorld(syntheticChapter({
    enemies: [slimeAt(TILE * 9, { type: "wisp", y: FLOOR_Y - 34 - 70, baseY: FLOOR_Y - 34 - 70, vx: 0 })],
  }), "nini");
  run(world, 1, (frame, input) => {
    input.shootPressed = true;
  });
  const vy0 = world.projectiles[0].vy;
  run(world, 20);
  assert.ok(world.projectiles.length === 0 || world.projectiles[0].vy < vy0, "Nini's bolt steers toward the nearest target");
}

{
  const world = makeWorld(syntheticChapter(), "nini");
  world.player.ammo = 0;
  run(world, 1, (frame, input) => {
    input.shootPressed = true;
  });
  assert.equal(world.projectiles.length, 0, "no ammunition, no shot");
  run(world, Math.ceil(1.6 / (1 / 120)) + 2);
  assert.equal(world.player.ammo, 1, "ammunition regenerates one unit per 1.6 s");
}

/* -- power-ups ---------------------------------------------------------------- */

{
  const powerup = (kind) => ({ x: TILE * 2 + 10, y: FLOOR_Y - 40, w: 30, h: 30, kind, phase: "", taken: false });
  const take = (kind) => {
    const world = makeWorld(syntheticChapter({ powerups: [powerup(kind)] }), "nini");
    world.player.ammo = 10;
    run(world, 2);
    return world;
  };
  const berry = take("berry");
  assert.equal(berry.player.maxHealth, 4);
  assert.equal(berry.player.health, 4);
  assert.ok(berry.player.bigTimer > 19);
  assert.equal(take("moon").player.superInvuln > 7.9, true);
  assert.equal(take("core").player.ammo, 18, "the crystal core raises ammunition into the reserve");
  assert.equal(take("bell").player.skillCd, 0);
  const heartWorld = makeWorld(syntheticChapter({ powerups: [powerup("heart")] }), "nini");
  heartWorld.player.health = 1;
  run(heartWorld, 2);
  assert.equal(heartWorld.player.health, 2, "a health pack restores one heart");
}

/* -- rewards: the chain never buys a star ---------------------------------- */

{
  const coins = [];
  for (let i = 0; i < 6; i += 1) {
    coins.push({ x: TILE * (3 + i) + 18, y: FLOOR_Y - 40, w: 22, h: 22, kind: i % 2 ? "gem" : "coin", phase: "", taken: false });
  }
  const world = makeWorld(syntheticChapter({ coins }), "yuan");
  run(world, 150, (frame, input) => {
    input.right = true;
  });
  const authored = coins.reduce((sum, coin) => sum + (coin.kind === "gem" ? 5 : 1), 0);
  assert.equal(world.player.collectedValue, authored, "the collection rating reads authored pickup values only");
  assert.ok(world.player.coins >= authored, "star dew may grow with the chain");
  assert.equal(Sim.starCount(world), 3);
}

/* -- marrow is recorded the moment it is touched --------------------------- */

{
  const world = makeWorld(syntheticChapter({
    marrow: { x: TILE * 3, y: FLOOR_Y - 60, w: 30, h: 30, taken: false },
  }), "nini");
  run(world, 30, (frame, input) => {
    input.right = true;
  });
  assert.equal(world.run.marrow, true);
  assert.deepEqual(eventsOf(world, "marrow").map((event) => event.levelId), ["synthetic"]);
}

/* -- assist ----------------------------------------------------------------- */

{
  const assisted = makeWorld(syntheticChapter(), "yuan", { enabled: true, extraJump: true, infiniteSkill: true });
  assert.equal(assisted.player.airJumps, 1, "assist adds one air jump to the budget");
  run(assisted, 3, (frame, input) => {
    if (frame === 0) input.skillPressed = true;
  });
  assert.equal(assisted.player.skillCd, 0, "assist removes the skill cooldown");
  assert.equal(assisted.run.assist, true, "an assisted run is marked unranked");
  const disabled = makeWorld(syntheticChapter(), "yuan", { enabled: false, extraJump: true });
  assert.equal(disabled.player.airJumps, 0, "assist helpers do nothing while assist is off");
}

console.log("sim/combat: stomps, contact, guard feedback, hazards, precedence, falls, projectiles, power-ups, rewards, marrow, and assist passed");
