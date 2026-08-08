const assert = require("node:assert/strict");
const fs = require("node:fs");

const CharacterEffects = require("../src/render/character-effects.js");
const CreatureMaterial = require("../src/render/creature-material.js");
const Playfield = require("../src/render/playfield-material.js");
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
assert.ok(niniSkill.orbit > 0 && niniSkill.slash === 0, "Nini should carry the star-dial orbit language");
assert.ok(yuanSkill.slash > 0 && yuanSkill.orbit === 0, "Yuan should carry the gui-sword cut language");
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

assert.equal(Playfield.sceneryKind("world1"), "star-bloom");
assert.equal(Playfield.sceneryKind("world2"), "gate-beacon");
assert.equal(Playfield.sceneryKind("world3"), "mirror-reed");
const sceneryContext = mockContext();
for (const [index, worldId] of ["world1", "world2", "world3"].entries()) {
  Playfield.drawScenery(sceneryContext, {
    id: `chapter-${index}`,
    world: { id: worldId },
    platforms: Array.from({ length: 8 }, (_, platformIndex) => ({
      x: platformIndex * 150,
      y: 260,
      w: 132,
      h: 48,
      type: "ground",
    })),
  }, { time: 1.2, reducedMotion: false, fx: true });
}
assert.ok(sceneryContext.calls.filter(([name]) => name === "quadraticCurveTo").length >= 3, "world props should author curved organic or silk details");
assert.ok(sceneryContext.calls.filter(([name]) => name === "strokeRect").length >= 1, "the mirror world should carry faceted props");

const baseEnemy = { x: 30, y: 80, w: 38, h: 34, baseX: 30, baseY: 80, vx: 90, phase: 0.4, hitTimer: 0 };
assert.ok(CreatureMaterial.resolveCreaturePose({ ...baseEnemy, type: "slime" }).scale >= 1.36);
assert.ok(CreatureMaterial.resolveCreaturePose({ ...baseEnemy, type: "wisp" }).scale >= 1.28);
assert.equal(
  CreatureMaterial.resolveCreaturePose({ ...baseEnemy, type: "slime" }, { reducedMotion: true }).gait,
  0,
  "reduced motion should stop decorative creature gait",
);
const raisedWispShadow = CreatureMaterial.wispShadowGeometry(
  { ...baseEnemy, type: "wisp", y: baseEnemy.baseY - 6 },
  { floatGap: 24 },
  { scale: 1.28 },
);
const loweredWispShadow = CreatureMaterial.wispShadowGeometry(
  { ...baseEnemy, type: "wisp", y: baseEnemy.baseY + 6 },
  { floatGap: 24 },
  { scale: 1.28 },
);
assert.deepEqual(
  raisedWispShadow,
  loweredWispShadow,
  "wisp presentation hover must not move its authored ground shadow",
);
const creatureContext = mockContext();
for (const type of ["slime", "ember", "wisp"]) {
  CreatureMaterial.drawEnemy(creatureContext, { ...baseEnemy, type }, {
    hitDuration: 0.18,
    floatGap: 24,
    hoverRange: 6,
    focus: 0.8,
    support: { x: 0, y: 114, w: 180 },
  });
}
assert.ok(
  creatureContext.calls.some(([name, x, y]) => name === "scale" && x >= 1.28 && y >= 1.28),
  "creature silhouettes should clear the compact-viewport visual scale floor without changing hitboxes",
);
assert.ok(creatureContext.calls.filter(([name]) => name === "ellipse").length >= 18, "creatures should carry layered silhouettes, eyes, and shadows");

const wardenContext = mockContext();
for (const [palette, phase, attack] of [
  ["aurora", "telegraph", "volley"],
  ["core", "recover", "sweep"],
  ["tide", "recover", "rain"],
]) {
  WardenArt.drawWarden(wardenContext, { x: 20, y: 30, w: 104, h: 96, palette }, {
    time: 1,
    telegraph: phase === "telegraph" ? 0.8 : 0,
    phase,
    attack,
    open: phase === "recover",
    healthRatio: 0.3,
    sigil: "星",
  });
}
assert.ok(wardenContext.calls.filter(([name]) => name === "strokeRect").length >= 4, "the core guardian should own a squared gate silhouette");
assert.ok(wardenContext.calls.filter(([name]) => name === "arc").length >= 10, "open cores and tide crescents should expose readable rings");

const warderContext = mockContext();
WardenArt.drawWarder(warderContext, {
  x: 100, y: 100, w: 34, h: 34, baseX: 100, patrol: 40, vx: 70,
}, { time: 1 });
const patrolEndIndex = warderContext.calls.findIndex(([name, x]) => name === "lineTo" && x === 157);
const creatureScaleIndex = warderContext.calls.findIndex(([name, x]) => name === "scale" && x === 1.28);
assert.ok(
  patrolEndIndex >= 0 && creatureScaleIndex > patrolEndIndex,
  "the warder patrol rail must draw in world coordinates before presentation scaling",
);

for (const path of [
  "src/render/character-effects.js",
  "src/render/creature-material.js",
  "src/render/playfield-material.js",
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

console.log("presentation-materials: action envelopes, world props, creatures, and guardian silhouettes passed");
