"use strict";

// Warden encounter contracts through the real encounter module.

const assert = require("node:assert/strict");
const WardenSim = require("../../src/sim/warden.js");
const Projectiles = require("../../src/sim/projectiles.js");
const {
  Sim, TILE, chapters, chapterById, makeWorld, run, eventsOf,
} = require("../helpers/sim.js");

/** A live encounter in `phase`, with the player standing clear of the guardian. */
function encounter(phase, characterId = "nini") {
  const world = makeWorld(chapterById("auroracitadel"), characterId);
  const warden = world.warden;
  const arena = warden.data.arena;
  warden.active = true;
  warden.phase = phase;
  warden.phaseTimer = 5;
  warden.x = arena.x + TILE * 6;
  warden.y = warden.data.ground - warden.h - 30;
  world.player.x = arena.x + TILE * 2;
  world.player.y = warden.data.ground - world.player.h;
  world.player.onGround = true;
  return world;
}

function hit(world, source, pierce = 0) {
  const warden = world.warden;
  const player = world.player;
  if (source === "bolt") {
    world.projectiles.push({
      x: warden.x + 10, y: warden.y + 10, w: 8, h: 8, vx: 0, vy: 0, life: 1,
      owner: "yuan", pierce, damage: 2, boosted: false, tone: "accent2",
    });
    Projectiles.updateProjectiles(world, 1 / 120);
  } else if (source === "stomp") {
    player.x = warden.x + 30;
    player.y = warden.y - player.h + 10;
    player.vy = 200;
    WardenSim.resolveWardenContact(world);
  } else if (source === "impact") {
    world.characterId = "yuan";
    player.x = warden.x + 30;
    player.y = warden.y + 20;
    player.vy = 0;
    player.skillTimer = 0.1;
    WardenSim.resolveWardenContact(world);
  } else if (source === "contact") {
    player.x = warden.x + 30;
    player.y = warden.y + 20;
    player.vy = 0;
    WardenSim.resolveWardenContact(world);
  }
  return Sim.drainEvents(world);
}

/* -- the damage gate: only `recover` accepts damage -------------------------- */

for (const phase of ["wait", "telegraph", "act", "recover"]) {
  for (const source of ["bolt", "stomp", "impact"]) {
    const world = encounter(phase);
    const events = hit(world, source);
    const open = phase === "recover";
    const warden = world.warden;
    const cues = events.filter((event) => event.type === "cue").map((event) => event.name);
    assert.equal(warden.health, open ? 14 : 16, `${source} damage in ${phase}`);
    assert.equal(warden.hurtCount, open ? 1 : 0, `${source} hurt count in ${phase}`);
    assert.equal(world.combo.chain, open ? 1 : 0, `${source} chain link in ${phase}`);
    assert.equal(events.filter((event) => event.type === "hitstop").length, open ? 1 : 0, `${source} hit-stop in ${phase}`);
    if (open) {
      assert.ok(!events.some((event) => event.type === "float" && event.text === "护甲"), `${source} shows no armour in recovery`);
      assert.ok(cues.includes(source === "stomp" ? "stomp" : "hit_enemy"));
    } else {
      assert.ok(events.some((event) => event.type === "float" && event.text === "护甲"), `${source} shows armour in ${phase}`);
      assert.deepEqual(cues, ["deflect"], `${source} uses the deflect cue in ${phase}`);
    }
    assert.equal(world.player.health, 3, `${source} never hurts the player`);
    if (source === "bolt") assert.equal(world.projectiles.length, 0, `a spent bolt expires in ${phase}`);
    if (source === "stomp") assert.equal(world.player.vy, -640, `a stomp keeps its bounce in ${phase}`);
    if (source === "impact") assert.equal(warden.contactCd, 0.5, `impact spends its contact cooldown in ${phase}`);
  }
}

for (const phase of ["act", "recover"]) {
  const world = encounter(phase);
  hit(world, "contact");
  assert.equal(world.player.health, 2, `ordinary body contact hurts the player in ${phase}`);
  assert.equal(world.warden.health, 16, `ordinary body contact never damages the guardian in ${phase}`);
}

for (const phase of ["telegraph", "recover"]) {
  const world = encounter(phase);
  hit(world, "bolt", 1);
  assert.equal(world.projectiles.length, 1, `a piercing bolt survives the guardian in ${phase}`);
  assert.equal(world.projectiles[0].pierce, 0, `a piercing bolt spends one pierce in ${phase}`);
}

/* -- the arena seal and the sealed goal ------------------------------------ */

{
  const world = makeWorld(chapterById("auroracitadel"), "nini");
  const arena = world.warden.data.arena;
  assert.equal(Sim.goalIsSealed(world), true, "the goal is sealed until the guardian falls");
  world.player.x = arena.x + TILE * 2;
  world.player.y = world.warden.data.ground - world.player.h;
  run(world, 2);
  assert.equal(world.warden.active, true, "crossing into the arena wakes the guardian");
  assert.ok(eventsOf(world, "wardenWake").length === 1);
  world.player.x = arena.x - 40;
  run(world, 1, (frame, input) => {
    input.left = true;
  });
  assert.ok(world.player.x >= arena.x, "an awake guardian holds the player inside its arena");
}

{
  const world = encounter("recover");
  world.warden.health = 2;
  hit(world, "stomp");
  assert.equal(world.warden.defeated, true, "the final recovery hit fells the guardian");
  assert.equal(Sim.goalIsSealed(world), false, "a felled guardian opens the goal");
}

{
  const world = encounter("recover");
  world.warden.health = 2;
  const events = hit(world, "stomp");
  const felled = events.find((event) => event.type === "wardenDefeated");
  assert.ok(felled, "a felled guardian is reported");
  assert.equal(felled.flawless, true, "an undamaged fight is flawless");
  assert.equal(felled.levelId, "auroracitadel");
}

/* -- stage profiles --------------------------------------------------------- */

const wardenLevels = chapters().filter((level) => level.warden);
assert.deepEqual(wardenLevels.map((level) => level.id), ["auroracitadel", "islandstarcore", "phasetidecourt"]);
for (const level of wardenLevels) {
  const stages = level.warden.stages;
  assert.equal(stages.length, 3, `${level.id} escalates through three stages`);
  assert.ok(stages[2].cadence < stages[0].cadence, `${level.id} attacks faster in its last stage`);
  assert.ok(stages[2].patterns.length > stages[0].patterns.length, `${level.id} widens its pattern pool`);
}
assert.deepEqual(chapterById("auroracitadel").warden.stages.map((s) => s.patterns), [["volley", "sweep"], ["volley", "rain", "sweep"], ["rain", "sweep", "volley", "summon"]]);
assert.deepEqual(chapterById("islandstarcore").warden.stages.map((s) => s.patterns), [["sweep", "volley"], ["sweep", "summon", "volley"], ["volley", "summon", "sweep", "rain"]]);
assert.deepEqual(chapterById("phasetidecourt").warden.stages.map((s) => s.patterns), [["rain", "volley"], ["rain", "sweep", "volley"], ["rain", "volley", "summon", "sweep"]]);
assert.equal(new Set(wardenLevels.map((level) => level.warden.stages.map((s) => s.cadence).join())).size, 3, "each guardian owns its cadence curve");

{
  // Driving a real fight: the guardian cycles through telegraph and recovery,
  // and the stage escalates as star force drops.
  const world = encounter("wait");
  world.warden.phaseTimer = 0.01;
  const seen = new Set();
  run(world, 600, () => {
    seen.add(world.warden.phase);
  });
  for (const phase of ["telegraph", "recover", "wait"]) assert.ok(seen.has(phase), `the encounter reaches ${phase}`);
  world.warden.health = 4;
  assert.equal(Sim.wardenStage(world.warden).cadence, chapterById("auroracitadel").warden.stages[2].cadence, "low star force selects the final stage");
}

{
  // Summons cap at four living minions.
  const world = encounter("telegraph");
  for (let i = 0; i < 4; i += 1) {
    world.warden.attack = "summon";
    world.warden.phase = "telegraph";
    world.warden.phaseTimer = 0;
    WardenSim.updateWarden(world, 1 / 120);
  }
  const living = world.level.enemies.filter((enemy) => enemy.summoned && enemy.alive).length;
  assert.ok(living <= 4, `summons stay capped (got ${living})`);
}

console.log("sim/warden: damage gate matrix, contact, pierce, arena seal, sealed goal, defeat, stages, and summon cap passed");
