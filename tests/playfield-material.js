const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const Playfield = require("../src/render/playfield-material");

assert.equal(globalThis.NiniYuanPlayfieldMaterial, Playfield);
assert.deepEqual(
  {
    lacquer: Playfield.MATERIAL.lacquer,
    agedGold: Playfield.MATERIAL.agedGold,
    carvedJade: Playfield.MATERIAL.carvedJade,
    dustyRose: Playfield.MATERIAL.dustyRose,
  },
  {
    lacquer: "#0b1016",
    agedGold: "#c3a468",
    carvedJade: "#6da895",
    dustyRose: "#b87b86",
  }
);
assert.equal(Playfield.phaseColor("a"), "#7893a4");
assert.equal(Playfield.phaseColor("b"), "#6da895");
assert.equal(Playfield.powerupColor("berry"), "#b87b86");
assert.equal(Playfield.powerupColor("core"), "#6da895");
assert.equal(Playfield.powerupColor("bell"), "#c3a468");

{
  const browserContext = { window: {}, Math };
  vm.runInNewContext(fs.readFileSync("src/render/playfield-material.js", "utf8"), browserContext);
  assert.equal(typeof browserContext.window.NiniYuanPlayfieldMaterial.drawBackground, "function");
}

function mockContext() {
  const calls = [];
  const method = (name) => (...args) => calls.push([name, ...args]);
  const gradient = { addColorStop: method("addColorStop") };
  const ctx = {
    calls,
    createLinearGradient: () => gradient,
    createRadialGradient: () => gradient,
  };
  for (const name of [
    "save", "restore", "beginPath", "closePath", "moveTo", "lineTo", "quadraticCurveTo",
    "bezierCurveTo", "arc", "ellipse", "fill", "stroke", "fillRect", "strokeRect", "translate",
    "rotate", "scale", "roundRect", "setLineDash",
  ]) ctx[name] = method(name);
  return ctx;
}

const ctx = mockContext();
const view = { w: 844, h: 390, reducedMotion: false };
Playfield.drawBackground(ctx, {
  view,
  palette: ["#111827", "#283778"],
  camX: 120,
  camY: 40,
  time: 1.5,
  intensity: 1,
});
Playfield.drawPlatform(ctx, { x: 0, y: 200, w: 240, h: 48, type: "breakable" });
Playfield.drawHazard(ctx, { x: 0, y: 240, w: 96, h: 48, type: "spike" }, 1.5);
Playfield.drawHazard(ctx, { x: 0, y: 240, w: 96, h: 48, type: "lava" }, 1.5);
Playfield.drawSpring(ctx, { x: 0, y: 220, w: 48, h: 18 });
Playfield.drawCoin(ctx, { x: 30, y: 30, kind: "coin" }, { time: 1.5, fx: true });
Playfield.drawCoin(ctx, { x: 60, y: 30, kind: "gem" }, { time: 1.5, fx: false });
for (const [index, kind] of ["berry", "moon", "core", "bell", "heart"].entries()) {
  Playfield.drawPowerup(ctx, { x: index * 40, y: 80, w: 30, h: 30, kind }, { time: 1.5, fx: true });
}
Playfield.drawGoal(ctx, { x: 300, y: 100, w: 70, h: 120 }, { time: 1.5 });
Playfield.drawWind(ctx, { x: 0, y: 0, w: 240, h: 390, force: 320 }, { time: 1.5 });
Playfield.drawPortal(ctx, { x: 400, y: 100, w: 42, h: 76, palette: "jade" }, { time: 1.5 });

assert.ok(ctx.calls.filter(([name]) => name === "fillRect").length >= 2, "background and wind fields should paint real surfaces");
assert.ok(ctx.calls.filter(([name]) => name === "ellipse").length >= 6, "material renderers should draw visible seals, rings, and glyphs");
assert.ok(ctx.calls.filter(([name]) => name === "addColorStop").length >= 10, "material gradients should carry authored stops");

const source = fs.readFileSync("src/render/playfield-material.js", "utf8");
assert.doesNotMatch(source, /function drawSkyMotifs[\s\S]*?const points = \[\]/, "Sky drawing must not allocate point objects per frame");
assert.doesNotMatch(source, /function drawBackground[\s\S]*?const ridge = \[\]/, "Ridge drawing must not allocate point objects per frame");
assert.match(source, /function drawPlatform[\s\S]*?PLATFORM_COLORS/, "Platforms must reuse the static material table");
assert.doesNotMatch(source, /function powerupColor\(kind\) \{\s*return \{/, "Power-up colors must not rebuild a map per draw");
assert.doesNotMatch(source, /function portalColor\(portal\) \{\s*return \{/, "Portal colors must not rebuild a map per draw");
for (const banned of ["#61e5ff", "#7ff1ba", "#ff7fb1", "#8cf6ff"]) {
  assert.equal(source.includes(banned), false, `Playfield material helper must not restore neon ${banned}`);
}

console.log("playfield-material: ink-scroll, platform, collectible, hazard, goal, wind, and portal material contracts passed");
