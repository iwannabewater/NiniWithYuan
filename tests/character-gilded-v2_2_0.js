const assert = require("node:assert/strict");
const fs = require("node:fs");
const { assertReleaseFloor } = require("./helpers/release.js");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const source = fs.readFileSync("src/render/character-gilding.js", "utf8");
const Gilding = require("../src/render/character-gilding.js");

assertReleaseFloor(assert, { pkg, lock, serviceWorker, html, androidManifest }, "2.2.0", 23);

for (const fn of ["resolveCharacterInstrument"]) {
  assert.equal(typeof Gilding[fn], "function", `character-gilding should export ${fn}`);
}

const nini = Gilding.resolveCharacterInstrument("nini");
const yuan = Gilding.resolveCharacterInstrument("yuan");
assert.equal(nini.mark, "璇");
assert.equal(nini.artifact, "璇玑星盘");
assert.equal(yuan.mark, "青");
assert.equal(yuan.artifact, "青玉圭剑");

assert.ok(html.includes("id=\"hudCharacterSigil\""), "the HUD should expose the current character sigil");
assert.match(html, /class="character-card-signature"/, "character cards should carry a signature inscription");
assert.ok(html.indexOf("src/render/character-gilding.js") < html.indexOf("src/game.js"), "the gilding helper must load before the runtime");
assert.ok(serviceWorker.includes("./src/render/character-gilding.js"), "the gilding helper should ship in the offline cache");
assert.match(game, /display\.silhouette/, "the runtime should light the painted figure with a moonlight rim");
assert.match(game, /instrument\?\.mark/, "the HUD should read the instrument mark from the gilding helper");
assert.doesNotMatch(game, /player\.(?:gilding|rhythm|vignette|graphics)/, "gilding must stay presentation-owned");
assert.doesNotMatch(source.replace(/typeof window/g, ""), /document\b|window\./, "gilding art must stay DOM-free");

assert.match(css, /\.character-card-signature\s*\{/, "the card signature should be styled");
assert.match(css, /\.hud-character-sigil\s*\{/, "the HUD sigil should be styled");
assert.match(css, /\.character-card\[data-character="nini"\]/, "Nini should carry character variables");
assert.match(css, /\.character-card\[data-character="yuan"\]/, "Yuan should carry character variables");

console.log("character-gilded-v2.2.0: gilded companion presentation, HUD sigil, and release contracts passed");
