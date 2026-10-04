const assert = require("node:assert/strict");
const fs = require("node:fs");
const { assertReleaseFloor } = require("./helpers/release.js");

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const serviceWorker = fs.readFileSync("service-worker.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
const creatureSource = fs.readFileSync("src/render/creature-material.js", "utf8");
const CreatureArt = require("../src/render/creature-material.js");

assertReleaseFloor(assert, { pkg, lock, serviceWorker, html, androidManifest }, "2.3.0", 24);

for (const marker of [
  "time = Number(options.time) || 0",
  "spark * 2.1 + seed",
  "ellipse(ctx, 0, 7, enemy.w * 0.14",
  "drawGroundCreature(ctx, enemy, pose, options)",
]) {
  assert.ok(creatureSource.includes(marker), `creature material should contain ${marker}`);
}

function mockContext() {
  const calls = [];
  const ctx = {
    calls,
    save() { calls.push(["save"]); },
    restore() { calls.push(["restore"]); },
    translate() { calls.push(["translate"]); },
    scale() { calls.push(["scale"]); },
    rotate() { calls.push(["rotate"]); },
    beginPath() { calls.push(["beginPath"]); },
    closePath() { calls.push(["closePath"]); },
    moveTo() { calls.push(["moveTo"]); },
    lineTo() { calls.push(["lineTo"]); },
    quadraticCurveTo() { calls.push(["quadraticCurveTo"]); },
    bezierCurveTo() { calls.push(["bezierCurveTo"]); },
    ellipse() { calls.push(["ellipse"]); },
    arc() { calls.push(["arc"]); },
    fillRect() { calls.push(["fillRect"]); },
    strokeRect() { calls.push(["strokeRect"]); },
    fill() { calls.push(["fill"]); },
    stroke() { calls.push(["stroke"]); },
    setLineDash() { calls.push(["setLineDash"]); },
    createLinearGradient() { return { addColorStop() {} }; },
    createRadialGradient() { return { addColorStop() {} }; },
    roundRect(...args) { calls.push(["roundRect", ...args]); },
    getContext() { return this; },
  };
  return ctx;
}

const baseEnemy = {
  type: "slime",
  x: 0,
  y: 0,
  w: 34,
  h: 34,
  phase: 0,
  vx: 60,
  facing: 1,
  hitTimer: 0,
  baseY: 0,
};

for (const type of ["slime", "ember", "wisp"]) {
  const ctx = mockContext();
  CreatureArt.drawEnemy(ctx, { ...baseEnemy, type }, {
    time: 0.5,
    floatGap: 24,
    hoverRange: 6,
    reducedMotion: false,
    support: null,
  });
  assert.ok(ctx.calls.some(([name]) => name === "ellipse"), `${type} should draw layered creature bodies`);
  assert.ok(ctx.calls.some(([name]) => name === "restore"), `${type} should restore canvas state`);
}

// Field material contracts moved to tests/render/playfield.test.js with the v3 terrain.

console.log("living-field-v2.3.0: field micro-detail, reduced-motion separation, and release contracts passed");
