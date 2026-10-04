"use strict";

// Save schema, trial medals, chain scoring, and the astral record. These rules
// are pure functions of a sanitized save plus chapter metadata.

const assert = require("node:assert/strict");
const Progression = require("../../src/core/progression.js");
const Storage = require("../../src/core/storage.js");
const Chapters = require("../../src/data/chapters.js");

const levels = Chapters.buildChapters().slice(0, 15);

/* -- save schema 4 --------------------------------------------------------- */

assert.equal(Storage.SAVE_SCHEMA_VERSION, 4);
const levelIds = levels.map((level) => level.id);
const options = { levelCount: levels.length, levelIds, achievementIds: Progression.ACHIEVEMENT_IDS };

const migrated = Storage.sanitizeSave(
  { schemaVersion: 3, unlocked: 4, totalCoins: 90, bestTimes: { sakura: 30 }, levelStars: { sakura: 3 } },
  options
);
assert.equal(migrated.schemaVersion, 4);
assert.equal(migrated.unlocked, 4, "a schema 3 save keeps its unlocked chapters");
assert.deepEqual(migrated.marrow, {});
assert.deepEqual(migrated.wardens, {});
assert.deepEqual(migrated.clears, { nini: {}, yuan: {} });
assert.equal(migrated.assistUsed, false);
assert.deepEqual(migrated.settings.assist, {
  enabled: false,
  invulnerable: false,
  infiniteSkill: false,
  extraJump: false,
  speed: 100,
});

const tampered = Storage.sanitizeSave(
  {
    marrow: { sakura: 99, "<script>": 1, notachapter: 1 },
    wardens: { auroracitadel: true, sakura: 0 },
    flawless: { moonruin: 1 },
    achievements: { firstlight: 5, madeup: 1 },
    clears: { nini: { sakura: 1, notachapter: 1 }, yuan: "seven" },
    stats: { deaths: 12.9, stomps: -4, bestCombo: "18", wardenFlawless: 1, letters: 3 },
    assistUsed: "yes",
    settings: { assist: { enabled: 1, invulnerable: true, speed: 5 } },
  },
  options
);
assert.deepEqual(tampered.marrow, { sakura: 1 }, "flag records collapse to 1 and reject unknown chapter ids");
assert.deepEqual(tampered.wardens, { auroracitadel: 1 });
assert.deepEqual(tampered.achievements, { firstlight: 1 }, "unknown achievement ids are dropped");
assert.deepEqual(
  tampered.clears,
  { nini: { sakura: 1 }, yuan: {} },
  "per-character clears are unique chapter ids, so replaying one chapter cannot inflate a mastery total"
);
assert.equal(tampered.stats.deaths, 12);
assert.equal(tampered.stats.stomps, 0);
assert.equal(tampered.stats.bestCombo, 18);
assert.equal(tampered.assistUsed, false, "assistUsed only accepts a real boolean true");
assert.equal(tampered.settings.assist.enabled, false, "assist toggles only accept a real boolean true");
assert.equal(tampered.settings.assist.invulnerable, true);
assert.equal(tampered.settings.assist.speed, 60, "assist speed clamps into the supported range");

/* -- trial medals ---------------------------------------------------------- */

assert.equal(Progression.medalForTime(20, 20), Progression.MEDAL_STAR, "hitting par exactly earns the star seal");
assert.equal(Progression.medalForTime(20.01, 20), Progression.MEDAL_MOON);
assert.equal(Progression.medalForTime(25, 20), Progression.MEDAL_MOON);
assert.equal(Progression.medalForTime(25.01, 20), Progression.MEDAL_DEW);
assert.equal(Progression.medalForTime(32, 20), Progression.MEDAL_DEW);
assert.equal(Progression.medalForTime(32.01, 20), "");
assert.equal(Progression.medalForTime(0, 20), "");
assert.equal(Progression.medalForTime(10, 0), "");
assert.equal(Progression.medalForTime(Number.NaN, 20), "");
assert.equal(Progression.medalRank(Progression.MEDAL_STAR), 3);
assert.equal(Progression.medalRank(""), 0);
assert.equal(Progression.medalLabel(Progression.MEDAL_MOON), "月章");

/* -- chain scoring --------------------------------------------------------- */

assert.equal(Progression.comboMultiplier(0), 1);
assert.equal(Progression.comboMultiplier(1), 1);
assert.equal(Progression.comboMultiplier(3), 1);
assert.equal(Progression.comboMultiplier(4), 2);
assert.equal(Progression.comboMultiplier(13), 5);
assert.equal(Progression.comboMultiplier(999), 5, "the chain multiplier is capped");

let chain = { chain: 0, remaining: 0 };
chain = Progression.advanceCombo(chain, { window: Progression.COMBO_WINDOW });
assert.equal(chain.chain, 1);
chain = Progression.advanceCombo(chain, { window: Progression.COMBO_WINDOW });
assert.equal(chain.chain, 2, "a link inside the window extends the chain");
const lapsed = Progression.decayCombo({ chain: 2, remaining: 0.1 }, 0.5);
assert.equal(lapsed.chain, 0, "the chain drops once its window lapses");
assert.equal(lapsed.multiplier, 1);
assert.equal(Progression.advanceCombo(lapsed, {}).chain, 1, "a lapsed chain restarts at one");
assert.equal(Progression.comboReward(2, 1), 2);
assert.equal(Progression.comboReward(2, 4), 4);
assert.equal(Progression.comboReward(-5, 9), 0);

/* -- achievements ---------------------------------------------------------- */

assert.equal(Progression.ACHIEVEMENTS.length, 32);
assert.equal(new Set(Progression.ACHIEVEMENT_IDS).size, Progression.ACHIEVEMENTS.length, "achievement ids must be unique");
for (const entry of Progression.ACHIEVEMENTS) {
  assert.match(entry.id, /^[a-z0-9]+$/, `achievement id ${entry.id} must be storage-key safe`);
  assert.ok(entry.name && entry.desc, `achievement ${entry.id} needs display copy`);
  assert.ok(
    Progression.ACHIEVEMENT_GROUPS.some((group) => group.id === entry.group),
    `achievement ${entry.id} must belong to a declared group`
  );
}

const emptySave = Storage.sanitizeSave({}, options);
assert.deepEqual(Progression.evaluateAchievements(emptySave, levels), [], "a fresh save unlocks nothing");

// The catalog is a public pure API. Hostile or empty inputs must return nothing
// rather than throwing, and "complete every chapter" must never be satisfiable
// by an empty chapter list.
assert.deepEqual(Progression.evaluateAchievements(null, levels), [], "a null save unlocks nothing");
assert.deepEqual(Progression.evaluateAchievements({}, null), [], "an empty chapter list unlocks nothing");
assert.deepEqual(Progression.evaluateAchievements({}, []), [], "a zero-chapter catalog cannot complete itself");
assert.deepEqual(Progression.newlyUnlocked(null, null), []);
{
  const polluted = JSON.parse('{"marrow":{"__proto__":1},"achievements":{"constructor":1}}');
  Progression.buildProgressContext(polluted, levels);
  assert.equal(Object.prototype.polluted, undefined, "record maps must not reach Object.prototype");
  const sanitized = Storage.sanitizeSave(polluted, options);
  assert.deepEqual(Object.keys(sanitized.marrow), [], "prototype keys never survive sanitizing");
}

const firstClear = Storage.sanitizeSave(
  { bestTimes: { sakura: 18 }, levelStars: { sakura: 3 }, marrow: { sakura: 1 }, clears: { nini: { sakura: 1 } } },
  options
);
const unlocked = Progression.evaluateAchievements(firstClear, levels);
assert.ok(unlocked.includes("firstlight"));
assert.ok(unlocked.includes("marrow1"));
assert.ok(unlocked.includes("stars3"));
assert.ok(unlocked.includes("medal1"), "an 18s run beats the 20s par for chapter one");
assert.ok(unlocked.includes("swift"));
assert.ok(!unlocked.includes("world1"), "one chapter is not a world");
assert.ok(!unlocked.includes("marrow15"));

const recorded = { ...firstClear, achievements: { firstlight: 1 } };
assert.ok(!Progression.newlyUnlocked(recorded, levels).includes("firstlight"), "recorded achievements are not re-announced");

const world1 = Storage.sanitizeSave(
  {
    bestTimes: { sakura: 40, moonruin: 40, cloudsea: 60, crystalforge: 60, auroracitadel: 120 },
    wardens: { auroracitadel: 1 },
  },
  options
);
const world1Unlocked = Progression.evaluateAchievements(world1, levels);
assert.ok(world1Unlocked.includes("world1"));
assert.ok(world1Unlocked.includes("warden1"));
assert.ok(world1Unlocked.includes("soloroute"), "a world cleared without assist is the solo route");
assert.ok(!world1Unlocked.includes("world2"));

const assistedWorld1 = Storage.sanitizeSave({ ...world1, assistUsed: true }, options);
assert.ok(
  !Progression.evaluateAchievements(assistedWorld1, levels).includes("soloroute"),
  "any assist use in the file disqualifies the solo route"
);

const replayFarmed = Storage.sanitizeSave({ clears: { nini: { sakura: 1 } } }, options);
assert.equal(
  Progression.buildProgressContext(replayFarmed, levels).clears.nini,
  1,
  "clearing the same chapter repeatedly counts once"
);

const context = Progression.buildProgressContext(world1, levels);
assert.equal(context.worldClears.world1, 5);
assert.equal(context.worldTotals.world1, 5);
assert.equal(context.clearedCount, 5);
assert.equal(context.fastestClear, 40);

console.log("unit/progression: schema 4 migration, tamper recovery, medals, chain scoring, and achievements passed");
