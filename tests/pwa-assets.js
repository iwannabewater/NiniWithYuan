const assert = require("node:assert/strict");
const fs = require("node:fs");

const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");

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

for (const asset of ["./src/core/storage.js", "./src/core/audio.js", "./src/render/hud.js", "./src/game.js"]) {
  assert.ok(serviceWorker.includes(asset), `Service worker missing cache asset: ${asset}`);
}

for (const atlas of ["./assets/characters/nini/atlas.json", "./assets/characters/yuan/atlas.json"]) {
  assert.ok(fs.existsSync(atlas.replace(/^\.\//, "")), `Missing character atlas: ${atlas}`);
  assert.ok(serviceWorker.includes(atlas), `Service worker missing character atlas: ${atlas}`);
}

for (const audioAsset of ["./assets/audio/fairy-adventure.ogg", "./assets/audio/NOTICE.md"]) {
  assert.ok(fs.existsSync(audioAsset.replace(/^\.\//, "")), `Missing audio asset: ${audioAsset}`);
  assert.ok(serviceWorker.includes(audioAsset), `Service worker missing audio cache asset: ${audioAsset}`);
}

console.log("pwa-assets: manifest icons and service worker cache passed");
