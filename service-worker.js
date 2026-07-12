const CACHE = "nini-yuan-v1.9.0-ui-clarity-r2";
const CACHE_PREFIX = "nini-yuan-";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
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
  "./src/render/cursor-trail.js",
  "./src/render/easter-eggs.js",
  "./src/game.js",
  "./manifest.webmanifest",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/xuanji-union-seal.svg",
  "./assets/fonts/lxgw-wenkai-500.woff2",
  "./assets/fonts/lxgw-wenkai-700.woff2",
  "./assets/fonts/NOTICE.md",
  "./assets/fonts/OFL.txt",
  "./assets/characters/nini/nini-atlas-v1.png",
  "./assets/characters/yuan/yuan-atlas-v1.png",
  "./assets/characters/concepts/nini-yuan-song-atlas-v1.png",
  "./assets/characters/nini/atlas.json",
  "./assets/characters/yuan/atlas.json",
  "./assets/audio/fairy-adventure.ogg",
  "./assets/audio/NOTICE.md",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches
      .open(CACHE)
      .then((cache) => cache.match(event.request))
      .then((cached) => cached || fetch(event.request))
  );
});
