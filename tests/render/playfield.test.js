"use strict";

// Playfield render contracts: terrain honesty, culling, phase ghosts, props
// readability, and allocation-free effects.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const { RecordingPath, recordingContext, callsNamed } = require("../helpers/canvas.js");

globalThis.Path2D = RecordingPath;

const Terrain = require("../../src/render/terrain.js");
const Props = require("../../src/render/props.js");
const Effects = require("../../src/render/effects.js");
const Chapters = require("../../src/data/chapters.js");

const chapters = Chapters.buildChapters();

function pathPoints(path) {
  const points = [];
  for (const [name, ...args] of path.ops) {
    if (name === "moveTo" || name === "lineTo") points.push([args[0], args[1]]);
    else if (name === "quadraticCurveTo") points.push([args[2], args[3]]);
    else if (name === "bezierCurveTo") points.push([args[4], args[5]]);
    else if (name === "ellipse") points.push([args[0] - args[2], args[1]], [args[0] + args[2], args[1]], [args[0], args[1] - args[3]], [args[0], args[1] + args[3]]);
    else if (name === "rect") points.push([args[0], args[1]], [args[0] + args[2], args[1] + args[3]]);
  }
  return points;
}

// --- palette ------------------------------------------------------------------

assert.equal(Props.MATERIAL.lacquer, "#0b1016");
assert.equal(Props.MATERIAL.agedGold, "#c3a468");
assert.equal(Props.MATERIAL.carvedJade, "#6da895");
assert.equal(Props.MATERIAL.dustyRose, "#b87b86");
assert.equal(Props.phaseColor("a"), "#7893a4");
assert.equal(Props.phaseColor("b"), "#6da895");
assert.equal(Props.powerupColor("berry"), "#b87b86");
assert.equal(Props.powerupColor("core"), "#6da895");
assert.equal(Props.powerupColor("bell"), "#c3a468");
assert.equal(Props.portalColor({ palette: "jade" }), "#6da895");
assert.notEqual(Props.pickupPulse("gem", 0, 10).pulse, Props.pickupPulse("gem", 0.2, 10).pulse, "pickups breathe with scene time");

// --- terrain honesty ------------------------------------------------------------

for (const level of chapters) {
  const cache = Terrain.prepare(recordingContext(), level);
  assert.equal(cache.pieces.length, level.platforms.length + level.moving.length, `${level.id}: one recipe per platform`);
  assert.equal(cache.hazards.length, level.hazards.length, `${level.id}: one recipe per hazard`);
  for (const piece of cache.pieces) {
    const p = piece.local;
    const points = pathPoints(piece.body);
    assert.ok(Math.abs(Math.min(...points.map(([, y]) => y)) - p.y) < 1e-6, `${level.id}: ${piece.kind} tops out exactly on the walkable edge`);
    if (piece.kind === "cloud") continue;
    const crest = points.filter(([, y]) => Math.abs(y - p.y) < 1e-6).map(([x]) => x);
    assert.ok(crest.length >= 2, `${level.id}: ${piece.kind} draws its walkable top on the collision edge`);
    assert.ok(Math.min(...crest) <= p.x + 6 && Math.max(...crest) >= p.x + p.w - 6, `${level.id}: the drawn top spans the collision width`);
    if (piece.kind === "earth") {
      assert.deepEqual(points.slice(0, 2), [[p.x, p.y], [p.x + p.w, p.y]], `${level.id}: earth crests run corner to corner`);
    }
    for (const [x, y] of points) {
      assert.ok(x >= p.x - 1e-6 && x <= p.x + p.w + 1e-6, `${level.id}: ${piece.kind} flanks never bulge past the collision box`);
      assert.ok(y >= p.y - 1e-6, `${level.id}: no solid-looking terrain rises above the walkable top`);
    }
    if (piece.kind !== "earth" || piece.moving) continue;
    const reachesFloor = p.y + p.h >= level.height - 1;
    const lowest = Math.max(...points.map(([, y]) => y));
    if (!reachesFloor && lowest > p.y + p.h + 0.5) {
      assert.ok(Terrain.clearanceBelow(level, p, 120) >= 40, `${level.id}: undersides only hang into open air`);
    }
  }
}

{
  const upper = { x: 0, y: 100, w: 200, h: 48, type: "ground", phase: "" };
  const lower = { x: 40, y: 178, w: 120, h: 48, type: "ground", phase: "" };
  const level = { id: "clearance", world: { id: "world1" }, height: 800, platforms: [upper, lower], moving: [], hazards: [] };
  assert.equal(Terrain.clearanceBelow(level, upper, 120), 30);
  const cache = Terrain.prepare(recordingContext(), level);
  assert.equal(cache.pieces[0].roots, null, "a slab with a walkable ledge just below keeps a flush underside");
}

// --- culling and phase ghosts ---------------------------------------------------

{
  const level = chapters.find((chapter) => chapter.platforms.some((p) => p.type === "phase"));
  const cache = Terrain.prepare(recordingContext(), level);
  const far = recordingContext();
  Terrain.draw(far, cache, { x: -99999, y: -99999, w: 10, h: 10 }, 1, () => true);
  assert.equal(callsNamed(far, "fill").length, 0, "off-screen terrain issues no fills");

  const phase = level.platforms.find((p) => p.type === "phase");
  const rect = { x: phase.x - 10, y: phase.y - 10, w: phase.w + 20, h: phase.h + 20 };
  const ghost = recordingContext();
  Terrain.draw(ghost, cache, rect, 1, (item) => !item.phase);
  assert.ok(callsNamed(ghost, "strokeRect").length >= 1, "inactive phase bridges draw as a dashed ghost");
  const solid = recordingContext();
  Terrain.draw(solid, cache, rect, 1, () => true);
  assert.ok(callsNamed(solid, "fill").some((call) => call.at(-1).globalAlpha === 1), "active phase bridges draw solid");
}

{
  const level = chapters.find((chapter) => chapter.hazards.some((h) => h.phase));
  const cache = Terrain.prepare(recordingContext(), level);
  const hazard = level.hazards.find((h) => h.phase);
  const rect = { x: hazard.x - 10, y: hazard.y - 10, w: hazard.w + 20, h: hazard.h + 20 };
  const ctx = recordingContext();
  Terrain.drawHazards(ctx, cache, rect, 1, () => false);
  const fills = callsNamed(ctx, "fill");
  assert.ok(fills.length > 0 && fills.every((call) => call.at(-1).globalAlpha < 0.3), "inactive phase thorns draw as faint ghosts");
}

// --- props -------------------------------------------------------------------------

{
  const ctx = recordingContext();
  Props.drawProjectile(ctx, { x: 0, y: 0, w: 18, h: 14, vx: 300, owner: "nini" }, { time: 0.4, color: "#123456", fx: false });
  assert.ok(callsNamed(ctx, "fill").some((call) => call.at(-1).fillStyle === "#123456"), "player shots carry the colour resolved from their tone");
}

for (const force of [320, -320]) {
  const ctx = recordingContext();
  const wind = { x: 0, y: 0, w: 480, h: 900, force };
  Props.drawWind(ctx, wind, { time: 1.2, rect: { x: 0, y: 0, w: 480, h: 900 } });
  const calls = ctx.calls;
  let chevrons = 0;
  for (let i = 0; i + 4 < calls.length; i += 1) {
    if (calls[i][0] !== "moveTo" || calls[i + 4][0] !== "closePath") continue;
    chevrons += 1;
    assert.equal(Math.sign(calls[i][1] - calls[i + 1][1]), Math.sign(force), "wind chevrons point the way the wind pushes");
  }
  assert.ok(chevrons > 0, "crosswind columns carry directional chevrons");
}

for (const draw of [Props.drawCoin, Props.drawPowerup]) {
  const pickup = { x: 40, y: 60, w: 30, h: 30, kind: "coin" };
  const a = recordingContext();
  const b = recordingContext();
  draw(a, pickup, { time: 0.2, reducedMotion: true, fx: false });
  draw(b, pickup, { time: 1.7, reducedMotion: true, fx: false });
  const motion = (ctx) => ctx.calls.filter(([name]) => name === "translate" || name === "rotate");
  assert.deepEqual(motion(a), motion(b), "reduced motion holds pickups still");
}

{
  const goal = { x: 100, y: 100, w: 72, h: 124 };
  const open = recordingContext();
  const sealed = recordingContext();
  Props.drawGoal(open, goal, { time: 1 });
  Props.drawGoal(sealed, goal, { time: 1, sealed: true });
  const lattice = (ctx) => ctx.calls.some(([name, key, value]) => name === "set" && key === "strokeStyle" && value === "rgba(198,191,174,0.35)");
  assert.ok(lattice(sealed) && !lattice(open), "a sealed gate shows its lattice; an open gate does not");
}

// --- pooled effects -------------------------------------------------------------------

{
  const pool = Effects.createParticlePool(8);
  const items = pool.items;
  const objects = new Set(items);
  for (let i = 0; i < 20; i += 1) Effects.emit(pool, i, 0, 0, 0, 2, 0.5 + i * 0.01, "#fff", "orb", 0, 0, 0, 0, false);
  assert.equal(pool.count, 8, "a full pool recycles slots instead of growing");
  Effects.update(pool, 0.65);
  assert.ok(pool.count < 8, "expired particles leave the live range");
  Effects.update(pool, 1);
  assert.equal(pool.count, 0);
  assert.equal(pool.items, items, "the slot array is reused");
  assert.deepEqual(new Set(pool.items), objects, "particle objects are reused, never reallocated");

  Effects.burst(pool, 0, 0, "#fff", 5, { glow: true });
  assert.equal(pool.count, 6, "a burst emits its count plus one glow ring");
  const ctx = recordingContext();
  Effects.draw(ctx, pool, { x: 5000, y: 5000, w: 10, h: 10 });
  assert.equal(callsNamed(ctx, "fill").length + callsNamed(ctx, "drawImage").length, 0, "off-screen particles are culled");
}

{
  const texts = Effects.createTextPool(3);
  for (let i = 0; i < 5; i += 1) Effects.addText(texts, `+${i}`, 0, 0, "#fff");
  assert.equal(texts.count, 3);
  Effects.updateTexts(texts, Effects.TEXT_LIFE + 0.01);
  assert.equal(texts.count, 0);
}

// --- source-level guards ------------------------------------------------------------

for (const file of ["src/render/terrain.js", "src/render/props.js", "src/render/effects.js"]) {
  const source = fs.readFileSync(file, "utf8").replace(/typeof window/g, "");
  assert.doesNotMatch(source, /document\.|window\./, `${file} stays stateless and DOM-free`);
  assert.doesNotMatch(source, /\.shadowBlur\s*=/, `${file} uses cached glow sprites, never shadowBlur`);
}
const effectsSource = fs.readFileSync("src/render/effects.js", "utf8");
assert.doesNotMatch(effectsSource, /\.filter\(|\.push\(/, "effects update and draw without allocating arrays");

console.log("render/playfield: terrain honesty, culling, phase ghosts, props, and pooled effects passed");
