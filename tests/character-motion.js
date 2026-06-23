const assert = require("node:assert/strict");
const fs = require("node:fs");
const Motion = require("../src/render/character-motion.js");

function resolve(id, overrides = {}) {
  return Motion.resolveCharacterMotion({
    id,
    facing: 1,
    vx: 0,
    vy: 0,
    onGround: true,
    speed: id === "nini" ? 445 : 485,
    turnTimer: 0,
    landingTimer: 0,
    shootTimer: 0,
    glide: 0,
    skillTimer: 0,
    hurtFlash: 0,
    now: 1000,
    ...overrides,
  });
}

assert.equal(resolve("nini", { glide: 0.2 }).animation, "skill_right");
assert.equal(resolve("yuan", { facing: -1, skillTimer: 0.1 }).animation, "skill_left");
assert.equal(resolve("nini", { facing: -1, onGround: false, vy: -500 }).animation, "jump_left");
assert.equal(resolve("yuan", { onGround: false, vy: 420 }).animation, "fall");
assert.equal(resolve("nini", { facing: -1, landingTimer: 0.1 }).animation, "land_left");
assert.equal(resolve("yuan", { facing: 1, turnTimer: 0.1 }).animation, "turn_right");
assert.equal(resolve("nini", { shootTimer: 0.1 }).animation, "shoot_right");
assert.equal(resolve("yuan", { hurtFlash: 0.1, skillTimer: 0.1 }).animation, "hurt_right");
assert.equal(resolve("nini", { vx: 300 }).animation, "run");
assert.equal(resolve("yuan").animation, "idle");

const glide = resolve("nini", { onGround: false, vy: 160, glide: 0.3 });
assert.equal(glide.artifact, "star-dial-open");
assert.ok(glide.lift < 0, "Nini glide should lift the authored sprite");

const dash = resolve("yuan", { skillTimer: 0.12, vx: 900 });
assert.equal(dash.artifact, "gui-sword-cut");
assert.ok(dash.lean > 0.1, "Yuan dash should carry a strong forward lean");

assert.deepEqual(Motion.resolveSpriteOrientation("jump_left", -1), {
  authoredDirection: true,
  frameScaleX: 1,
  leanScale: -1,
  artifactScale: -1,
}, "authored left poses must not be mirrored back to the right");
assert.equal(Motion.resolveSpriteOrientation("run", -1).frameScaleX, -1, "generic locomotion poses should mirror for left travel");
assert.equal(Motion.resolveSpriteOrientation("skill_right", 1).artifactScale, 1, "right-side artifacts should retain their authored direction");
assert.equal(Motion.resolveSpriteOrientation("skill_left", -1, { mirror: true }).frameScaleX, -1, "manifest mirror flags should create clean left poses from right-side source art");
for (const id of ["nini", "yuan"]) {
  const atlas = JSON.parse(fs.readFileSync(`assets/characters/${id}/atlas.json`, "utf8"));
  const rightFacingScale = id === "nini" ? -1 : 1;
  const leftFacingScale = id === "nini" ? 1 : -1;
  assert.equal(
    Motion.resolveSpriteOrientation("idle", -1, atlas.animations.idle).frameScaleX,
    leftFacingScale,
    `${id} idle should mirror after left travel`,
  );
  assert.equal(
    Motion.resolveSpriteOrientation("idle", 1, atlas.animations.idle).frameScaleX,
    rightFacingScale,
    `${id} idle should face right by default and after right travel`,
  );
}

const strideA = resolve("nini", { vx: 320, gaitPhase: 0 });
const strideB = resolve("nini", { vx: 320, gaitPhase: Math.PI / 2 });
assert.notEqual(strideA.bob, strideB.bob, "run motion should follow the distance-driven gait phase");

console.log("character-motion: directional states and expressive pose profiles passed");
