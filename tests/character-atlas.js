const assert = require("node:assert/strict");
const fs = require("node:fs");

for (const id of ["nini", "yuan"]) {
  const path = `assets/characters/${id}/atlas.json`;
  const atlas = JSON.parse(fs.readFileSync(path, "utf8"));
  assert.equal(typeof atlas.image, "string");
  assert.deepEqual(Object.keys(atlas.animations).sort(), [
    "fall",
    "hurt_left",
    "hurt_right",
    "idle",
    "jump_left",
    "jump_right",
    "land_left",
    "land_right",
    "run",
    "shoot_left",
    "shoot_right",
    "skill_left",
    "skill_right",
    "turn_left",
    "turn_right",
  ]);
  assert.equal(Number.isFinite(atlas.frame.w), true);
  assert.equal(Number.isFinite(atlas.frame.h), true);
  for (const [name, anim] of Object.entries(atlas.animations)) {
    assert.equal(Array.isArray(anim.frames), true, `${id}.${name} frames missing`);
    assert.equal(anim.frames.length > 0, true, `${id}.${name} frames empty`);
    assert.equal(Number.isFinite(anim.fps), true, `${id}.${name} fps invalid`);
    assert.equal(anim.mirror === undefined || typeof anim.mirror === "boolean", true, `${id}.${name} mirror flag invalid`);
  }
  if (atlas.frame.w > 1 && atlas.frame.h > 1) {
    const imagePath = `assets/characters/${id}/${atlas.image}`;
    assert.ok(fs.existsSync(imagePath), `${id} production atlas image missing`);
    const png = fs.readFileSync(imagePath);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    const frameCapacity = Math.floor(width / atlas.frame.w) * Math.floor(height / atlas.frame.h);
    const highestFrame = Math.max(...Object.values(atlas.animations).flatMap((anim) => anim.frames));
    assert.ok(highestFrame < frameCapacity, `${id} frame ${highestFrame} exceeds atlas capacity ${frameCapacity}`);
  }
  if (id === "yuan") {
    assert.deepEqual(atlas.animations.turn_left.frames, atlas.animations.turn_right.frames, "Yuan turn pair should share the clean authored source pose");
    assert.equal(atlas.animations.turn_left.mirror, true, "Yuan left turn should mirror the clean right-facing source pose");
    assert.deepEqual(atlas.animations.skill_left.frames, atlas.animations.skill_right.frames, "Yuan skill pair should avoid the contaminated source cell");
    assert.equal(atlas.animations.skill_left.mirror, true, "Yuan left skill should mirror the clean right-facing source pose");
    assert.equal(atlas.animations.skill_left.frames.includes(11), false, "Yuan skill animations must not reference the contaminated frame 11");
  }
}

console.log("character-atlas: production atlas schemas passed");
