const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const { assertReleaseFloor } = require("./helpers/release.js");
const WardenArt = require("../src/render/warden.js");

const hud = fs.readFileSync("src/render/hud.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");
const audio = fs.readFileSync("src/core/audio.js", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

/* -- release metadata ------------------------------------------------------ */

assertReleaseFloor(assert, { pkg, lock, serviceWorker: sw, html, androidManifest }, "2.0.0", 21);
assert.ok(sw.includes("./src/core/progression.js"), "the offline cache must ship the progression module");
assert.ok(sw.includes("./src/render/warden.js"), "the offline cache must ship the warden renderer");
assert.ok(
  html.indexOf("src/core/progression.js") < html.indexOf("src/game.js"),
  "progression must load before the runtime reads it"
);
assert.ok(
  html.indexOf("src/render/warden.js") < html.indexOf("src/game.js"),
  "warden art must load before the runtime reads it"
);

/* -- interface surfaces ---------------------------------------------------- */

for (const id of [
  "recordScreen",
  "recordSummary",
  "recordGroups",
  "modalReport",
  "wardenBar",
  "wardenFill",
  "hudChain",
  "hudChainMult",
  "assistToggle",
  "assistInvulnToggle",
  "assistSkillToggle",
  "assistJumpToggle",
  "assistSpeedRange",
]) {
  assert.ok(html.includes(`id="${id}"`), `index.html should expose #${id}`);
}
assert.ok(html.includes('data-action="record"'), "the menu must reach the record screen");
assert.match(html, /id="wardenTrack"[^>]*role="progressbar"/, "the warden bar must expose progress semantics");

for (const marker of [
  "v2.0.0 Astral Echo composition boundary",
  ".record-item.unlocked",
  ".medal-badge.medal-star",
  ".marrow-badge.found",
  ".warden-badge.cleared",
  ".hud-chain-mult",
  ".warden-bar-track",
  ".report-mark.assist",
  ".settings-assist.assist-on",
  ".level-footer",
]) {
  assert.ok(css.includes(marker), `styles.css should define ${marker}`);
}
assert.doesNotMatch(css, /transition:\s*all\b/, "no blanket transitions");
assert.doesNotMatch(css, /backdrop-filter\s*:/, "no backdrop-filter on low-power devices");

for (const fn of ["renderRecordScreen", "renderOutcomeReport", "clearOutcomeReport"]) {
  assert.equal(typeof require("../src/render/hud.js")[fn], "function", `hud should export ${fn}`);
}
assert.ok(hud.includes("level-marks"), "chapter cards carry the new marks");
assert.ok(hud.includes("MEDAL_GLYPH_EMPTY"), "an unearned medal keeps its own glyph rather than a dash");

for (const fn of ["drawWarden", "drawSentry", "drawWarder", "drawMarrow", "drawLantern", "drawArenaSeal", "drawHostileBolt"]) {
  assert.equal(typeof WardenArt[fn], "function", `warden art should export ${fn}`);
}
assert.ok(!/document\.|window\./.test(fs.readFileSync("src/render/warden.js", "utf8").replace(/typeof window/g, "")),
  "warden art must stay a stateless canvas helper");

for (const cueName of ["warden_wake", "warden_sweep", "warden_fall", "sentry_fire", "deflect", "combo_up", "marrow", "lantern"]) {
  assert.ok(audio.includes(`${cueName}:`), `the cue table should define ${cueName}`);
}

/* -- browser-style module exports ------------------------------------------ */

{
  const browserContext = { window: {} };
  vm.runInNewContext(fs.readFileSync("src/core/progression.js", "utf8"), browserContext);
  assert.equal(typeof browserContext.window.NiniProgression.medalForTime, "function");
  const artContext = { window: {} };
  vm.runInNewContext(fs.readFileSync("src/render/warden.js", "utf8"), artContext);
  assert.equal(typeof artContext.window.NiniYuanWarden.drawWarden, "function");
}

console.log("astral-echo-v2.0.0: release metadata, interface surfaces, warden art, and cue table contracts passed");
