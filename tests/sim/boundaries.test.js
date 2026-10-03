"use strict";

// Architectural boundaries of the simulation layer.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { Sim, chapters, makeWorld, run, press } = require("../helpers/sim.js");

const files = ["src/sim", "src/data"].flatMap((dir) =>
  fs.readdirSync(dir).filter((name) => name.endsWith(".js")).map((name) => path.join(dir, name)),
);

for (const file of files) {
  const source = fs.readFileSync(file, "utf8").replace(/typeof window/g, "");
  assert.doesNotMatch(source, /\bdocument\.[a-zA-Z]|\bwindow\.[a-zA-Z]/, `${file} must stay DOM-free`);
  // A chapter must play identically on a phone and a wide desktop, so the
  // simulation reads world-space constants only.
  assert.doesNotMatch(source, /\bview\.(w|h|dpr)\b|innerWidth|innerHeight|devicePixelRatio/, `${file} must not read the viewport`);
  assert.doesNotMatch(source, /Math\.random/, `${file} must stay deterministic`);
  assert.doesNotMatch(source, /localStorage|setTimeout|requestAnimationFrame|performance\.now/, `${file} must not own timers or storage`);
}

/* -- browser-style loading: every module registers a global ----------------- */

{
  const context = { window: {} };
  const order = [
    "src/core/game-rules.js", "src/core/progression.js",
    "src/data/chapters.js", "src/data/characters.js",
    "src/sim/physics.js", "src/sim/world.js", "src/sim/damage.js", "src/sim/warden.js",
    "src/sim/enemies.js", "src/sim/projectiles.js", "src/sim/mechanics.js", "src/sim/player.js", "src/sim/sim.js",
  ];
  for (const file of order) vm.runInNewContext(fs.readFileSync(file, "utf8"), context, { filename: file });
  assert.equal(typeof context.window.NiniYuanSim.step, "function", "the facade loads from classic scripts in index order");
  const html = fs.readFileSync("index.html", "utf8");
  let cursor = -1;
  for (const file of order.slice(2)) {
    const at = html.indexOf(`./${file}`);
    assert.ok(at > cursor, `index.html loads ${file} in dependency order`);
    cursor = at;
  }
  assert.ok(cursor < html.indexOf("./src/game.js"), "the simulation loads before the runtime");
  const serviceWorker = fs.readFileSync("service-worker.js", "utf8");
  for (const file of order.slice(2)) assert.ok(serviceWorker.includes(`./${file}`), `the offline cache ships ${file}`);
}

/* -- determinism: identical input produces identical worlds ------------------ */

function scripted(chapterIndex, characterId) {
  const world = makeWorld(chapters()[chapterIndex], characterId);
  run(world, 900, (frame, input) => {
    input.right = frame % 300 < 260;
    input.left = frame % 300 >= 280;
    if (frame % 45 === 0) press(input, "jump");
    else input.jump = frame % 45 < 20;
    if (frame % 120 === 60) input.skillPressed = true;
    input.skill = frame % 120 >= 60 && frame % 120 < 90;
    if (frame % 97 === 0) input.shootPressed = true;
  });
  return world;
}

for (const [index, id] of [[2, "nini"], [7, "yuan"], [12, "nini"], [4, "yuan"]]) {
  const a = scripted(index, id);
  const b = scripted(index, id);
  const snapshot = (world) => JSON.stringify({
    player: world.player,
    enemies: world.level.enemies,
    projectiles: world.projectiles,
    bolts: world.bolts,
    warden: world.warden && { ...world.warden, data: undefined },
    combo: world.combo,
    run: world.run,
  });
  assert.equal(snapshot(a), snapshot(b), `chapter ${index + 1} as ${id} replays deterministically`);
  // Each script either survives the full 7.5 s or reaches a terminal outcome;
  // both are deterministic and both exercise contact, combat, and movement.
  assert.ok(a.player.elapsed >= 7.49 || a.player.settledOutcome, "the scripted run played to time or to an outcome");
  assert.ok(a.player.x > a.player.spawn.x + 400 || a.player.settledOutcome, "the scripted run travelled through the chapter");
}

/* -- solids are cached, not rebuilt per query -------------------------------- */

{
  const world = makeWorld(chapters()[0], "nini");
  const first = Sim.solids(world);
  run(world, 30);
  assert.equal(Sim.solids(world), first, "an unchanged chapter reuses one solids list");
}

console.log(`sim/boundaries: ${files.length} simulation modules are DOM-free, view-free, deterministic, and load in order`);
