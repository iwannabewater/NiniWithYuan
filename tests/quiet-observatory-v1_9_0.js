const assert = require("node:assert/strict");
const fs = require("node:fs");
const InputState = require("../src/core/input-state.js");
const Motion = require("../src/render/character-motion.js");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const sw = fs.readFileSync("service-worker.js", "utf8");
const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

assert.equal(pkg.version, "1.9.0");
assert.equal(lock.version, "1.9.0");
assert.match(sw, /nini-yuan-v1\.9\.0-quiet-observatory-r1/);
assert.match(manifest, /android:versionCode="19"/);
assert.match(manifest, /android:versionName="1\.9\.0"/);
assert.match(html, /星图 · v1\.9\.0 · 多世界章节 · 离线游玩/);

assert.equal(typeof InputState.edgeFromActiveTransition, "function");
assert.equal(typeof InputState.edgesFromActionCounts, "function");
assert.deepEqual(InputState.edgeFromActiveTransition(false, true), {
  pressed: true,
  released: false,
  active: true,
});
assert.deepEqual(InputState.edgeFromActiveTransition(true, false), {
  pressed: false,
  released: true,
  active: false,
});
assert.deepEqual(InputState.edgeFromActiveTransition(true, true), {
  pressed: false,
  released: false,
  active: true,
});

const actions = InputState.createActionInputState(["left", "right", "jump"]);
const before = { left: actions.count("left"), right: actions.count("right"), jump: actions.count("jump") };
actions.press("key:KeyD", "right");
actions.press("key:KeyA", "left");
const afterHold = { left: actions.count("left"), right: actions.count("right"), jump: actions.count("jump") };
assert.equal(actions.direction(), -1, "latest held direction must win while both directions remain active");
const holdEdges = InputState.edgesFromActionCounts(before, afterHold, ["left", "right", "jump"]);
assert.equal(holdEdges.left.pressed, true);
assert.equal(holdEdges.right.pressed, true);
assert.equal(holdEdges.jump.pressed, false);
actions.release("key:KeyA");
assert.equal(actions.direction(), 1, "releasing the latest direction must fall back to the still-held side");
const afterRelease = { left: actions.count("left"), right: actions.count("right"), jump: actions.count("jump") };
const releaseEdges = InputState.edgesFromActionCounts(afterHold, afterRelease, ["left", "right", "jump"]);
assert.equal(releaseEdges.left.released, true);
assert.equal(releaseEdges.right.released, false);
assert.equal(releaseEdges.right.active, true);

assert.equal(typeof Motion.blendMotionPose, "function");
assert.equal(typeof Motion.shouldHoldLandingPose, "function");
assert.equal(Motion.shouldHoldLandingPose(0.12, 1), true);
assert.equal(Motion.shouldHoldLandingPose(0.06, 0.9), false, "fast landings hand off once the impact beat is short");
assert.equal(Motion.shouldHoldLandingPose(0.06, 0.4), true);

const idle = Motion.resolveCharacterMotion({
  id: "nini",
  facing: 1,
  vx: 0,
  vy: 0,
  onGround: true,
  speed: 445,
  now: 1000,
});
const run = Motion.resolveCharacterMotion({
  id: "nini",
  facing: 1,
  vx: 360,
  vy: 0,
  onGround: true,
  speed: 445,
  gaitPhase: Math.PI / 2,
  now: 1100,
});
const mid = Motion.blendMotionPose(idle, run, 0.5);
assert.ok(mid.lean > idle.lean && mid.lean < run.lean, "pose blend should sit between previous and next lean");
assert.ok(mid.scaleX > idle.scaleX && mid.scaleX < run.scaleX, "pose blend should interpolate stretch");
assert.equal(mid.animation, run.animation);
const snapped = Motion.blendMotionPose(idle, run, 0.1, { snap: true });
assert.equal(snapped.lean, run.lean);
assert.equal(snapped.bob, run.bob);

const yuanDash = Motion.resolveCharacterMotion({
  id: "yuan",
  facing: 1,
  skillTimer: 0.12,
  vx: 900,
  speed: 485,
  now: 1200,
});
assert.ok(yuanDash.lean > 0.1, "Yuan dash lean remains decisive after sensitivity retune");

assert.ok(game.includes("blendMotionPose"), "runtime should sample blended presentation poses");
assert.ok(game.includes("displayMotionPose"), "presentation display pose must live outside the player entity");
assert.ok(game.includes("snapMotionPose"), "discontinuities must snap presentation pose");
assert.ok(!game.includes("player.displayMotionPose"), "display pose must not write into player entities");
assert.ok(!game.includes("player.motionState"), "animation state must stay presentation-owned");

for (const marker of [
  "v1.9 Quiet Observatory composition boundary",
  "--s-1:",
  "--quiet-veil",
  "--d-screen",
  ".touch-btn.skill.active",
  ".touch-btn.shoot.active",
]) {
  assert.ok(css.includes(marker), `quiet observatory CSS should include ${marker}`);
}
assert.doesNotMatch(css, /transition:\s*all\b/);
assert.doesNotMatch(css, /backdrop-filter\s*:/);
assert.match(css, /font-size: calc\(10px \* var\(--hud-scale\)\)|font-size: calc\(12\.5px \* var\(--hud-scale\)\)/);

console.log("quiet-observatory-v1.9.0: input edges, pose blend, version metadata, and quiet UI contracts passed");
