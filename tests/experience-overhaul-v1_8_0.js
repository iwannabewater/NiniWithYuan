const assert = require("node:assert/strict");
const fs = require("node:fs");
const InputState = require("../src/core/input-state.js");
const Motion = require("../src/render/character-motion.js");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const game = fs.readFileSync("src/game.js", "utf8");
const hud = fs.readFileSync("src/render/hud.js", "utf8");
const storage = fs.readFileSync("src/core/storage.js", "utf8");
const capture = fs.readFileSync("scripts/capture-store-assets.js", "utf8");

assert.match(storage, /SAVE_SCHEMA_VERSION = 3/);
for (const setting of ["touchOpacity", "hudScale", "shake"]) {
  assert.ok(storage.includes(setting), `v1.8 settings should persist ${setting}`);
}

assert.equal(typeof InputState.createActionInputState, "function");
assert.ok(game.includes("actionInputs.direction()"), "movement should use unified latest-direction arbitration");
assert.ok(game.includes('btn.addEventListener("pointermove", move'), "the captured movement rail should support drag-to-switch input");
assert.ok(game.includes("syncOrientationGate"), "orientation changes should pass through an explicit focus and input boundary");
assert.ok(game.includes("orientationGated || !player"), "the orientation gate should freeze simulation");
assert.ok(game.includes("trapDialogFocus"), "all modal surfaces should share focus containment");
assert.ok(game.includes('btn.addEventListener("click"'), "semantic touch controls should accept synthesized activation");

assert.equal(typeof Motion.advanceAnimationState, "function");
assert.equal(typeof Motion.sampleAnimationFrame, "function");
assert.ok(game.includes("const simulationTime = sceneTime()"), "character motion should sample the simulation clock");
assert.ok(game.includes("presentation.cameraX, camera.x, renderAlpha"), "rendering should interpolate fixed-step camera samples");
assert.match(
  game,
  /const initialCamera = cameraTarget\(0\);[\s\S]*?syncPresentationState\(\);/,
  "level start should frame the player before the first rendered simulation step",
);
assert.ok(!game.includes("player.motionState"), "render presentation state must not leak into gameplay entities");
assert.ok(!game.includes("ctx.translate(snap(x)"), "sprite placement must preserve device-pixel interpolation");

for (const id of ["hudScaleRange", "touchOpacityRange", "shakeToggle"]) {
  assert.ok(html.includes(`id="${id}"`), `settings UI should expose ${id}`);
}
assert.match(html, /id="rotatePrompt"[\s\S]*role="dialog"[\s\S]*aria-describedby="rotatePromptText"/);
assert.match(html, /data-action="continue-portrait"/);
assert.match(html, /role="group" aria-label="生命 3 \/ 3"/);
assert.doesNotMatch(html, /user-scalable\s*=\s*no|maximum-scale\s*=\s*1/);

for (const marker of [
  "v1.8 experience composition boundary",
  "@media (max-width: 900px) and (pointer: fine)",
  "#shell.portrait-gated ~ .rotate-prompt",
  ".level-world-track",
  ".journey-route",
]) {
  assert.ok(css.includes(marker), `experience composition should include ${marker}`);
}
assert.match(css, /font-size: calc\(10px \* var\(--hud-scale\)\)/);
assert.doesNotMatch(css, /\.portrait-gated:has\(/, "orientation visibility must not depend on :has support");

assert.ok(hud.includes('group.className = "level-world-group"'));
assert.ok(hud.includes('state.textContent = locked ? "锁定 · 完成上一章后解锁"'));
assert.ok(hud.includes('route.setAttribute("role", "progressbar")'));
assert.ok(capture.includes("viewport: { width: 960, height: 540 }"), "landscape store captures should use a valid 16:9 viewport");
assert.ok(capture.includes("captureStable"), "store captures should reject changing consecutive frames");
assert.ok(capture.includes("png.colorType !== 2"), "store captures should reject PNG alpha channels");
assert.match(
  capture,
  /async function captureStable[\s\S]*?await normalizeCaptureState\(page\);[\s\S]*?const first = await page\.screenshot/,
  "every store capture should normalize cross-run state before its first frame",
);
assert.match(capture, /\.love-toast, \.love-heart, \.love-letter/);
assert.equal((capture.match(/\.screenshot\(/g) || []).length, 2, "screenshots must stay centralized in captureStable");
assert.ok(capture.includes("page.addInitScript"), "store captures should seed runtime randomness before navigation");
assert.ok(capture.includes("Store asset server exited before readiness"), "store capture should reject a conflicting local server");

console.log("experience-overhaul-v1.8.0: input, presentation, responsive gate, and atlas UI contracts passed");
