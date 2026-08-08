const assert = require("node:assert/strict");
const fs = require("node:fs");
const { assertReleaseFloor } = require("./helpers/release.js");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");
const motion = fs.readFileSync("src/render/character-motion.js", "utf8");
const effects = fs.readFileSync("src/render/character-effects.js", "utf8");
const creatures = fs.readFileSync("src/render/creature-material.js", "utf8");
const playfield = fs.readFileSync("src/render/playfield-material.js", "utf8");
const warden = fs.readFileSync("src/render/warden.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const workflow = fs.readFileSync(".github/workflows/android-build-smoke.yml", "utf8");

assertReleaseFloor(assert, { pkg, lock, serviceWorker, html, androidManifest }, "2.1.0", 22);

for (const modulePath of [
  "src/render/character-motion.js",
  "src/render/character-effects.js",
  "src/render/playfield-material.js",
  "src/render/creature-material.js",
  "src/render/warden.js",
]) {
  assert.ok(html.indexOf(modulePath) >= 0, `${modulePath} should load in the web entry`);
  assert.ok(serviceWorker.includes(`./${modulePath}`), `${modulePath} should ship in the offline cache`);
  assert.ok(html.indexOf(modulePath) < html.indexOf("src/game.js"), `${modulePath} must load before the runtime`);
}

assert.match(motion, /function dampedBlendAlpha\(/, "pose response should expose elapsed-time damping");
assert.match(game, /blendMotionPose\?\.\([\s\S]*?presentation\.displayMotionPose,[\s\S]*?\{ linear: true \}/, "the displayed pose should converge from itself with linear damping");
assert.doesNotMatch(game, /blendMotionPose\?\.\([\s\S]{0,180}?0\.72/, "pose blending must not return to a per-frame constant");
assert.match(effects, /reducedMotion[\s\S]*?trailCount = 0|if \(!reducedMotion\)/, "reduced motion should remove character echoes");

assert.match(creatures, /scale: enemy\.type === "wisp" \? 1\.28 : 1\.36/, "creature art should preserve the compact visual scale floor");
assert.doesNotMatch(creatures.replace(/typeof window/g, ""), /document\.|window\./, "creature art must remain stateless and DOM-free");
for (const grammar of ["star-bloom", "gate-beacon", "mirror-reed"]) {
  assert.ok(playfield.includes(grammar), `playfield scenery should retain the ${grammar} grammar`);
}
for (const shape of ["shard", "streak", "ring", "petal"]) {
  assert.ok(playfield.includes(`particle.shape === "${shape}"`), `particle material should retain the ${shape} response`);
}

assert.match(game, /if \(!wardenIsOpen\(\)\)[\s\S]*?return false;/, "closed guardian shells should reject every damage source at the shared entry");
for (const profile of ["aurora", "core", "tide"]) {
  assert.match(game, new RegExp(`${profile}: \\[\n\\s*\\{ above:`), `the ${profile} guardian should own a stage profile`);
}
assert.match(warden, /function drawWardenIdentity\(/, "guardian silhouettes should carry palette-specific geometry");
assert.match(warden, /phase === "recover"/, "guardian art should expose the recovery opening");

const hudFloorRules = css.match(/font-size: calc\(13px \* var\(--hud-scale\)\);/g) || [];
assert.ok(hudFloorRules.length >= 5, "all gameplay HUD modes should retain the 13px type floor");
assert.match(
  css,
  /\.warden-bar-phase \{[\s\S]*?font-size: calc\(13px \* var\(--hud-scale\)\);/,
  "the guardian phase label should retain the gameplay HUD type floor",
);
assert.match(css, /#overlay\.active \+ \.toast/, "gameplay notices should use a player-clear safe rail");
assert.match(
  css,
  /body:has\(#toast\.show\) \.warden-bar:not\(\[hidden\]\)/,
  "the guardian HUD should stack below a live gameplay notice",
);

assert.match(workflow, /sha256sum NiniYuan\.apk > NiniYuan\.apk\.sha256/);
assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);
assert.match(workflow, /actions\/attest-build-provenance@[0-9a-f]{40}/);
assert.match(workflow, /name: NiniYuan-\$\{\{ github\.sha \}\}/);
assert.match(workflow, /dist\/NiniYuan\.apk\.sha256/);

for (const path of [
  "docs/plans/OPTIMIZATION_PLAN_v2.1.0.md",
  "docs/plans/REVIEW_v2.1.0.md",
]) {
  assert.ok(fs.existsSync(path), `${path} should document the release contract`);
}

const gdd = fs.readFileSync("docs/GDD.md", "utf8");
assert.match(gdd, /Aurora Citadel \| 极光守望者 \| 16 \| 20 tiles/);
assert.match(gdd, /Island Star Core \| 群岛守望者 \| 20 \| 12 tiles/);
assert.match(gdd, /Phase Tide Court \| 星潮守望者 \| 24 \| 22 tiles/);

console.log("starfield-cadence-v2.1.0: presentation, guardian, HUD, scenery, and release contracts passed");
