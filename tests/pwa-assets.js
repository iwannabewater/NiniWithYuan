const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");

assert.ok(serviceWorker.includes('const CACHE_PREFIX = "nini-yuan-"'));
assert.match(
  serviceWorker,
  /keys\.filter\(\(key\) => key\.startsWith\(CACHE_PREFIX\) && key !== CACHE\)/,
  "Activation must preserve unrelated same-origin caches"
);

assert.equal(manifest.lang, "zh-CN");
assert.equal(manifest.orientation, "landscape");
assert.ok(Array.isArray(manifest.icons));
assert.equal(manifest.icons.length >= 2, true);

for (const icon of manifest.icons) {
  const path = icon.src.replace(/^\.\//, "");
  assert.ok(fs.existsSync(path), `Missing PWA icon: ${path}`);
  assert.match(icon.purpose, /maskable/);
  assert.ok(serviceWorker.includes(icon.src), `Service worker should cache ${icon.src}`);
}

for (const asset of [
  "./src/core/storage.js",
  "./src/core/audio.js",
  "./src/core/input-state.js",
  "./src/core/game-rules.js",
  "./src/core/fixed-step.js",
  "./src/render/hud.js",
  "./src/render/character-motion.js",
  "./src/render/playfield-material.js",
  "./src/render/game-feel.js",
  "./src/render/respawn-veil.js",
  "./src/game.js",
]) {
  assert.ok(serviceWorker.includes(asset), `Service worker missing cache asset: ${asset}`);
}

assert.ok(serviceWorker.includes("./assets/characters/concepts/nini-yuan-song-atlas-v1.png"), "Service worker should cache the approved paired protagonist art");
assert.ok(fs.existsSync("assets/icons/xuanji-union-seal.svg"), "Xuanji Union Seal master icon should exist");
assert.ok(serviceWorker.includes("./assets/icons/xuanji-union-seal.svg"), "Service worker should cache the Xuanji Union Seal master icon");

for (const atlas of ["./assets/characters/nini/atlas.json", "./assets/characters/yuan/atlas.json"]) {
  assert.ok(fs.existsSync(atlas.replace(/^\.\//, "")), `Missing character atlas: ${atlas}`);
  assert.ok(serviceWorker.includes(atlas), `Service worker missing character atlas: ${atlas}`);
}

assert.ok(serviceWorker.includes("./assets/characters/nini/nini-atlas-v1.png"), "Service worker should cache the production Nini atlas");
assert.ok(serviceWorker.includes("./assets/characters/yuan/yuan-atlas-v1.png"), "Service worker should cache the production Yuan atlas");

for (const audioAsset of ["./assets/audio/fairy-adventure.ogg", "./assets/audio/NOTICE.md"]) {
  assert.ok(fs.existsSync(audioAsset.replace(/^\.\//, "")), `Missing audio asset: ${audioAsset}`);
  assert.ok(serviceWorker.includes(audioAsset), `Service worker missing audio cache asset: ${audioAsset}`);
}

async function verifyCacheIsolation() {
  const listeners = {};
  const deleted = [];
  const opened = [];
  const matched = [];
  const context = {
    caches: {
      keys: async () => [
        "nini-yuan-v1.6.3-forward-idle",
        "nini-yuan-v1.7.0-experience-integrity-r1",
        "other-game-offline-v8",
        "shared-font-cache-v2",
      ],
      delete: async (key) => {
        deleted.push(key);
        return true;
      },
      open: async (key) => {
        opened.push(key);
        return {
          match: async (request) => {
            matched.push(request.url);
            return { source: "current-app-cache" };
          },
        };
      },
    },
    self: {
      clients: { claim: async () => {} },
      addEventListener(type, listener) {
        listeners[type] = listener;
      },
    },
    fetch: async () => ({ ok: true }),
  };
  vm.runInNewContext(serviceWorker, context);
  let activation;
  listeners.activate({ waitUntil(promise) { activation = promise; } });
  await activation;
  assert.deepEqual(deleted, ["nini-yuan-v1.6.3-forward-idle"]);

  let response;
  const request = { method: "GET", url: "https://example.test/styles.css" };
  listeners.fetch({ request, respondWith(promise) { response = promise; } });
  assert.deepEqual(await response, { source: "current-app-cache" });
  assert.deepEqual(opened, ["nini-yuan-v1.7.0-experience-integrity-r1"]);
  assert.deepEqual(matched, [request.url]);
}

verifyCacheIsolation()
  .then(() => console.log("pwa-assets: manifest, offline cache, and cache isolation passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
