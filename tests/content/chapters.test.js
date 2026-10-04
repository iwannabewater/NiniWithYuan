"use strict";

// Authored chapter data contracts. Every chapter must be internally
// consistent: bounds, portal pairs and safe exits, phase content, grounded
// hostiles, hidden marrow, respawn lanterns, and sealed warden arenas.

const assert = require("node:assert/strict");
const Chapters = require("../../src/data/chapters.js");

const TILE = Chapters.TILE;
const levels = Chapters.buildChapters();
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const bodyRect = (p) => ({ x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 3 });

/* -- structure and identity -------------------------------------------------- */

assert.deepEqual(JSON.stringify(levels), JSON.stringify(Chapters.buildChapters()), "chapter data is deterministic");
assert.ok(levels.length >= 15, "the campaign keeps its fifteen authored chapters");
assert.deepEqual(levels.slice(0, 15).map((level) => level.id), [
  "sakura", "moonruin", "cloudsea", "crystalforge", "auroracitadel",
  "stargatecove", "loopinglighthouse", "ringconservatory", "starbridgetide", "islandstarcore",
  "phaseshallows", "tidecorridor", "moonmirrorbreak", "twinstarclocktower", "phasetidecourt",
], "chapter ids are save keys and must stay stable");
assert.ok(levels.slice(0, 5).every((level) => level.world.id === "world1"));
assert.ok(levels.slice(5, 10).every((level) => level.world.id === "world2"));
assert.ok(levels.slice(10, 15).every((level) => level.world.id === "world3"));
assert.deepEqual(
  levels.slice(10, 15).map((level) => level.name),
  ["第十一章 相位浅滩", "第十二章 潮汐回廊", "第十三章 月镜断桥", "第十四章 双星钟塔", "第十五章 星潮王庭"],
);
assert.equal(new Set(levels.map((level) => level.id)).size, levels.length, "chapter ids are unique");

for (const level of levels) {
  assert.ok(level.width > 0 && level.height > 0, `${level.id} has bounds`);
  assert.ok(Number.isFinite(level.par) && level.par > 0, `${level.id} declares a trial par`);
  assert.ok(level.goal.x + level.goal.w <= level.width, `${level.id} goal sits inside the chapter`);
  for (const group of ["platforms", "coins", "powerups", "springs", "hazards", "moving"]) {
    for (const item of level[group] || []) {
      assert.ok(item.x >= 0 && item.y >= 0, `${level.id} ${group} item starts inside bounds`);
      assert.ok(item.x + item.w <= level.width && item.y + item.h <= level.height, `${level.id} ${group} item ends inside bounds`);
    }
  }
}

/* -- hostiles stand on platforms; wisps hover visibly ------------------------- */

const overlapsX = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x;
for (const level of levels) {
  const solids = level.platforms.concat(level.moving);
  for (const enemy of level.enemies) {
    const foot = { x: enemy.x + 4, w: enemy.w - 8 };
    const bottom = enemy.y + enemy.h;
    if (enemy.type === "wisp") {
      const below = solids
        .filter((platform) => platform.y >= bottom && overlapsX(foot, platform))
        .sort((a, b) => a.y - b.y)[0];
      assert.ok(below, `${level.id} wisp at ${enemy.x} has a platform reference below it`);
      assert.ok(below.y - (bottom + Chapters.WISP_HOVER_RANGE) >= 14, `${level.id} wisp at ${enemy.x} keeps a visible hover gap`);
      continue;
    }
    const support = solids.find((platform) => Math.abs(platform.y - bottom) < 3 && overlapsX(foot, platform));
    assert.ok(support, `${level.id} ${enemy.type} at ${enemy.x} spawns with its feet on a platform`);
    if (enemy.type !== "sentry") {
      assert.ok(support.w - enemy.w - 6 >= enemy.w, `${level.id} ${enemy.type} at ${enemy.x} has room for a readable patrol`);
    }
  }
}
const allEnemies = levels.flatMap((level) => level.enemies);
assert.ok(allEnemies.filter((enemy) => enemy.type === "sentry").length >= 5, "sentries appear across several chapters");
assert.ok(allEnemies.filter((enemy) => enemy.type === "warder").length >= 5, "warders appear across several chapters");

/* -- star gates ------------------------------------------------------------- */

const portalLevels = levels.filter((level) => level.portals?.length);
assert.ok(levels.slice(5, 10).every((level) => level.portals?.length >= 2), "every World 2 chapter has star gates");
for (const level of portalLevels) {
  assert.equal(level.portals.length % 2, 0, `${level.id} pairs every gate`);
  const ids = new Set();
  const solids = level.platforms.concat(level.moving);
  for (const portal of level.portals) {
    assert.ok(!ids.has(portal.id), `${level.id} has unique gate ids`);
    ids.add(portal.id);
    assert.ok(portal.w >= 36 && portal.h >= 64, `${level.id}.${portal.id} is visibly large`);
    const pair = level.portals.find((candidate) => candidate.id === portal.pair);
    assert.ok(pair && pair.pair === portal.id, `${level.id}.${portal.id} pairs back`);
    const exit = { x: pair.x + pair.w / 2 - 17, y: pair.y + pair.h - 56, w: 34, h: 56 };
    assert.ok(exit.x >= 0 && exit.y >= 0 && exit.x + exit.w <= level.width && exit.y + exit.h <= level.height, `${level.id}.${portal.id} exit is in bounds`);
    assert.ok(!solids.some((solid) => overlaps(bodyRect(exit), solid)), `${level.id}.${portal.id} exit is clear of solids`);
    assert.ok(
      !solids.some((solid) => solid.phase && overlaps({ x: exit.x - 18, y: exit.y - 18, w: exit.w + 36, h: exit.h + 36 }, solid)),
      `${level.id}.${portal.id} exit stays clear of phase bridges`,
    );
  }
}

/* -- phase tide ------------------------------------------------------------- */

for (const level of levels.filter((candidate) => candidate.world.id === "world3")) {
  const tide = level.phaseTide;
  assert.ok(tide && tide.period >= 2.6 && tide.period <= 3.8, `${level.id} phase period stays readable`);
  assert.ok(tide.warning >= 0.35 && tide.warning <= 0.65, `${level.id} warning window stays readable`);
  const phased = [...level.platforms, ...level.moving, ...level.hazards, ...level.coins, ...level.powerups].filter((item) => item.phase);
  assert.ok(phased.length >= 8, `${level.id} is defined by phase content`);
  assert.ok(phased.some((item) => item.phase === "a") && phased.some((item) => item.phase === "b"), `${level.id} uses both phases`);
  assert.ok(phased.every((item) => item.phase === "a" || item.phase === "b"), `${level.id} uses only valid phases`);
}

/* -- marrow and lanterns ------------------------------------------------------ */

for (const level of levels) {
  const marrow = level.marrow;
  assert.ok(marrow, `${level.id} hides one star marrow`);
  for (const platform of level.platforms) assert.ok(!overlaps(marrow, platform), `${level.id} marrow is not buried`);
  for (const hazard of level.hazards) assert.ok(!overlaps(marrow, hazard), `${level.id} marrow is not inside a hazard`);
  for (const mover of level.moving) {
    const sweep = mover.axis === "y"
      ? { x: mover.x, y: mover.oy - mover.range, w: mover.w, h: mover.h + mover.range * 2 }
      : { x: mover.ox - mover.range, y: mover.y, w: mover.w + mover.range * 2, h: mover.h };
    assert.ok(!overlaps(marrow, sweep), `${level.id} marrow stays clear of a moving platform sweep`);
  }
  assert.ok(level.lanterns.length >= 2, `${level.id} has respawn lanterns`);
  for (const lantern of level.lanterns) {
    const host = level.platforms.find((p) => Math.abs(p.y - (lantern.y + lantern.h)) < 1 && lantern.x >= p.x && lantern.x + lantern.w <= p.x + p.w);
    assert.ok(host, `${level.id} lantern stands on a platform`);
    for (const hazard of level.hazards) assert.ok(!overlaps(lantern, hazard), `${level.id} lantern is not in a hazard`);
  }
}

/* -- warden arenas ---------------------------------------------------------- */

for (const level of levels.filter((candidate) => candidate.warden)) {
  const warden = level.warden;
  assert.ok(warden.health >= 12, `${level.id} warden has a real health pool`);
  assert.ok(warden.arena.w >= TILE * 12, `${level.id} arena is wide enough to fight in`);
  assert.ok(warden.arena.x + warden.arena.w <= level.width, `${level.id} arena sits inside the chapter`);
  assert.ok(level.goal.x >= warden.arena.x && level.goal.x + level.goal.w <= warden.arena.x + warden.arena.w, `${level.id} goal sits inside the sealed arena`);
  assert.ok(warden.home.y + 96 < warden.ground, `${level.id} warden starts above its floor`);
  const floor = level.platforms.find((p) => !p.phase && Math.abs(p.y - warden.ground) < 1 && p.x <= warden.arena.x && p.x + p.w >= warden.arena.x + warden.arena.w);
  assert.ok(floor, `${level.id} arena spans one continuous floor, so the seal never holds the player over a pit`);
}

console.log(`content/chapters: ${levels.length} chapters pass structure, hostiles, gates, tide, marrow, lantern, and arena contracts`);
