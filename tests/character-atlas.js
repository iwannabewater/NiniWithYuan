const assert = require("node:assert/strict");
const fs = require("node:fs");

for (const id of ["nini", "yuan"]) {
  const path = `assets/characters/${id}/atlas.json`;
  const atlas = JSON.parse(fs.readFileSync(path, "utf8"));
  assert.equal(typeof atlas.image, "string");
  assert.deepEqual(Object.keys(atlas.animations).sort(), ["fall", "hurt", "idle", "jump", "run", "skill"]);
  assert.equal(Number.isFinite(atlas.frame.w), true);
  assert.equal(Number.isFinite(atlas.frame.h), true);
  for (const [name, anim] of Object.entries(atlas.animations)) {
    assert.equal(Array.isArray(anim.frames), true, `${id}.${name} frames missing`);
    assert.equal(anim.frames.length > 0, true, `${id}.${name} frames empty`);
    assert.equal(Number.isFinite(anim.fps), true, `${id}.${name} fps invalid`);
  }
}

console.log("character-atlas: placeholder atlas schemas passed");
