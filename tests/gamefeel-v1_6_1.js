const assert = require("node:assert/strict");
const fs = require("node:fs");
const GameFeel = require("../src/render/game-feel.js");
const FixedStep = require("../src/core/fixed-step.js");

const DT = 1 / 120;

function durationUntil(start, target, options, predicate) {
  let velocity = start;
  let elapsed = 0;
  while (!predicate(velocity) && elapsed < 1) {
    const frameOptions = typeof options === "function" ? options(elapsed) : options;
    velocity = GameFeel.horizontalVelocity(velocity, target, frameOptions, DT);
    elapsed += DT;
  }
  return elapsed;
}

for (const character of [
  { id: "nini", speed: 445, accel: 3450 },
  { id: "yuan", speed: 485, accel: 3720 },
]) {
  const launch = durationUntil(0, character.speed, {
    baseAcceleration: character.accel,
    grounded: true,
    intent: 1,
  }, (velocity) => velocity >= character.speed);
  const reverse = durationUntil(character.speed, -character.speed, (elapsed) => ({
    baseAcceleration: character.accel,
    grounded: true,
    intent: -1,
    turning: elapsed < 0.1,
  }), (velocity) => velocity <= -character.speed);
  const stop = durationUntil(character.speed, 0, {
    baseAcceleration: character.accel,
    grounded: true,
    intent: 0,
  }, (velocity) => velocity === 0);

  assert.ok(launch <= 0.14, `${character.id} launch should preserve the current responsive baseline, got ${launch}s`);
  assert.ok(reverse < 0.19, `${character.id} full-speed reversal should finish under 190ms, got ${reverse}s`);
  assert.ok(stop < 0.12, `${character.id} ground stop should finish under 120ms, got ${stop}s`);

  const windStep = GameFeel.horizontalVelocity(character.speed, character.speed * -0.14, {
    baseAcceleration: character.accel,
    grounded: true,
    intent: 0,
  }, DT);
  assert.equal(
    windStep,
    character.speed - character.accel * DT,
    `${character.id} environmental drift should keep base acceleration when player intent is neutral`,
  );
}

const camera = { lookX: 0.89, lookY: 0 };
let cameraElapsed = 0;
while (camera.lookX > 0 && cameraElapsed < 1) {
  GameFeel.cameraLookaheadOffset(
    { vx: 445, vy: 0, moveIntent: -1 },
    { reducedMotion: false },
    DT,
    camera,
  );
  cameraElapsed += DT;
}
assert.ok(cameraElapsed < 0.1, `camera should cross the old direction within 100ms, got ${cameraElapsed}s`);

assert.equal(GameFeel.interpolateCoordinate(10, 18, 0), 10, "presentation interpolation should begin at the prior fixed-step sample");
assert.equal(GameFeel.interpolateCoordinate(10, 18, 0.5), 14, "presentation interpolation should sample between fixed steps");
assert.equal(GameFeel.interpolateCoordinate(10, 18, 0.53, { quantum: 0.5 }), 14, "DPR-aware sampling should land on a physical-pixel quantum");
assert.equal(GameFeel.interpolateCoordinate(10, 300, 0.2), 300, "large teleports must snap instead of sweeping across the level");
assert.equal(GameFeel.interpolateCoordinate(10, 18, 0.2, { snap: true }), 18, "explicit respawn and portal snaps must bypass interpolation");

GameFeel.resetHitstop();
GameFeel.requestHitstop(45);
assert.equal(GameFeel.consumeHitstop(1 / 60), 0);
assert.equal(GameFeel.consumeHitstop(1 / 60), 0);
const crossingRemainder = GameFeel.consumeHitstop(1 / 60);
const crossingFrame = FixedStep.runFrame(0, crossingRemainder, () => {});
assert.equal(crossingFrame.steps, 0, "the hitstop crossing frame should exercise the zero-step interpolation edge");
const syncAfterHitstop = GameFeel.shouldSyncPresentationAfterHitstop({
  before: 45 - 2 * (1000 / 60),
  after: GameFeel.getHitstopRemaining(),
  steps: crossingFrame.steps,
});
assert.equal(syncAfterHitstop, true);
const displayedAfterHitstop = GameFeel.interpolateCoordinate(
  syncAfterHitstop ? 151 : 144,
  151,
  crossingFrame.accumulator / FixedStep.FIXED_DT,
);
assert.equal(displayedAfterHitstop, 151, "finishing hitstop without a fixed step must not rewind presentation");
GameFeel.resetHitstop();

const game = fs.readFileSync("src/game.js", "utf8");
const capture = fs.readFileSync("scripts/capture-store-assets.js", "utf8");
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
const pkg = require("../package.json");
const lock = require("../package-lock.json");
assert.ok(game.includes("GameFeel?.horizontalVelocity"), "player movement should use the tested response resolver");
assert.ok(game.includes("player.gaitPhase"), "player rendering should carry a distance-driven gait phase");
assert.ok(game.includes('btn.addEventListener("lostpointercapture", up'), "touch controls should release when pointer capture is lost");
assert.ok(!game.includes('btn.addEventListener("pointerleave", up'), "captured touch controls must not release on pointer drift");
assert.ok(game.includes('window.addEventListener("blur", resetPhysicalControlState)'), "focus loss should reset physical and captured controls");
assert.ok(game.includes("suppressedKeys"), "held transition keys should stay suppressed until release");
assert.ok(game.includes("InputState.resetTransientState"), "control reset should clear key edges and pointer refs together");
assert.ok(game.includes("dismissChapterIntro"), "gameplay input should dismiss the chapter intro");
assert.ok(["1.6.1", "1.6.2", "1.6.3", "1.7.0", "1.8.0", "1.9.0"].includes(pkg.version));
assert.ok(["1.6.1", "1.6.2", "1.6.3", "1.7.0", "1.8.0", "1.9.0"].includes(lock.version));
assert.match(androidManifest, /versionCode="(14|15|16|17|18|19|20)"[\s\S]*versionName="(1\.6\.(1|2|3)|1\.7\.0|1\.8\.0|1\.9\.0)"/);
assert.ok(
  serviceWorker.includes('CACHE = "nini-yuan-v1.9.0-ui-clarity-r2"') ||
  serviceWorker.includes('CACHE = "nini-yuan-v1.9.0-quiet-observatory-r1"') ||
  serviceWorker.includes('CACHE = "nini-yuan-v1.8.0-song-atlas-overhaul-r1"') ||
  serviceWorker.includes('CACHE = "nini-yuan-v1.7.0-experience-integrity-r1"') ||
  serviceWorker.includes('CACHE = "nini-yuan-v1.6.3-forward-idle"') ||
  serviceWorker.includes('CACHE = "nini-yuan-v1.6.2-directional-idle"') ||
  serviceWorker.includes('CACHE = "nini-yuan-v1.6.1-responsive-motion"'),
);
assert.ok(html.includes("星图 · v1.6.1") || html.includes("星图 · v1.6.2") || html.includes("星图 · v1.6.3") || html.includes("星图 · v1.7.0") || html.includes("星图 · v1.8.0") || html.includes("星图 · v1.9.0"));
for (const assetMarker of ["04-rotate-prompt", "06-gameplay-landscape", "07-pause-landscape", "08-gameplay-desktop"]) {
  assert.ok(capture.includes(assetMarker), `store capture should produce ${assetMarker}`);
}

console.log("gamefeel-v1.6.1: reversal, stop, camera intent, gait, touch capture, and intro response passed");
