"use strict";

// Phase-tide and star-gate contracts through the real simulation.

const assert = require("node:assert/strict");
const World = require("../../src/sim/world.js");
const {
  Sim, TILE, syntheticChapter, makeWorld, run, eventsOf,
} = require("../helpers/sim.js");

const FLOOR_Y = TILE * 14;

/* -- the tide clock ----------------------------------------------------------- */

{
  const level = { phaseTide: { period: 3, offset: 0.5, warning: 0.5 } };
  const at = (t) => World.tideAt(level, t, {});
  assert.equal(at(0).active, "a");
  assert.equal(at(2.6).active, "b", "the offset shifts the phase boundary");
  assert.ok(Math.abs(at(0).remaining - 2.5) < 1e-9);
  assert.equal(at(2.2).warning, true, "the last half second of a phase warns");
  assert.equal(at(1).warning, false);
  assert.equal(World.tideAt({}, 4, {}).enabled, false, "chapters without a tide report a disabled clock");
  assert.equal(Sim.phaseIsActive({ phase: "b" }, at(0)), false);
  assert.equal(Sim.phaseIsActive({ phase: "" }, at(0)), true, "unphased items are always active");
}

{
  // Phase platforms collide only in their phase, and the solids list follows
  // the tide without rebuilding between turns.
  const chapter = syntheticChapter({
    phaseTide: { period: 1, offset: 0, warning: 0.3 },
    platforms: [
      { x: 0, y: FLOOR_Y, w: TILE * 60, h: TILE * 2, type: "ground", phase: "" },
      { x: TILE * 10, y: TILE * 10, w: TILE * 3, h: TILE, type: "phase", phase: "b" },
    ],
  });
  const world = makeWorld(chapter, "nini");
  const before = Sim.solids(world);
  assert.equal(before.some((p) => p.phase === "b"), false, "phase b is absent while the tide is in phase a");
  run(world, 10);
  assert.equal(Sim.solids(world), before, "the solids list is reused while nothing changes");
  run(world, 120);
  assert.equal(world.tide.active, "b");
  assert.ok(Sim.solids(world).some((p) => p.phase === "b"), "phase b becomes solid when its tide arrives");
}

{
  // A tide turning around the player never leaves the body inside geometry.
  const chapter = syntheticChapter({
    phaseTide: { period: 0.8, offset: 0, warning: 0.3 },
    platforms: [
      { x: 0, y: FLOOR_Y, w: TILE * 60, h: TILE * 2, type: "ground", phase: "" },
      { x: TILE * 2, y: FLOOR_Y - TILE, w: TILE * 3, h: TILE, type: "phase", phase: "b" },
    ],
  });
  const world = makeWorld(chapter, "nini");
  world.player.x = TILE * 3;
  world.player.y = FLOOR_Y - 56;
  run(world, 110);
  const blocker = world.level.platforms[1];
  const inside = world.player.x + 3 < blocker.x + blocker.w && world.player.x + world.player.w - 3 > blocker.x
    && world.player.y + 3 < blocker.y + blocker.h && world.player.y + world.player.h > blocker.y;
  assert.equal(inside, false, "phase escape moves the player out of a newly solid bridge");
}

{
  // Inactive-phase pickups cannot be collected.
  const chapter = syntheticChapter({
    phaseTide: { period: 5, offset: 0, warning: 0.3 },
    coins: [{ x: TILE * 2 + 18, y: FLOOR_Y - 40, w: 22, h: 22, kind: "coin", phase: "b", taken: false }],
  });
  const world = makeWorld(chapter, "nini");
  run(world, 30);
  assert.equal(world.level.coins[0].taken, false, "a ghosted pickup is out of reach until its phase");
}

/* -- star gates --------------------------------------------------------------- */

function gateChapter(exitPlatforms) {
  return syntheticChapter({
    platforms: [
      { x: 0, y: FLOOR_Y, w: TILE * 60, h: TILE * 2, type: "ground", phase: "" },
      ...exitPlatforms,
    ],
    portals: [
      { id: "a", pair: "b", x: TILE * 4 + 3, y: FLOOR_Y - 76, w: 42, h: 76, palette: "cyan" },
      { id: "b", pair: "a", x: TILE * 30 + 3, y: FLOOR_Y - 76, w: 42, h: 76, palette: "gold" },
    ],
  });
}

{
  const world = makeWorld(gateChapter([]), "yuan");
  // Start far enough back to reach full speed before the gate.
  world.player.x = 10;
  let teleported = -1;
  let velocityAtGate = 0;
  run(world, 90, (frame, input) => {
    input.right = true;
    if (teleported < 0 && world.player.x > TILE * 20) {
      teleported = frame;
      velocityAtGate = world.player.vx;
    }
  });
  assert.ok(teleported > 0, "walking into a gate carries the player to its pair");
  assert.ok(velocityAtGate > 400, "travel preserves momentum");
  assert.equal(world.player.facing, 1, "travel preserves facing");
  assert.equal(eventsOf(world, "portal").length, 1, "the exit lock prevents bouncing straight back");
  assert.ok(eventsOf(world, "snap").length >= 1, "travel snaps presentation instead of sweeping");
}

{
  // An unsafe exit (a solid over the destination) blocks travel.
  const world = makeWorld(gateChapter([{ x: TILE * 29, y: FLOOR_Y - 60, w: TILE * 3, h: 40, type: "stone", phase: "" }]), "yuan");
  world.player.x = TILE * 4;
  run(world, 10);
  assert.ok(world.player.x < TILE * 10, "a blocked exit never teleports the player into geometry");
  assert.equal(eventsOf(world, "portal").length, 0);
}

console.log("sim/mechanics: tide clock, phase solids, phase escape, ghost pickups, and star gates passed");
