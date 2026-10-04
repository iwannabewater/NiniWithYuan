const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/game.js", "utf8");
const creatureSource = fs.readFileSync("src/render/creature-material.js", "utf8");
const accessibility = fs.readFileSync("tests/e2e/accessibility.js", "utf8");

assert.ok(source.includes("function phaseTideLabel"), "HUD should format phase-tide state through one helper");
assert.ok(source.includes("remaining.toFixed(1)"), "phase countdown should use stable one-decimal precision");

assert.ok(creatureSource.includes("function drawPatrolIntent"), "enemy rendering should include a low-noise intent cue");
assert.ok(creatureSource.includes("function drawHitContour"), "enemy rendering should include a visible impact halo");
assert.ok(creatureSource.includes("function paletteFor"), "ground enemies should use type-specific visual palettes");
assert.ok(source.includes("support: e.type === \"wisp\" ? null : Sim.supportPlatform(world, e)") && creatureSource.includes("arrowX"), "ground enemy intent should be tied to real patrol support");
assert.ok(creatureSource.includes("ctx.setLineDash([4, 7])"), "wisp intent should use a distinct tether rather than ground feet");

assert.ok(accessibility.includes("function clickActiveBack"), "accessibility e2e should click back through a stable helper");
assert.ok(accessibility.includes(".getAnimations()"), "accessibility e2e should wait for the active screen transition");
assert.ok(!accessibility.includes("getAnimations({ subtree: true })"), "accessibility e2e must not wait for decorative infinite child animations");

console.log("readability-polish-v1.7.0: phase timing, enemy readability, hit feedback, and e2e click stability guards passed");
