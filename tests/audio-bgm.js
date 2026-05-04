const assert = require("node:assert/strict");
const fs = require("node:fs");

const index = fs.readFileSync("index.html", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");
const audio = fs.readFileSync("src/core/audio.js", "utf8");
const notice = fs.readFileSync("assets/audio/NOTICE.md", "utf8");
const track = fs.statSync("assets/audio/fairy-adventure.ogg");
const Audio = require("../src/core/audio.js");

assert.ok(track.size > 1_000_000, "BGM file should be bundled locally");
assert.ok(track.size < 3_000_000, "BGM file should remain size-optimized for the APK");
assert.ok(index.includes('id="bgmRange"'), "Settings screen should expose BGM volume");
assert.ok(game.includes('setBgmSource("./assets/audio/fairy-adventure.ogg")'), "Game should load the bundled BGM");
assert.ok(game.includes("audioBus.playBgm()"), "Gameplay should start BGM after a user action");
assert.ok(game.includes("audioBus.pauseBgm()"), "Menus and modals should pause BGM");
assert.ok(audio.includes("bgm.loop = true"), "BGM should be looped");
assert.ok(audio.includes("bgm.preload = \"auto\""), "BGM should be preloaded");
assert.ok(audio.includes("armAutoplayRetry"), "AudioBus should expose BGM autoplay retry");
assert.ok(audio.includes('addEventListener("pointerdown"'), "BGM retry should listen for pointer gestures");
assert.ok(audio.includes('addEventListener("keydown"'), "BGM retry should listen for keyboard gestures");
assert.match(notice, /OpenGameArt/i);
assert.match(notice, /CC0 1\.0 Universal/i);
assert.match(notice, /creativecommons\.org\/publicdomain\/zero\/1\.0/i);

async function runRetryAttachCheck() {
  const previous = {
    Audio: globalThis.Audio,
    document: globalThis.document,
    addEventListener: globalThis.addEventListener,
    removeEventListener: globalThis.removeEventListener,
  };
  const listeners = new Map();
  let playCalls = 0;
  class MockAudio {
    constructor(src) {
      this.src = src;
      this.loop = false;
      this.preload = "";
      this.paused = true;
      this.muted = false;
      this.volume = 1;
    }
    play() {
      playCalls += 1;
      if (playCalls === 1) return Promise.reject(new Error("blocked"));
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
    removeAttribute() {}
    load() {}
  }
  globalThis.Audio = MockAudio;
  globalThis.document = { hidden: false };
  globalThis.addEventListener = (type, fn) => listeners.set(type, fn);
  globalThis.removeEventListener = (type, fn) => {
    if (listeners.get(type) === fn) listeners.delete(type);
  };
  try {
    const bus = Audio.createAudioBus({ getVolume: () => 70, getBgmVolume: () => 60 });
    bus.setBgmSource("./assets/audio/fairy-adventure.ogg");
    bus.armAutoplayRetry();
    bus.armAutoplayRetry();
    assert.equal(listeners.size, 2, "armAutoplayRetry should attach two idempotent listeners");
    assert.ok(listeners.has("pointerdown"), "pointerdown retry listener should attach");
    assert.ok(listeners.has("keydown"), "keydown retry listener should attach");
    await bus.playBgm();
    assert.equal(listeners.size, 2, "failed autoplay should keep retry listeners attached");
    await listeners.get("pointerdown")();
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(listeners.size, 0, "successful retry should remove both listeners");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
}

runRetryAttachCheck()
  .then(() => {
    console.log("audio-bgm: bundled CC0 BGM integration and autoplay retry passed");
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
