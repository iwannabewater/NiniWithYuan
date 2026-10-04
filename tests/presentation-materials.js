const assert = require("node:assert/strict");
const fs = require("node:fs");

const CharacterEffects = require("../src/render/character-effects.js");
const CreatureMaterial = require("../src/render/creature-material.js");
const WardenArt = require("../src/render/warden.js");

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
    "arc", "ellipse", "fill", "stroke", "fillRect", "strokeRect", "translate", "rotate",
    "scale", "setLineDash", "drawImage", "fillText",
  ]) ctx[name] = method(name);
  return ctx;
}

const landingStart = CharacterEffects.resolveEffectPlan({ animation: "land_right", elapsed: 0 });
const landingRecovery = CharacterEffects.resolveEffectPlan({ animation: "land_right", elapsed: 0.16 });
assert.ok(landingStart.contact > landingRecovery.contact, "a landing contact should decay into recovery");

const niniSkill = CharacterEffects.resolveEffectPlan({ id: "nini", animation: "skill_left", elapsed: 0.04 });
const yuanSkill = CharacterEffects.resolveEffectPlan({ id: "yuan", animation: "skill_right", elapsed: 0.04 });
const jumpStart = CharacterEffects.resolveEffectPlan({ animation: "jump_right", elapsed: 0 });
const jumpRecovery = CharacterEffects.resolveEffectPlan({ animation: "jump_right", elapsed: 0.18 });
const stillJump = CharacterEffects.resolveEffectPlan({ animation: "jump_right", elapsed: 0, reducedMotion: true });
assert.ok(niniSkill.orbit > 0 && niniSkill.slash === 0, "Nini should carry the star-dial orbit language");
assert.ok(yuanSkill.slash > 0 && yuanSkill.orbit === 0, "Yuan should carry the gui-sword cut language");
assert.ok(jumpStart.soak > jumpRecovery.soak, "jump presentation should keep a short rising settle envelope");
assert.equal(stillJump.soak, 0, "reduced motion should not add extra movement feedback to a jump start");
assert.equal(yuanSkill.trailCount, 2, "Yuan's dash should keep two readable echoes without stacking a third trail");
assert.ok(
  yuanSkill.trailSpacing > niniSkill.trailSpacing && yuanSkill.trailAlpha > niniSkill.trailAlpha,
  "Yuan's short dash should retain a stronger, wider trail than Nini's orbit",
);
assert.equal(
  CharacterEffects.resolveEffectPlan({ id: "yuan", animation: "skill_right", reducedMotion: true }).trailCount,
  0,
  "reduced motion must retain the key pose while removing sprite echoes",
);

const effectsContext = mockContext();
CharacterEffects.drawUnderlay(effectsContext, {
  id: "nini", plan: landingStart, width: 90, height: 220, time: 1, direction: 1,
});
CharacterEffects.drawAfterimages(effectsContext, {}, { sx: 0, sy: 0, sw: 320, sh: 320 }, {
  id: "yuan", plan: yuanSkill, width: 90, height: 220, direction: -1, frameScaleX: 1,
});
CharacterEffects.drawOverlay(effectsContext, {
  id: "nini",
  plan: CharacterEffects.resolveEffectPlan({ id: "nini", animation: "shoot_right", elapsed: 0.02 }),
  width: 90,
  height: 220,
  direction: 1,
});
assert.ok(effectsContext.calls.some(([name]) => name === "drawImage"), "action trails should reuse the crisp authored frame");
assert.ok(effectsContext.calls.some(([name]) => name === "strokeRect"), "a shot release should carry a visible star seal");

const { recordingContext } = require("./helpers/canvas.js");
const named = (ctx, name) => ctx.calls.filter((call) => call[0] === name);

const baseEnemy = { x: 30, y: 80, w: 38, h: 34, baseX: 30, baseY: 80, vx: 90, phase: 0.4, hitTimer: 0 };
assert.ok(CreatureMaterial.resolveCreaturePose({ ...baseEnemy, type: "slime" }).scale >= 1.36);
assert.ok(CreatureMaterial.resolveCreaturePose({ ...baseEnemy, type: "wisp" }).scale >= 1.28);
assert.equal(
  CreatureMaterial.resolveCreaturePose({ ...baseEnemy, type: "slime" }, { reducedMotion: true }).gait,
  0,
  "reduced motion should stop decorative creature gait",
);
assert.deepEqual(
  CreatureMaterial.wispShadowGeometry({ ...baseEnemy, type: "wisp", y: baseEnemy.baseY - 6 }, { floatGap: 24 }, { scale: 1.28 }),
  CreatureMaterial.wispShadowGeometry({ ...baseEnemy, type: "wisp", y: baseEnemy.baseY + 6 }, { floatGap: 24 }, { scale: 1.28 }),
  "wisp presentation hover must not move its authored ground shadow",
);
assert.deepEqual(
  { slime: CreatureMaterial.NAMES.slime, ember: CreatureMaterial.NAMES.ember, wisp: CreatureMaterial.NAMES.wisp },
  { slime: "玉蟾", ember: "祸斗", wisp: "灯魅" },
  "creatures carry their bestiary names",
);
for (const type of ["slime", "ember", "wisp"]) {
  const calm = recordingContext();
  const hit = recordingContext();
  CreatureMaterial.drawEnemy(calm, { ...baseEnemy, type }, { hitDuration: 0.18, floatGap: 24, hoverRange: 6, focus: 0.8, support: { x: 0, y: 114, w: 180 } });
  CreatureMaterial.drawEnemy(hit, { ...baseEnemy, type, hitTimer: 0.15 }, { hitDuration: 0.18, floatGap: 24, hoverRange: 6, focus: 0.8, support: { x: 0, y: 114, w: 180 } });
  assert.ok(named(calm, "scale").some(([, x, y]) => Math.abs(x) >= 1.28 && Math.abs(y) >= 1.28), `${type} clears the compact-viewport visual scale floor without changing hitboxes`);
  assert.equal(named(calm, "save").length, named(calm, "restore").length, `${type} restores every canvas state it saves`);
  assert.ok(named(hit, "fill").some((call) => call.at(-1).fillStyle === "#fff7d1"), `${type} washes pale on a landed hit`);
  assert.ok(named(calm, "fill").length + named(calm, "fillRect").length >= 8, `${type} is a layered painting, not a token`);
}

const wardenShapes = new Set();
for (const palette of ["aurora", "core", "tide"]) {
  const closed = recordingContext();
  const open = recordingContext();
  const options = { time: 1, healthRatio: 0.3, sigil: "烛", facing: -1 };
  WardenArt.drawWarden(closed, { x: 20, y: 30, w: 104, h: 96, palette }, { ...options, phase: "telegraph", telegraph: 0.8, attack: "sweep" });
  WardenArt.drawWarden(open, { x: 20, y: 30, w: 104, h: 96, palette }, { ...options, phase: "recover", open: true });
  assert.ok(named(open, "stroke").length > named(closed, "stroke").length, `${palette}: the open weak point radiates`);
  assert.ok(named(closed, "fillText").some((call) => call[1] === "烛"), `${palette}: the warden carries its cinnabar seal`);
  assert.ok(named(closed, "set").some(([, key, value]) => key === "strokeStyle" && value === "#c96978"), `${palette}: a sweep telegraphs in rose`);
  wardenShapes.add(named(closed, "fill").length);
}
assert.ok(wardenShapes.size >= 2, "each warden owns a distinct mythic silhouette");

const warderContext = recordingContext();
WardenArt.drawWarder(warderContext, { x: 100, y: 100, w: 34, h: 34, baseX: 100, patrol: 40, vx: 70 }, { time: 1 });
const patrolEndIndex = warderContext.calls.findIndex(([name, x]) => name === "lineTo" && x === 157);
const creatureScaleIndex = warderContext.calls.findIndex(([name, x]) => name === "scale" && x === 1.28);
assert.ok(
  patrolEndIndex >= 0 && creatureScaleIndex > patrolEndIndex,
  "the warder patrol rail must draw in world coordinates before presentation scaling",
);

for (const path of [
  "src/render/character-effects.js",
  "src/render/creature-material.js",
  "src/render/terrain.js",
  "src/render/props.js",
  "src/render/effects.js",
  "src/render/warden.js",
]) {
  const source = fs.readFileSync(path, "utf8").replace(/typeof window/g, "");
  assert.doesNotMatch(source, /document\.|window\./, `${path} must remain stateless and DOM-free`);
}

const game = fs.readFileSync("src/game.js", "utf8");
assert.match(game, /NiniYuanCharacterEffects/, "the runtime should load character action effects through a render boundary");
assert.match(game, /NiniYuanCreatureMaterial/, "the runtime should load creature art through a render boundary");
assert.match(
  game,
  /const artifactTime = options\.reducedMotion === true \? 0 : time;[\s\S]*?ctx\.rotate\(\(artifactTime \/ 0\.9\)/,
  "reduced motion must freeze the star-dial artifact without removing it",
);
assert.doesNotMatch(game, /function drawGroundEnemy|function drawWispEnemy/, "creature drawing should not grow the gameplay hotspot again");

console.log("presentation-materials: action envelopes, mythic creatures, and guardian silhouettes passed");
