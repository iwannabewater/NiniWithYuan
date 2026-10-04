const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/game.js", "utf8");

assert.ok(source.includes("ctx.imageSmoothingEnabled = true"), "Canvas should keep art smoothing enabled");
assert.ok(source.includes('ctx.imageSmoothingQuality = "low"'), "Backdrops blit 1:1, so the default filter stays cheap");
assert.ok(source.includes('ctx.imageSmoothingQuality = "high"'), "Bitmap character frames still request high-quality filtering");
assert.ok(source.includes("presentation.cameraX, camera.x, renderAlpha"), "Camera x should interpolate across fixed-step samples");
assert.ok(source.includes("presentation.cameraY, camera.y, renderAlpha"), "Camera y should interpolate across fixed-step samples");
assert.ok(source.includes("const { scale, quantum } = Camera.renderScale(camera, view.dpr)"), "Presentation coordinates should align to physical-pixel quanta");
assert.ok(source.includes('new Set(["jump", "skill", "shoot"])'), "Touch haptics should be scoped to action buttons");
assert.ok(source.includes("navigator.vibrate(duration)"), "Touch action buttons should request haptic feedback when available");

console.log("render-touch-polish: camera snapping and touch haptics passed");
