const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const hud = fs.readFileSync("src/render/hud.js", "utf8");
const cursor = fs.readFileSync("src/render/cursor-trail.js", "utf8");
const eggs = fs.readFileSync("src/render/easter-eggs.js", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");
const manifest = JSON.parse(fs.readFileSync("manifest.webmanifest", "utf8"));
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

assert.ok(["1.2.3", "1.2.4", "1.3.0"].includes(pkg.version), `package.json version should be 1.2.3, 1.2.4, or 1.3.0 (got ${pkg.version})`);
assert.ok(["1.2.3", "1.2.4", "1.3.0"].includes(lock.version), `package-lock.json root version should be 1.2.3, 1.2.4, or 1.3.0 (got ${lock.version})`);
assert.match(sw, /CACHE = "nini-yuan-v(1\.2\.(3-starlit-whispers-r3|4-aurora-cartography)|1\.3\.0-world-2-star-gates)"/, "service worker cache should be at v1.2.3 post-review, v1.2.4, or v1.3.0");
assert.ok(sw.includes("./src/render/cursor-trail.js"), "service worker should cache cursor-trail.js");
assert.ok(sw.includes("./src/render/easter-eggs.js"), "service worker should cache easter-eggs.js");
assert.ok(/versionCode="(6|7|8)"/.test(androidManifest), "Android versionCode should be 6 (v1.2.3), 7 (v1.2.4), or 8 (v1.3.0)");
assert.ok(/versionName="(1\.2\.(3|4)|1\.3\.0)"/.test(androidManifest), "Android versionName should be 1.2.3, 1.2.4, or 1.3.0");
assert.ok(!manifest.description.includes("平台跳跃"), "PWA manifest description should drop the legacy platform-jump phrasing");
assert.ok(manifest.description.includes("星图冒险"), "PWA manifest description should advertise the star-atlas adventure copy");

assert.ok(hud.includes('"level-stars"'), "renderLevelList should emit a .level-stars container");
assert.ok(hud.includes('"level-best"'), "renderLevelList should emit a .level-best container");
assert.ok(hud.includes('"level-best-value"'), "renderLevelList should emit a .level-best-value strong tag");
assert.ok(/star\s+\$\{s\s*<\s*stars\s*\?\s*"filled"\s*:\s*"empty"\}/.test(hud), "stars should be split into filled/empty glyphs");
assert.ok(hud.includes('aria-label'), "level-stars should expose an aria-label for assistive tech");

assert.ok(/\.level-item \.level-stars \.star\.filled\s*{[\s\S]*?--c-gold-200/.test(css), "filled stars should use --c-gold-200");
assert.ok(/\.level-item \.level-stars \.star\.empty\s*{[\s\S]*?rgba\(245, 242, 234, 0\.22\)/.test(css), "empty stars should drop to a low-contrast ivory tone");
assert.ok(/\.level-item \.level-best-value\s*{[\s\S]*?--c-gold-200/.test(css), "best-time value should be set in --c-gold-200");
assert.ok(/\.level-item\.locked \.level-stars \.star\.filled,[\s\S]*\.level-item\.locked \.level-best-value/.test(css), "locked level cards should desaturate their gold tint");

assert.ok(html.includes('class="ambient ambient-left"'), "index.html should declare the left ambient rail");
assert.ok(html.includes('class="ambient ambient-right"'), "index.html should declare the right ambient rail");
assert.ok(html.includes('class="ambient-strip"'), "index.html should declare the bottom ambient strip");
assert.ok(html.includes('id="ambientQuote"'), "index.html should expose ambientQuote for runtime rotation");
assert.ok(html.includes('class="ambient-constellation"'), "right ambient rail should include the connected constellation glyph");

assert.ok(/body:has\(\.screen\.active\) \.ambient,[\s\S]*\.ambient-strip\s*{\s*opacity: 1;/.test(css), "ambient layer should reveal only when a menu screen is active");
assert.ok(/body:has\(\.hud\.active\) \.ambient,[\s\S]*?transition-duration: 0ms;/.test(css), "ambient layer should hide immediately during gameplay");
assert.ok(/\.ambient,[\s\S]*?\.ambient-strip\s*{[\s\S]*?z-index: 2;/.test(css), "ambient layer should sit above the full-screen canvas shell");
assert.ok(/@media \(pointer: coarse\), \(max-width: 900px\) {[\s\S]*?\.ambient {\s*display: none;/.test(css), "side ambient rails should hide on coarse pointer / narrow viewport");
assert.ok(/@keyframes ambient-drift/.test(css), "ambient-drift keyframe should exist");
assert.ok(/@keyframes ambient-twinkle/.test(css), "ambient-twinkle keyframe should exist");
assert.ok(/@keyframes ambient-constellation-pulse/.test(css), "ambient-constellation-pulse keyframe should exist");

assert.ok(html.includes('src="./src/render/cursor-trail.js"'), "index.html should load cursor-trail.js");
assert.ok(html.includes('src="./src/render/easter-eggs.js"'), "index.html should load easter-eggs.js");
assert.ok(/@keyframes cursor-spark-fade/.test(css), "cursor-spark-fade keyframe should exist");
assert.ok(/\.cursor-trail\s*{[\s\S]*?pointer-events: none;/.test(css), "cursor-trail layer should ignore pointer events");
assert.ok(/\.cursor-trail\s*{[\s\S]*?inset: 0;[\s\S]*?width: 100vw;[\s\S]*?height: 100vh;[\s\S]*?z-index: 9;/.test(css), "cursor-trail layer should cover the viewport above the menu panel");
assert.ok(/animation: cursor-spark-fade 960ms/.test(css), "cursor sparks should have a slightly longer tail");
assert.ok(/\.cursor-spark\.tone-cyan/.test(css), "cursor sparks should include an aurora cyan tone");
assert.ok(cursor.includes("(hover: hover) and (pointer: fine)"), "cursor trail should gate on fine-pointer hover devices");
assert.ok(cursor.includes("prefers-reduced-motion"), "cursor trail should bail under reduced-motion");
assert.ok(cursor.includes("MAX_PARTICLES = 56"), "cursor trail should cap concurrent particles at the refreshed budget");
assert.ok(cursor.includes("MIN_INTERVAL_MS = 12"), "cursor trail should be responsive enough for quick pointer movement");
assert.ok(cursor.includes("TRAIL_STEP_PX"), "cursor trail should interpolate particles along fast pointer movement");
assert.ok(cursor.includes("sharedLayer") && cursor.includes("activeParticles"), "cursor trail should use one shared layer with a global particle budget");
assert.ok(cursor.includes("container = options.container || document.body"), "cursor trail should render in the body-level viewport overlay");
assert.ok(/button,[\s\S]*?\.brand h1,[\s\S]*?#touchControls,[\s\S]*?user-select: none;/.test(css), "interactive text should not be selectable during rapid clicks or long press");

assert.ok(eggs.includes("KONAMI"), "easter-eggs script should declare a Konami sequence");
assert.ok(eggs.includes("KONAMI_SHORT"), "easter-eggs script should also accept the shorter up-up-down-down-left-right-N-Y sequence");
assert.ok(eggs.includes("event.repeat"), "easter-eggs keyboard listener should ignore held-key repeats");
assert.ok(eggs.includes("Digit5") && eggs.includes("Digit2") && eggs.includes("Digit0"), "easter-eggs script should declare a 5-2-0 number sequence");
assert.ok(eggs.includes("flashHeart"), "easter-eggs script should expose the flashHeart helper");
assert.ok(eggs.includes("openLetter"), "easter-eggs script should expose the openLetter helper");
assert.ok(eggs.includes("rotateAmbientQuote"), "easter-eggs script should rotate the ambient quote line");
assert.ok(eggs.includes("dateSurprise"), "easter-eggs script should declare a calendar trigger");
assert.ok(/konami\.matched \|\| shortKonami\.matched[\s\S]*?openLetter\(SECRET_LINES\[1\]\);[\s\S]*?flashHeart/.test(eggs), "Konami variants should open the second letter and flash the heart");
assert.ok(/numberCursor === NUMBER_CODE\.length\)[\s\S]*?openLetter\(SECRET_LINES\[0\]\);/.test(eggs), "520 should open the first letter");
assert.ok(/@keyframes love-heart-beat/.test(css), "love-heart-beat keyframe should exist");
assert.ok(/\.love-letter,[\s\S]*?\.love-heart,[\s\S]*?\.love-toast\s*{[\s\S]*?z-index: 60;/.test(css), "love overlays should share z-index 60 above the menu");
assert.ok(/\.love-letter\.show,[\s\S]*?\.love-heart\.show,[\s\S]*?\.love-toast\.show\s*{\s*opacity: 1;/.test(css), "love overlays should reveal via .show opacity 1");

assert.ok(/@media \(prefers-reduced-motion: reduce\) {[\s\S]*?\.cursor-trail\s*{\s*display: none;/.test(css), "reduced-motion should hide the cursor trail");
assert.ok(/@media \(prefers-reduced-motion: reduce\) {[\s\S]*?\.love-heart svg\s*{\s*animation: none;/.test(css), "reduced-motion should pause the love-heart heartbeat");

console.log("menu-polish-v1.2.3: chapter-card gold restore, ambient layer, cursor trail, and easter-egg scripts wired correctly");
