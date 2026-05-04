const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const hud = fs.readFileSync("src/render/hud.js", "utf8");
const cursor = fs.readFileSync("src/render/cursor-trail.js", "utf8");
const eggs = fs.readFileSync("src/render/easter-eggs.js", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

// --- version metadata --------------------------------------------------------

assert.ok(["1.2.4", "1.3.0", "1.3.1", "1.4.0", "1.5.0"].includes(pkg.version), "package.json should be at least v1.2.4");
assert.ok(["1.2.4", "1.3.0", "1.3.1", "1.4.0", "1.5.0"].includes(lock.version), "package-lock.json root version should be at least v1.2.4");
assert.match(sw, /CACHE = "nini-yuan-v(1\.2\.4-aurora-cartography|1\.3\.(0-world-2-star-gates|1-typography-copy-fix)|1\.4\.0-world-3-phase-tide|1\.5\.0-game-feel)"/, "service worker cache should be v1.2.4 or later");
assert.ok(/versionCode="(7|8|9|10|11)"/.test(androidManifest), "Android versionCode should be 7 through 11");
assert.ok(/versionName="(1\.2\.4|1\.3\.(0|1)|1\.4\.0|1\.5\.0)"/.test(androidManifest), "Android versionName should be 1.2.4 through 1.5.0");

// --- new keyframes -----------------------------------------------------------

const keyframeNames = [
  "compass-rotate",
  "aurora-sweep",
  "hud-pulse",
  "bossbar-shimmer",
  "bossbar-rise",
  "tips-rise",
  "hero-breath",
  "seal-breathe",
  "spark-lit",
];
for (const name of keyframeNames) {
  assert.ok(new RegExp(`@keyframes ${name}\\b`).test(css), `styles.css should declare @keyframes ${name}`);
}

// --- atlas compass + meridian rail ------------------------------------------

assert.ok(/\.level-item\.featured::before\s*{[\s\S]*?animation: compass-rotate 18s linear infinite/.test(css), "featured chapter ring should rotate via compass-rotate");
assert.ok(/\.level-list::after\s*{[\s\S]*?opacity: 0;/.test(css), "level-list meridian rail should default to opacity 0");
assert.ok(/\.level-list:hover::after\s*{\s*opacity: 0\.42/.test(css), "level-list meridian rail should reveal on hover at 0.42 opacity");

// --- brand sub-aurora --------------------------------------------------------

assert.ok(/\.brand::after\s*{[\s\S]*?animation: aurora-sweep 1400ms/.test(css), "brand should carry an aurora-sweep brushwork pseudo");

// --- hero parallax + breath -------------------------------------------------

assert.ok(/\.menu-heroes\s*{[\s\S]*?--mx: 0;[\s\S]*?--my: 0;/.test(css), ".menu-heroes should declare --mx and --my custom properties");
assert.ok(/\.nini-hero\s*{[\s\S]*?translate3d\(calc\(var\(--mx, 0\) \* 6px\)/.test(css), "nini-hero transform should respond to --mx");
assert.ok(/\.yuan-hero\s*{[\s\S]*?translate3d\(calc\(var\(--mx, 0\) \* -6px\)/.test(css), "yuan-hero transform should counter-respond to --mx");
assert.ok(/@media \(hover: none\) and \(pointer: coarse\) {[\s\S]*?\.menu-heroes\s*{[\s\S]*?animation: hero-breath 7s/.test(css), "touch viewports should animate hero-breath on .menu-heroes");
assert.ok(cursor.includes("attachHeroParallax"), "cursor-trail.js should expose attachHeroParallax");
assert.ok(/setProperty\("--mx"/.test(cursor), "cursor-trail.js should write --mx via setProperty");
assert.ok(/setProperty\("--my"/.test(cursor), "cursor-trail.js should write --my via setProperty");
assert.ok(cursor.includes('"(hover: hover) and (pointer: fine)"'), "hero parallax should gate on fine-pointer hover");
assert.ok(cursor.includes('"(prefers-reduced-motion: reduce)"'), "hero parallax should bail under reduced-motion");

// --- HUD pulse ---------------------------------------------------------------

assert.ok(/\.hud-pill\.pulse\s*{[\s\S]*?animation: hud-pulse/.test(css), ".hud-pill.pulse should run the hud-pulse keyframe");
assert.ok(hud.includes("pulseHudPill"), "hud.js should expose pulseHudPill helper");
assert.ok(game.includes("Hud.pulseHudPill"), "game.js should call Hud.pulseHudPill on transitions");
assert.ok(game.includes("hudState"), "game.js should track hudState for one-shot transitions");

// --- bossbar shimmer + gleam -------------------------------------------------

assert.ok(/\.bossbar span\s*{[\s\S]*?animation: bossbar-shimmer 7s linear infinite/.test(css), ".bossbar span should run bossbar-shimmer");
assert.ok(/\.bossbar span::after\s*{[\s\S]*?radial-gradient\(ellipse 100% 100% at 100% 50%, rgba\(255, 247, 213/.test(css), ".bossbar span::after should paint a gold leading-edge gleam");

// --- chapter intro orchestration --------------------------------------------

assert.ok(/body:has\(\.chapter-intro\.active\) \.bossbar\s*{\s*animation: bossbar-rise/.test(css), "bossbar should bossbar-rise on chapter intro");
assert.ok(/body:has\(\.chapter-intro\.active\) #controlTips\s*{\s*animation: tips-rise [\s\S]*?160ms/.test(css), "control tips should tips-rise with a 160 ms delay on chapter intro");

// --- touch-button glyphs ----------------------------------------------------

const requiredGlyphRules = [
  /\.touch-btn\.jump::after\s*{[\s\S]*?mask-image: url\("data:image\/svg\+xml/,
  /\.touch-btn\.skill::after\s*{[\s\S]*?mask-image: url\("data:image\/svg\+xml/,
  /\.touch-btn\.shoot::after\s*{[\s\S]*?mask-image: url\("data:image\/svg\+xml/,
];
for (const re of requiredGlyphRules) {
  assert.ok(re.test(css), `styles.css should declare a touch-btn glyph mask: ${re}`);
}

// --- modal seal + paper grain -----------------------------------------------

assert.ok(/\.modal-card::after\s*{[\s\S]*?animation: seal-breathe 9s/.test(css), "modal-card should carry a seal-breathe atlas seal");
assert.ok(/\.modal-card\s*{[\s\S]*?feTurbulence/.test(css), "modal-card background should include a feTurbulence paper-grain SVG");

// --- settings runes ----------------------------------------------------------

const runeAttrs = ["♪", "♬", "◐", "✦"];
for (const rune of runeAttrs) {
  assert.ok(html.includes(`data-rune="${rune}"`), `index.html should mark a settings label with data-rune="${rune}"`);
}
assert.ok(/\.settings-list label\[data-rune\]::before\s*{[\s\S]*?content: attr\(data-rune\)/.test(css), "settings labels should render their rune via attr()");
assert.ok(/\.settings-list label\[data-rune\]::after\s*{[\s\S]*?linear-gradient\(90deg, rgba\(242, 211, 137/.test(css), "settings labels should render a hairline ribbon stub");

// --- constellation hunt + 4th letter ----------------------------------------

assert.ok(eggs.includes("bindConstellationHunt"), "easter-eggs.js should expose bindConstellationHunt");
assert.ok(eggs.includes("SECRET_LINES[3]"), "easter-eggs.js should reference the fourth letter index");
assert.ok(/星座已点亮/.test(eggs), "fourth letter should carry the Chinese constellation-found eyebrow");
assert.ok(/HUNT_WINDOW_MS\s*=\s*15000/.test(eggs), "constellation-hunt window should be pinned at 15 seconds");
assert.ok(/\.ambient-spark\.lit\s*{[\s\S]*?animation: spark-lit 1400ms/.test(css), "ambient sparks should animate spark-lit when discovered");
assert.ok(/@media \(hover: hover\) and \(pointer: fine\) {[\s\S]*?\.ambient\.hunt-on \.ambient-spark\s*{[\s\S]*?pointer-events: auto;/.test(css), "ambient sparks should only become clickable on fine-pointer surfaces with .hunt-on");

// --- in-game canvas polish ---------------------------------------------------

assert.ok(game.includes("glow: true"), "game.js burst should push a glow particle for warm pickup bursts");
assert.ok(/globalCompositeOperation = "lighter"/.test(game), "game.js renderParticles should composite glow particles with lighter blend");
assert.ok(game.includes("CANVAS_FONT_FAMILY"), "game.js renderFloatTexts should use the shared Canvas font family");
assert.ok(game.includes("save.settings.fx") && /if \(save\.settings\.fx\) {[\s\S]*?italic 700 20px \$\{CANVAS_FONT_FAMILY\}/.test(game), "gilded float-text should be guarded by the FX toggle");

// --- reduced-motion contract -------------------------------------------------

const reducedMotionGuards = [
  ".level-item.featured::before",
  ".brand::after",
  ".menu-heroes",
  ".bossbar span",
  ".modal-card::after",
  ".ambient-spark.lit",
  ".hud-pill.pulse",
];
const reducedBlock = css.split("@media (prefers-reduced-motion: reduce)")[1] || "";
for (const selector of reducedMotionGuards) {
  assert.ok(reducedBlock.includes(selector), `reduced-motion block should pause ${selector}`);
}

console.log("aesthetic-polish-v1.2.4: aurora cartography, brand sub-aurora, hero parallax, HUD pulse, bossbar shimmer, modal seal, settings runes, constellation hunt, and gilded float-text wired correctly");
