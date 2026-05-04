const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/game.js", "utf8");

const buildStart = source.indexOf("  function buildLevels()");
const buildEnd = source.indexOf("  function resize()");
assert.ok(buildStart >= 0 && buildEnd > buildStart, "Could not extract buildLevels for phase-tide validation");

const levels = new Function(
  `const TILE = 48; const ENEMY_WIDTH = 38; const ENEMY_HEIGHT = 34; const WISP_FLOAT_GAP = 24; const WISP_HOVER_RANGE = 6; ${source.slice(buildStart, buildEnd)}; return buildLevels();`
)();

const world3 = levels.filter((level) => level.world?.id === "world3");
assert.equal(world3.length, 5, "World 3 should contain exactly five phase-tide chapters");
assert.deepEqual(
  world3.map((level) => level.name),
  ["第十一章 相位浅滩", "第十二章 潮汐回廊", "第十三章 月镜断桥", "第十四章 双星钟塔", "第十五章 星潮王庭"],
  "World 3 chapter names should stay stable"
);

for (const level of world3) {
  assert.ok(level.phaseTide, `${level.id} should declare phaseTide`);
  assert.ok(Number(level.phaseTide.period) >= 2.6 && Number(level.phaseTide.period) <= 3.8, `${level.id} phase period should stay readable`);
  assert.ok(Number(level.phaseTide.warning) >= 0.35 && Number(level.phaseTide.warning) <= 0.65, `${level.id} warning window should stay readable`);

  const phaseItems = [
    ...level.platforms,
    ...level.moving,
    ...level.hazards,
    ...level.coins,
    ...(level.powerups || []),
  ].filter((item) => item.phase);

  assert.ok(phaseItems.length >= 8, `${level.id} should include enough phase-authored content to define the chapter`);
  assert.ok(phaseItems.some((item) => item.phase === "a"), `${level.id} should include phase a objects`);
  assert.ok(phaseItems.some((item) => item.phase === "b"), `${level.id} should include phase b objects`);

  for (const item of phaseItems) {
    assert.ok(item.phase === "a" || item.phase === "b", `${level.id} has invalid phase value ${item.phase}`);
    assert.ok(item.x >= 0 && item.y >= 0, `${level.id} phase item starts out of bounds`);
    assert.ok(item.x + item.w <= level.width && item.y + item.h <= level.height, `${level.id} phase item ends out of bounds`);
  }
}

assert.ok(source.includes("PHASE_DEFAULT_PERIOD"), "Phase runtime should define default period");
assert.ok(source.includes("function phaseTideState"), "Phase runtime should expose phaseTideState");
assert.ok(source.includes("function phaseIsActive"), "Phase runtime should expose phaseIsActive");
assert.ok(source.includes("function updatePhaseTransition"), "Phase runtime should handle phase switches");
assert.ok(source.includes("drawPhaseGhostPlatform"), "Inactive phase bridges should render as ghost geometry");
assert.ok(source.includes("drawPhaseTide"), "World 3 should render a phase-tide canvas motif");
assert.ok(source.includes('states.push(tide.active === "a" ? "星潮 甲相" : "星潮 乙相")'), "HUD status should expose current phase");

console.log("phase-tide-v1.4.0: World 3 phase data, timing, runtime hooks, and rendering guards passed");
