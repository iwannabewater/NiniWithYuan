"use strict";

// Protagonist presentation: hem secondary motion and display atlas caches.

const assert = require("node:assert/strict");
const { recordingContext, callsNamed } = require("../helpers/canvas.js");
const Cloth = require("../../src/render/character-cloth.js");
const AtlasCache = require("../../src/render/atlas-cache.js");

// --- cloth ------------------------------------------------------------------------

{
  const cloth = Cloth.createCloth();
  for (let i = 0; i < 90; i += 1) Cloth.stepCloth(cloth, { vx: 300, vy: 0, onGround: true, speed: 300, time: i / 60 }, 1 / 60);
  assert.equal(cloth.offsets[0], 0, "the upper body stays rigid");
  const hem = cloth.offsets[Cloth.BANDS - 1];
  assert.ok(hem < -1.5, "running right, the hem trails to the left");
  for (let i = 1; i < Cloth.BANDS; i += 1) {
    assert.ok(Math.abs(cloth.offsets[i] - cloth.offsets[i - 1]) <= 1.6 + 1e-6, "neighbouring bands never shear apart");
  }
  // Stopping swings the hem back through centre.
  let crossed = false;
  for (let i = 0; i < 60; i += 1) {
    Cloth.stepCloth(cloth, { vx: 0, vy: 0, onGround: true, speed: 300, time: 0 }, 1 / 60);
    if (cloth.offsets[Cloth.BANDS - 1] > 0) crossed = true;
  }
  assert.ok(crossed, "a stop lets the hem swing past centre");
  Cloth.stepCloth(cloth, { vx: 300, still: true }, 1 / 60);
  assert.ok(cloth.offsets.every((value) => value === 0), "reduced motion holds the costume still");
}

{
  const cloth = Cloth.createCloth();
  const ctx = recordingContext();
  Cloth.drawBanded(ctx, {}, 0, 0, 100, 100, -20, -60, 40, 60, cloth, 1);
  const draws = callsNamed(ctx, "drawImage");
  assert.equal(draws.length, Cloth.BANDS, "one draw per band");
  const covered = draws.reduce((sum, call) => sum + call[9] - (call === draws.at(-1) ? 0 : 1), 0);
  assert.ok(Math.abs(covered - 60) < 1e-6, "bands tile the full frame height");
  for (const call of draws) assert.ok(call[3] + call[5] <= 100 + 1e-6, "band sources stay inside the frame");
}

// --- atlas baselines ------------------------------------------------------------------

{
  // Two 4x4 cells side by side; the first is painted to row 2, the second to row 3.
  const width = 8;
  const height = 4;
  const data = new Uint8ClampedArray(width * height * 4);
  const paint = (x, y) => { data[(y * width + x) * 4 + 3] = 255; };
  paint(1, 0); paint(1, 1); paint(1, 2);
  paint(5, 3);
  const canvas = { width, height, getContext: () => ({ getImageData: () => ({ data }) }) };
  const baselines = AtlasCache.measureBaselines(canvas, 4, 4);
  assert.deepEqual(Array.from(baselines), [0.75, 1], "each cell reports its lowest painted row");
  const unreadable = { width, height, getContext: () => ({ getImageData: () => { throw new Error("tainted"); } }) };
  assert.deepEqual(Array.from(AtlasCache.measureBaselines(unreadable, 4, 4)), [1, 1], "unreadable cells fall back to the cell edge");
}

assert.equal(AtlasCache.quantize(0.313), 0.32, "scales snap to shared cache steps");
assert.equal(AtlasCache.get(null, 0.3, "world1"), null, "no image, no cache");

console.log("render/character: hem motion, banded drawing, and atlas baselines passed");

// --- shipped baselines match the atlas paintings ---------------------------------
{
  const fs = require("node:fs");
  const { decodePng, cellBaselines } = require("../../scripts/png.js");
  for (const id of ["nini", "yuan"]) {
    const manifest = JSON.parse(fs.readFileSync(`assets/characters/${id}/atlas.json`, "utf8"));
    const image = decodePng(fs.readFileSync(`assets/characters/${id}/${manifest.image}`));
    assert.deepEqual(manifest.baselines, cellBaselines(image, manifest.frame.w, manifest.frame.h), `${id}: atlas.json baselines match the image (run node scripts/measure-atlas-baselines.js)`);
    assert.ok(manifest.baselines.every((value) => value > 0.5 && value <= 1), `${id}: every pose has feet in its lower half`);
  }
  const game = fs.readFileSync("src/game.js", "utf8");
  assert.match(game, /AtlasCache\?\.get\?\.\([^)]*atlas\?\.baselines\)/, "the runtime prefers shipped baselines over pixel reads");
  console.log("render/character: shipped baselines match the atlas paintings");
}
