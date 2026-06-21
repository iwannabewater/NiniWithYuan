const assert = require("node:assert/strict");
const fs = require("node:fs");
const GameFeel = require("../src/render/game-feel.js");

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
assert.ok(game.includes("touchState.clear()"), "focus loss should clear captured touch state");
assert.ok(game.includes("dismissChapterIntro"), "gameplay input should dismiss the chapter intro");
assert.ok(["1.6.1", "1.6.2"].includes(pkg.version));
assert.ok(["1.6.1", "1.6.2"].includes(lock.version));
assert.match(androidManifest, /versionCode="(14|15)"[\s\S]*versionName="1\.6\.(1|2)"/);
assert.ok(
  serviceWorker.includes('CACHE = "nini-yuan-v1.6.2-directional-idle"') ||
  serviceWorker.includes('CACHE = "nini-yuan-v1.6.1-responsive-motion"'),
);
assert.ok(html.includes("星图 · v1.6.1") || html.includes("星图 · v1.6.2"));
for (const assetMarker of ["04-rotate-prompt", "06-gameplay-landscape.png", "07-pause-landscape.png", "08-gameplay-desktop.png"]) {
  assert.ok(capture.includes(assetMarker), `store capture should produce ${assetMarker}`);
}

console.log("gamefeel-v1.6.1: reversal, stop, camera intent, gait, touch capture, and intro response passed");
