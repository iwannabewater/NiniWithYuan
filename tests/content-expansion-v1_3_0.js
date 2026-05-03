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

assert.equal(pkg.version, "1.3.0", "package.json should be bumped to 1.3.0");
assert.equal(lock.version, "1.3.0", "package-lock.json root version should be bumped to 1.3.0");
assert.match(sw, /CACHE = "nini-yuan-v1\.3\.0-world-2-star-gates"/, "service worker cache should be the v1.3.0 world-2 key");
assert.ok(/versionCode="8"/.test(androidManifest), "Android versionCode should be 8");
assert.ok(/versionName="1\.3\.0"/.test(androidManifest), "Android versionName should be 1.3.0");

assert.equal(levels.length, 8, "v1.3.0 should ship eight chapters");
assert.deepEqual(
  levels.slice(5).map((level) => level.id),
  ["stargatecove", "loopinglighthouse", "ringconservatory"],
  "World 2 chapter IDs should be stable"
);
assert.deepEqual(
  levels.slice(5).map((level) => level.name),
  ["第六章 星门浅湾", "第七章 回环灯塔", "第八章 星环温室"],
  "World 2 chapter names should be stable"
);
assert.ok(levels.slice(0, 5).every((level) => level.world?.id === "world1"), "Existing five chapters should be grouped as World 1");
assert.ok(levels.slice(5).every((level) => level.world?.id === "world2"), "New chapters should be grouped as World 2");
assert.ok(levels.slice(5).every((level) => Array.isArray(level.portals) && level.portals.length >= 2), "Every World 2 chapter should include portals");

assert.ok(hud.includes("level-world"), "renderLevelList should emit world headings");
assert.ok(hud.includes("button.dataset.world"), "level buttons should carry a world dataset");
assert.ok(/\.level-world\s*{/.test(css), "styles.css should style world headings");
assert.ok(/\.level-item\.featured\s*{[\s\S]*?grid-column: span 2/.test(css), "featured chapter should still be prominent in grouped layout");

assert.ok(storage.includes("DEFAULT_LEVEL_COUNT = 8"), "storage default level count should be updated to 8");
assert.ok(storage.includes("bestTimes.auroracitadel") && storage.includes("levelStars.auroracitadel"), "storage should derive chapter 6 access from old chapter 5 completion");

assert.ok(html.includes("八大章节"), "index.html visible and metadata copy should mention eight chapters");
assert.ok(manifest.description.includes("八大章节"), "PWA manifest should mention eight chapters");

console.log("content-expansion-v1.3.0: World 2 content, metadata, UI grouping, and save compatibility guards passed");
