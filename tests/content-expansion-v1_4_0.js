const assert = require("node:assert/strict");
const fs = require("node:fs");

const game = fs.readFileSync("src/game.js", "utf8");
const hud = fs.readFileSync("src/render/hud.js", "utf8");
const storage = fs.readFileSync("src/core/storage.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

const buildStart = game.indexOf("  function buildLevels()");
const buildEnd = game.indexOf("  function resize()");
assert.ok(buildStart >= 0 && buildEnd > buildStart, "Could not extract buildLevels for content validation");
const levels = new Function(
  `const TILE = 48; const ENEMY_WIDTH = 38; const ENEMY_HEIGHT = 34; const WISP_FLOAT_GAP = 24; const WISP_HOVER_RANGE = 6; ${game.slice(buildStart, buildEnd)}; return buildLevels();`
)();

assert.ok(["1.4.0", "1.5.0", "1.5.1"].includes(pkg.version), "package.json should be v1.4.0 or later");
assert.ok(["1.4.0", "1.5.0", "1.5.1"].includes(lock.version), "package-lock.json root version should be v1.4.0 or later");
assert.match(sw, /CACHE = "nini-yuan-v(1\.4\.0-world-3-phase-tide|1\.5\.(0-(game-feel|canonical-url)|1-mobile-skill-control))"/, "service worker cache should use a v1.4.0+ key");
assert.ok(/versionCode="(10|11|12)"/.test(androidManifest), "Android versionCode should be 10 or later");
assert.ok(/versionName="(1\.4\.0|1\.5\.(0|1))"/.test(androidManifest), "Android versionName should be 1.4.0 or later");

assert.equal(levels.length, 15, "v1.4.0 should ship fifteen chapters");
assert.deepEqual(
  levels.slice(5, 10).map((level) => level.id),
  ["stargatecove", "loopinglighthouse", "ringconservatory", "starbridgetide", "islandstarcore"],
  "World 2 chapter IDs should remain stable and include the two completion chapters"
);
assert.deepEqual(
  levels.slice(10).map((level) => level.id),
  ["phaseshallows", "tidecorridor", "moonmirrorbreak", "twinstarclocktower", "phasetidecourt"],
  "World 3 phase-tide chapter IDs should be stable"
);
assert.ok(levels.slice(0, 5).every((level) => level.world?.id === "world1"), "Existing five chapters should be grouped as World 1");
assert.ok(levels.slice(5, 10).every((level) => level.world?.id === "world2"), "World 2 chapters should be grouped as World 2");
assert.ok(levels.slice(10).every((level) => level.world?.id === "world3"), "World 3 chapters should be grouped as World 3");
assert.ok(levels.slice(5, 10).every((level) => Array.isArray(level.portals) && level.portals.length >= 2), "Every World 2 chapter should include portals");
assert.ok(levels.slice(10).every((level) => level.phaseTide && Number(level.phaseTide.period) > 0), "Every World 3 chapter should declare phase tide timing");
assert.deepEqual(
  [...new Set(levels.map((level) => level.world?.name))],
  ["第一星域 破碎星图", "第二星域 星门群岛", "第三星域 星潮镜域"],
  "Level data should expose all three world headings"
);

assert.ok(hud.includes("level-world"), "renderLevelList should emit world headings");
assert.ok(hud.includes("button.dataset.world"), "level buttons should carry a world dataset");
assert.ok(/\.level-world\s*{/.test(css), "styles.css should style world headings");
assert.ok(/\.level-item\.featured\s*{[\s\S]*?grid-column: span 2/.test(css), "featured chapter should still be prominent in grouped layout");

assert.ok(storage.includes("DEFAULT_LEVEL_COUNT = 15"), "storage default level count should be updated to 15");
assert.ok(storage.includes("bestTimes.auroracitadel") && storage.includes("levelStars.auroracitadel"), "storage should derive chapter 6 access from old chapter 5 completion");
assert.ok(storage.includes("bestTimes.ringconservatory") && storage.includes("levelStars.ringconservatory"), "storage should derive chapter 9 access from old chapter 8 completion");

assert.ok(html.includes("多世界章节"), "index.html visible and metadata copy should use count-free chapter scope copy");
assert.ok(manifest.description.includes("多世界章节"), "PWA manifest should use count-free chapter scope copy");

console.log("content-expansion-v1.4.0: 15 chapters, 3 worlds, metadata, UI grouping, and save compatibility guards passed");
