const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/game.js", "utf8");
const accessibility = fs.readFileSync("tests/e2e/accessibility.js", "utf8");

const buildStart = source.indexOf("  function buildLevels()");
const buildEnd = source.indexOf("  function resize()");
assert.ok(buildStart >= 0 && buildEnd > buildStart, "Could not extract buildLevels for readability validation");

const levels = new Function(
  `const TILE = 48; const ENEMY_WIDTH = 38; const ENEMY_HEIGHT = 34; const WISP_FLOAT_GAP = 24; const WISP_HOVER_RANGE = 6; ${source.slice(buildStart, buildEnd)}; return buildLevels();`
)();

assert.ok(source.includes("remaining,"), "phaseTideState should return remaining time for player-readable timing");
assert.ok(source.includes("urgency:"), "phaseTideState should expose warning urgency for visual tuning");
assert.ok(source.includes("function phaseTideLabel"), "HUD should format phase-tide state through one helper");
assert.ok(source.includes("remaining.toFixed(1)"), "phase countdown should use stable one-decimal precision");

const world3 = levels.filter((level) => level.world?.id === "world3");
assert.equal(world3.length, 5, "World 3 should still contain five phase-tide chapters");
for (const level of world3) {
  assert.ok(level.phaseTide.warning >= 0.35, `${level.id} should keep a readable warning window`);
}

assert.ok(source.includes("ENEMY_HIT_FLASH_DURATION"), "enemy hit feedback should use a named duration");
assert.ok(source.includes("e.hitTimer = ENEMY_HIT_FLASH_DURATION"), "projectile impacts should mark enemies as visibly hit");
assert.ok(source.includes("e.hitTimer = Math.max(0, (e.hitTimer || 0) - dt)"), "enemy hit feedback should decay in the enemy update loop");
assert.ok(source.includes("function drawEnemyIntent"), "enemy rendering should include a low-noise intent cue");
assert.ok(source.includes("function drawEnemyHitFlash"), "enemy rendering should include a visible impact halo");
assert.ok(source.includes("function enemyPalette"), "ground enemies should use type-specific visual palettes");
assert.ok(source.includes("enemySupportPlatform(e)") && source.includes("arrowX"), "ground enemy intent should be tied to real patrol support");
assert.ok(source.includes("ctx.setLineDash([4, 7])"), "wisp intent should use a distinct tether rather than ground feet");

assert.ok(accessibility.includes("function clickActiveBack"), "accessibility e2e should click back through a stable helper");
assert.ok(accessibility.includes(".getAnimations()"), "accessibility e2e should wait for the active screen transition");
assert.ok(!accessibility.includes("getAnimations({ subtree: true })"), "accessibility e2e must not wait for decorative infinite child animations");

console.log("readability-polish-v1.7.0: phase timing, enemy readability, hit feedback, and e2e click stability guards passed");
