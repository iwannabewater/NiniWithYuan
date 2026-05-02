const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/game.js", "utf8");

assert.ok(source.includes("ctx.imageSmoothingEnabled = true"), "Canvas should keep art smoothing enabled");
assert.ok(source.includes('ctx.imageSmoothingQuality = "high"'), "Canvas should request high-quality image smoothing");
assert.ok(source.includes("const camX = snap(camera.x)"), "Camera x should be snapped before world rendering");
assert.ok(source.includes("const camY = snap(camera.y)"), "Camera y should be snapped before world rendering");
assert.ok(source.includes('new Set(["jump", "skill", "shoot"])'), "Touch haptics should be scoped to action buttons");
assert.ok(source.includes("navigator.vibrate(duration)"), "Touch action buttons should request haptic feedback when available");

console.log("render-touch-polish: camera snapping and touch haptics passed");
