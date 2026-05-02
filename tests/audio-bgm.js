const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");
const audio = fs.readFileSync("src/core/audio.js", "utf8");
const notice = fs.readFileSync("assets/audio/NOTICE.md", "utf8");
const track = fs.statSync("assets/audio/fairy-adventure.ogg");

assert.ok(track.size > 1_000_000, "BGM file should be bundled locally");
assert.ok(track.size < 3_000_000, "BGM file should remain size-optimized for the APK");
assert.ok(index.includes('id="bgmRange"'), "Settings screen should expose BGM volume");
assert.ok(game.includes('setBgmSource("./assets/audio/fairy-adventure.ogg")'), "Game should load the bundled BGM");
assert.ok(game.includes("audioBus.playBgm()"), "Gameplay should start BGM after a user action");
assert.ok(game.includes("audioBus.pauseBgm()"), "Menus and modals should pause BGM");
assert.ok(audio.includes("bgm.loop = true"), "BGM should be looped");
assert.ok(audio.includes("bgm.preload = \"auto\""), "BGM should be preloaded");
assert.match(notice, /OpenGameArt/i);
assert.match(notice, /CC0 1\.0 Universal/i);
assert.match(notice, /creativecommons\.org\/publicdomain\/zero\/1\.0/i);

console.log("audio-bgm: bundled CC0 BGM integration passed");
