"use strict";

// Backdrop compositor and camera contracts. The backdrop is painted once per
// chapter and viewport; each frame must only blit, at whole device pixels and
// at 1:1 scale, so software and low-end GPU raster stay cheap.

const assert = require("node:assert/strict");
const { RecordingPath, recordingContext, recordingCanvas, callsNamed } = require("../helpers/canvas.js");

globalThis.Path2D = RecordingPath;

const Art = require("../../src/render/art.js");
const Camera = require("../../src/render/camera.js");
const Scenery = require("../../src/render/scenery.js");
const Chapters = require("../../src/data/chapters.js");

Art.setCanvasFactory(recordingCanvas);

const views = [
  { w: 1280, h: 720, dpr: 1 },
  { w: 844, h: 390, dpr: 2 },
  { w: 1366, h: 768, dpr: 1.25 },
];
const isWhole = (value) => Math.abs(value - Math.round(value)) < 1e-6;

const ids = [["menu", "world1"], ...Chapters.buildChapters().map((chapter) => [chapter.id, chapter.world.id])];
for (const view of views) {
  for (const [id, worldId] of ids) {
    const spec = Scenery.sceneFor(id, worldId);
    const scene = Scenery.composeScene(spec, view, { fx: true });
    const label = `${id} @ ${view.w}x${view.h}x${view.dpr}`;
    assert.ok(scene.sky, `${label}: the sky is baked`);
    assert.equal(scene.sky.width, Math.ceil(view.w * view.dpr), `${label}: the sky is device resolution`);
    assert.ok(isWhole(scene.tileW * view.dpr), `${label}: tiles are whole device pixels wide`);
    assert.equal(scene.layers.length, spec.ranges.length, `${label}: every range layer is composed`);
    for (const layer of scene.layers) {
      assert.ok(layer.cropTop >= 0 && layer.cropTop < view.h, `${label}: layers are cropped to their painted band`);
      assert.ok(isWhole(layer.bandH * view.dpr), `${label}: bands are whole device pixels tall`);
      assert.ok(layer.bandH < view.h || layer.cropTop === 0, `${label}: band height follows the crop`);
    }

    const ctx = recordingContext();
    const frame = { view, camX: 1234.37, camY: 211.9, zoom: Camera.resolveZoom(view), refCamY: 260, time: 3.3, dt: 1 / 60, reducedMotion: false, fx: true };
    Scenery.drawScene(ctx, scene, frame);
    const blits = callsNamed(ctx, "drawImage");
    assert.equal(blits[0][1], scene.sky, `${label}: the sky is the first draw`);
    assert.deepEqual(blits[0].slice(2, 6), [0, 0, view.w, view.h], `${label}: the sky blits 1:1`);
    const tiles = blits.filter((call) => scene.layers.some((layer) => layer.canvas === call[1]));
    assert.ok(tiles.length >= scene.layers.length, `${label}: every layer is drawn`);
    for (const call of tiles) {
      const layer = scene.layers.find((item) => item.canvas === call[1]);
      assert.ok(isWhole(call[2] * view.dpr) && isWhole(call[3] * view.dpr), `${label}: tiles land on whole device pixels`);
      assert.equal(call[4], scene.tileW, `${label}: tiles draw at their native width`);
      assert.equal(call[5], layer.bandH, `${label}: tiles draw at their native height`);
    }
    assert.equal(callsNamed(ctx, "createLinearGradient").length + callsNamed(ctx, "createRadialGradient").length, 0, `${label}: no gradients are built per frame`);
  }
}

{
  const spec = Scenery.sceneFor("sakura", "world1");
  const a = Scenery.composeScene(spec, views[0], {});
  const b = Scenery.composeScene(spec, views[0], {});
  assert.deepEqual(a.layers.map((layer) => layer.cropTop), b.layers.map((layer) => layer.cropTop), "composition is deterministic");
}

// --- camera ---------------------------------------------------------------------

for (const view of [{ w: 844, h: 390 }, { w: 1280, h: 720 }, { w: 1920, h: 1080 }, { w: 2560, h: 1080 }]) {
  const camera = Camera.configure(Camera.create(), view);
  assert.ok(camera.visibleH >= Camera.DESIGN_HEIGHT_SHORT - 1 && camera.visibleH <= Camera.DESIGN_HEIGHT_TALL + 1, `${view.w}x${view.h}: framing height is normalized`);
  assert.ok(camera.visibleW >= 720 - 1, `${view.w}x${view.h}: at least 720 world pixels are visible across`);
}
{
  const camera = Camera.configure(Camera.create(), { w: 1280, h: 720 });
  const { scale, quantum } = Camera.renderScale(camera, 2);
  assert.equal(scale, camera.zoom * 2);
  assert.ok(Math.abs(quantum * scale - 1) < 1e-12, "the render quantum is one device pixel in world units");

  const level = { width: 6000, height: 960 };
  const player = { x: 900, y: 600, w: 34, h: 58, onGround: true, vx: 0, vy: 0 };
  Camera.frameImmediately(camera, player, level);
  const feetScreen = (player.y + player.h - camera.y) / camera.visibleH;
  assert.ok(Math.abs(feetScreen - Camera.FEET_SCREEN_RATIO) < 1e-6, "level start frames the feet on the authored line");

  // An ordinary jump stays inside the dead zone: the anchor does not move.
  const anchor = camera.anchorY;
  Camera.step(camera, { ...player, y: player.y - 120, onGround: false }, level, 1 / 120);
  assert.equal(camera.anchorY, anchor, "a normal jump does not drag the view upward");
  Camera.step(camera, { ...player, y: player.y - camera.visibleH * 0.6, onGround: false }, level, 1 / 120);
  assert.ok(camera.anchorY < anchor, "a tall climb leaves the dead zone and is followed");

  const small = { width: 600, height: 400 };
  Camera.frameImmediately(camera, { ...player, x: 100, y: 200 }, small);
  assert.ok(camera.x < 0 && camera.y < 0, "a chapter smaller than the view is centred");
}

console.log("render/scenery: baked sky, cropped device-pixel tiles, and camera framing passed");
