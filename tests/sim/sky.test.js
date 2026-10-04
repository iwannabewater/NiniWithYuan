"use strict";

// World 4 mechanics through the real simulation: magpie bridges and updrafts.

const assert = require("node:assert/strict");
const Mechanics = require("../../src/sim/mechanics.js");
const { Sim, TILE, syntheticChapter, makeWorld, run, eventsOf } = require("../helpers/sim.js");

const DT = 1 / 120;
const PIT = TILE * 15;

/* -- magpie bridges ------------------------------------------------------------ */

{
  // A lone bridge over a pit: the player starts standing on it.
  const bridge = { x: TILE * 2, y: TILE * 10, w: TILE * 4, h: 18, type: "magpie" };
  const chapter = syntheticChapter({
    platforms: [{ x: TILE * 20, y: TILE * 14, w: TILE * 10, h: TILE * 2, type: "ground", phase: "" }],
    bridges: [bridge],
    start: { x: TILE * 3, y: TILE * 10 - 70 },
    height: PIT,
  });
  const world = makeWorld(chapter, "nini");
  run(world, 40);
  const live = world.level.bridges[0];
  assert.equal(world.player.onGround, true, "a resting bridge is solid underfoot");
  assert.equal(live.state, "tremble", "standing on a bridge sets it trembling");

  const holdFrames = Math.ceil(Mechanics.BRIDGE_HOLD / DT) + 2;
  run(world, holdFrames);
  assert.equal(live.state, "gone", "after the hold the flock scatters");
  assert.equal(Sim.solids(world).includes(live), false, "a scattered bridge is not solid");
  assert.ok(eventsOf(world, "bridgeScatter").length === 1, "the scatter is reported once");
  run(world, 30);
  assert.equal(world.player.onGround, false, "the player falls through the gap");

  // Move the player well clear, then let the flock regather.
  world.player.x = TILE * 22;
  world.player.y = TILE * 14 - world.player.h;
  world.player.vy = 0;
  run(world, Math.ceil(Mechanics.BRIDGE_GONE / DT) + 4);
  assert.equal(live.state, "rest", "the flock regathers once the span is clear");
  assert.equal(Sim.solids(world).includes(live), true, "a regathered bridge is solid again");
  assert.equal(eventsOf(world, "bridgeReform").length, 1);
}

{
  // The flock waits rather than regathering inside a body.
  const bridge = { x: TILE * 2, y: TILE * 10, w: TILE * 4, h: 18, type: "magpie", state: "gone", timer: 0.01, solid: false };
  const world = makeWorld(syntheticChapter({ bridges: [bridge], start: { x: TILE * 3, y: TILE * 10 - 10 } }), "yuan");
  world.level.bridges[0].x = world.player.x - 10;
  world.level.bridges[0].y = world.player.y + 4;
  Mechanics.updateBridges(world, DT);
  assert.equal(world.level.bridges[0].state, "gone", "a bridge never closes around the player");
}

/* -- updrafts ------------------------------------------------------------------- */

{
  const updraft = { x: TILE * 4, y: TILE * 2, w: TILE * 3, h: TILE * 12, force: 900, max: 480 };
  const chapter = syntheticChapter({ updrafts: [updraft], start: { x: TILE * 5, y: TILE * 12 } });
  const world = makeWorld(chapter, "nini");
  const startY = world.player.y;
  let fastest = 0;
  run(world, 90, (frame, input, w) => {
    fastest = Math.min(fastest, w.player.vy);
  });
  assert.ok(world.player.y < startY - TILE * 2, "an updraft lifts the player off the ground");
  assert.ok(fastest >= -updraft.max - 1e-6, "rising speed is capped by the updraft");
  assert.ok(world.player.updraftTimer > 0, "the player knows it is riding an updraft");

  const still = makeWorld(syntheticChapter({ updrafts: [updraft], start: { x: TILE * 12, y: TILE * 12 } }), "nini");
  run(still, 60);
  assert.equal(still.player.onGround, true, "outside the column nothing lifts");
}

/* -- determinism ------------------------------------------------------------------ */

{
  const make = () => makeWorld(syntheticChapter({
    bridges: [{ x: TILE * 2, y: TILE * 10, w: TILE * 4, h: 18, type: "magpie" }],
    updrafts: [{ x: TILE * 8, y: TILE * 2, w: TILE * 3, h: TILE * 12, force: 900, max: 460 }],
    start: { x: TILE * 3, y: TILE * 10 - 70 },
  }), "yuan");
  const script = (frame, input) => { input.right = frame > 30 && frame < 200; };
  const a = run(make(), 400, script);
  const b = run(make(), 400, script);
  assert.deepEqual([a.player.x, a.player.y, a.level.bridges[0].state], [b.player.x, b.player.y, b.level.bridges[0].state], "bridges and updrafts are deterministic");
}

console.log("sim/sky: magpie bridges scatter and regather, updrafts lift with a cap, all deterministic passed");
