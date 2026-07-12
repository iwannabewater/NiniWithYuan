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
assert.equal(
  resolve("yuan", { facing: -1, onGround: false, vy: -300, turnTimer: 0.1 }).animation,
  "jump_left",
  "airborne direction changes must keep an airborne pose",
);
assert.equal(resolve("nini", { shootTimer: 0.1 }).animation, "shoot_right");
assert.equal(resolve("yuan", { hurtFlash: 0.1, skillTimer: 0.1 }).animation, "hurt_right");
assert.equal(resolve("nini", { vx: 300 }).animation, "run");
assert.equal(resolve("yuan").animation, "idle");
assert.equal(
  resolve("yuan", { vx: 440, landingTimer: 0.06 }).animation,
  "run",
  "a fast landing should hand back to locomotion after its readable impact beat",
);

const glide = resolve("nini", { onGround: false, vy: 160, glide: 0.3 });
assert.equal(glide.artifact, "star-dial-open");
assert.ok(glide.lift < 0, "Nini glide should lift the authored sprite");

const dash = resolve("yuan", { skillTimer: 0.12, vx: 900 });
assert.equal(dash.artifact, "gui-sword-cut");
assert.ok(dash.lean > 0.1, "Yuan dash should carry a strong forward lean");
assert.equal(
  Motion.resolveMotionFacing({ id: "yuan", facing: -1, dashDir: 1, skillTimer: 0.12 }),
  1,
  "Yuan's authored dash pose must follow dashDir while the dash is active",
);
assert.equal(Motion.resolveMotionFacing({ id: "yuan", facing: -1, dashDir: 1, skillTimer: 0 }), -1);

const entered = Motion.advanceAnimationState(null, "jump_right", 4.2);
assert.deepEqual(entered, { name: "jump_right", enteredAt: 4.2 });
assert.equal(Motion.advanceAnimationState(entered, "jump_right", 4.6), entered, "an active state must keep its entry time");
assert.deepEqual(Motion.advanceAnimationState(entered, "land_right", 4.7), { name: "land_right", enteredAt: 4.7 });
assert.equal(Motion.animationElapsed(entered, 4.45), 0.25);
assert.equal(
  Motion.sampleAnimationFrame({ frames: [4, 5, 6], fps: 10, loop: false }, 0),
  4,
  "non-looping actions must begin on their first authored frame",
);
assert.equal(Motion.sampleAnimationFrame({ frames: [4, 5, 6], fps: 10, loop: false }, 2), 6, "non-looping actions must hold their last frame");
assert.equal(Motion.sampleAnimationFrame({ frames: [1, 2], fps: 4, loop: true }, 0.3), 2, "looping motion should wrap from state-local time");

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

assert.equal(Motion.shouldHoldLandingPose(0.12, 1), true);
assert.equal(Motion.shouldHoldLandingPose(0.05, 0.8), false);
const blended = Motion.blendMotionPose(
  { bob: 0, lean: 0, scaleX: 1, scaleY: 1, lift: 0, stride: 0, forward: 0, animation: "idle" },
  { bob: 4, lean: 0.2, scaleX: 1.1, scaleY: 0.9, lift: -4, stride: 1, forward: 1, animation: "run" },
  0.5,
);
assert.ok(blended.bob > 0 && blended.bob < 4);
assert.equal(blended.animation, "run");
assert.equal(Motion.blendMotionPose(null, { bob: 3, lean: 0.1, scaleX: 1.02, scaleY: 0.98, lift: 0 }, 0, { snap: true }).bob, 3);

console.log("character-motion: directional states and expressive pose profiles passed");
