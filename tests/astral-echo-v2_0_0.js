const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const Progression = require("../src/core/progression.js");
const Storage = require("../src/core/storage.js");
const WardenArt = require("../src/render/warden.js");

const game = fs.readFileSync("src/game.js", "utf8");
const hud = fs.readFileSync("src/render/hud.js", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const html = fs.readFileSync("index.html", "utf8");
const sw = fs.readFileSync("service-worker.js", "utf8");
const audio = fs.readFileSync("src/core/audio.js", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const lock = JSON.parse(fs.readFileSync("package-lock.json", "utf8"));
const androidManifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");

const buildStart = game.indexOf("  function buildLevels()");
const buildEnd = game.indexOf("  function resize()");
assert.ok(buildStart >= 0 && buildEnd > buildStart, "buildLevels must stay extractable");
const levels = new Function(
  `const TILE = 48; const ENEMY_WIDTH = 38; const ENEMY_HEIGHT = 34; const WISP_FLOAT_GAP = 24;` +
    ` const WISP_HOVER_RANGE = 6; const MARROW_SIZE = 30; const SENTRY_COOLDOWN = 2.1;` +
    ` ${game.slice(buildStart, buildEnd)}; return buildLevels();`
)();

const TILE = 48;
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/* -- release metadata ------------------------------------------------------ */

assert.equal(pkg.version, "2.0.0");
assert.equal(lock.version, "2.0.0");
assert.match(sw, /nini-yuan-v2\.0\.0-astral-echo-r1/);
assert.match(androidManifest, /android:versionCode="21"/);
assert.match(androidManifest, /android:versionName="2\.0\.0"/);
assert.match(html, /星图 · v2\.0\.0/);
assert.ok(sw.includes("./src/core/progression.js"), "the offline cache must ship the progression module");
assert.ok(sw.includes("./src/render/warden.js"), "the offline cache must ship the warden renderer");
assert.ok(
  html.indexOf("src/core/progression.js") < html.indexOf("src/game.js"),
  "progression must load before the runtime reads it"
);
assert.ok(
  html.indexOf("src/render/warden.js") < html.indexOf("src/game.js"),
  "warden art must load before the runtime reads it"
);

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

assert.equal(Progression.ACHIEVEMENTS.length, 30);
assert.equal(new Set(Progression.ACHIEVEMENT_IDS).size, 30, "achievement ids must be unique");
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

/* -- chapter tuning: par, marrow, wardens, new hostiles -------------------- */

for (const level of levels) {
  assert.ok(Number.isFinite(level.par) && level.par > 0, `${level.id} must declare a trial par`);
  assert.ok(level.marrow, `${level.id} must hide one star marrow`);
  const marrow = level.marrow;
  assert.ok(
    marrow.x >= 0 && marrow.y >= 0 && marrow.x + marrow.w <= level.width && marrow.y + marrow.h <= level.height,
    `${level.id} marrow must sit inside the chapter bounds`
  );
  for (const platform of level.platforms) {
    assert.ok(!overlaps(marrow, platform), `${level.id} marrow must not be buried in a platform`);
  }
  for (const mover of level.moving) {
    const sweep = mover.axis === "y"
      ? { x: mover.x, y: mover.oy - mover.range, w: mover.w, h: mover.h + mover.range * 2 }
      : { x: mover.ox - mover.range, y: mover.y, w: mover.w + mover.range * 2, h: mover.h };
    assert.ok(!overlaps(marrow, sweep), `${level.id} marrow must stay clear of a moving platform sweep`);
  }
  for (const hazard of level.hazards) {
    assert.ok(!overlaps(marrow, hazard), `${level.id} marrow must not sit inside a hazard`);
  }

  assert.ok(Array.isArray(level.lanterns) && level.lanterns.length >= 2, `${level.id} needs respawn lanterns`);
  for (const lantern of level.lanterns) {
    const host = level.platforms.find(
      (p) => Math.abs(p.y - (lantern.y + lantern.h)) < 1 && lantern.x >= p.x && lantern.x + lantern.w <= p.x + p.w
    );
    assert.ok(host, `${level.id} lantern must stand on a platform`);
    for (const hazard of level.hazards) {
      assert.ok(!overlaps(lantern, hazard), `${level.id} lantern must not stand in a hazard`);
    }
  }
}

for (const level of levels) {
  for (const enemy of level.enemies) {
    if (enemy.type !== "sentry" && enemy.type !== "warder") continue;
    const host = level.platforms.find(
      (p) =>
        !p.phase &&
        Math.abs(p.y - (enemy.y + enemy.h)) < 3 &&
        enemy.x >= p.x &&
        enemy.x + enemy.w <= p.x + p.w
    );
    assert.ok(host, `${level.id} ${enemy.type} at ${enemy.x} must spawn on a platform`);
  }
}

const sentries = levels.flatMap((level) => level.enemies.filter((e) => e.type === "sentry"));
const warders = levels.flatMap((level) => level.enemies.filter((e) => e.type === "warder"));
assert.ok(sentries.length >= 5, "the sentry emplacement should appear across several chapters");
assert.ok(warders.length >= 5, "the shelled walker should appear across several chapters");
assert.ok(sentries.every((e) => e.cadence > 0 && e.alive === true));
assert.ok(warders.every((e) => e.patrol > 0 && e.alive === true));

const wardenLevels = levels.filter((level) => level.warden);
assert.equal(wardenLevels.length, 3, "each world finale is sealed by one warden");
assert.deepEqual(
  wardenLevels.map((level) => level.id),
  ["auroracitadel", "islandstarcore", "phasetidecourt"]
);
for (const level of wardenLevels) {
  const warden = level.warden;
  assert.ok(warden.health >= 12, `${level.id} warden needs a real health pool`);
  assert.ok(warden.arena.w >= TILE * 12, `${level.id} arena must be wide enough to fight in`);
  assert.ok(warden.arena.x + warden.arena.w <= level.width, `${level.id} arena must stay inside the chapter`);
  assert.ok(
    level.goal.x >= warden.arena.x && level.goal.x + level.goal.w <= warden.arena.x + warden.arena.w,
    `${level.id} goal must sit inside the sealed arena`
  );
  assert.ok(warden.home.y + 96 < warden.ground, `${level.id} warden must start above its arena floor`);
  // The seal clamps the player at the arena's left edge, so that edge has to sit
  // on solid ground; otherwise the seal could hold a player over a pit.
  const floor = level.platforms.find(
    (p) =>
      !p.phase &&
      Math.abs(p.y - warden.ground) < 1 &&
      p.x <= warden.arena.x &&
      p.x + p.w >= warden.arena.x + warden.arena.w
  );
  assert.ok(floor, `${level.id} arena must span one continuous platform at its ground line`);
  assert.equal(warden.stages.length, 3, "wardens escalate through three stages");
  assert.ok(warden.stages[2].cadence < warden.stages[0].cadence, "later stages must attack more often");
  assert.ok(warden.stages[2].patterns.length > warden.stages[0].patterns.length, "later stages widen the attack pool");
}

/* -- runtime contracts ----------------------------------------------------- */

assert.ok(game.includes("function updateWarden("), "the runtime owns warden simulation");
assert.ok(game.includes("function holdInsideArena("), "an awake warden must seal its arena edge");
assert.ok(game.includes("function goalIsSealed("), "the goal must be gated behind the guardian");
assert.match(
  game,
  /reachedGoal: !player\.completed && !goalIsSealed\(\)/,
  "completion must check the seal before the goal rect"
);
assert.ok(game.includes("function wardenIsOpen("), "the guardian needs a punishable recovery window");
assert.ok(game.includes("function lightLanterns("), "checkpoints must be reachable from the update path");
assert.match(game, /if \(player\.y > activeLevel\.height \+ 260\) hurt\(1, true\)/, "a fall costs one heart, not the run");
assert.ok(game.includes("function assistTimeScale("), "assist owns the delivered frame, not the fixed step");
assert.ok(game.includes("function recordsAreRanked("), "ranked records must be a single explicit rule");
assert.match(
  game,
  /const newRecord = ranked && \(!previousBest \|\| player\.elapsed < previousBest\)/,
  "assisted runs must not write best times"
);
assert.ok(
  !/player\.collectedValue \+= .*combo/.test(game),
  "the chain must never inflate the collection rating"
);
assert.match(
  game,
  /player\.collectedValue \+= amount;/,
  "collection rating still reads the authored pickup value"
);
assert.ok(game.includes("Progression.newlyUnlocked(save, levels)"), "completion must record newly earned achievements");
assert.ok(game.includes("function enemyResistsProjectiles("), "the shelled walker must deflect projectiles");
assert.match(game, /assistOn\("infiniteSkill"\) \? 0 :/, "assist skill relief goes through the cooldown, not the physics");
assert.ok(game.includes("function airJumpBudget("), "the assist bonus jump must flow through one budget helper");

// A chapter must play identically on a phone and a wide desktop, so entity
// simulation reads world-space constants only. Camera framing may read `view`.
// This asserts on the source tree because the failure is silent at runtime: it
// only shows up as the same chapter behaving differently on another screen.
for (const fnName of [
  "updateSentry",
  "updateEnemies",
  "updateProjectiles",
  "updatePickups",
  "updateWarden",
  "updateHostileBolts",
  "updatePlayer",
  "updateMoving",
]) {
  const start = game.indexOf(`  function ${fnName}(`);
  assert.ok(start > 0, `${fnName} should exist`);
  const end = game.indexOf("\n  }\n", start);
  const body = game.slice(start, end);
  assert.doesNotMatch(
    body,
    /view\.(w|h|dpr)\b/,
    `${fnName} must not scale gameplay with the viewport; use a world-space constant`
  );
}
assert.ok(game.includes("PROJECTILE_CULL_RADIUS"), "projectile culling must use a world-space radius");

/* -- interface surfaces ---------------------------------------------------- */

for (const id of [
  "recordScreen",
  "recordSummary",
  "recordGroups",
  "modalReport",
  "wardenBar",
  "wardenFill",
  "hudChain",
  "hudChainMult",
  "assistToggle",
  "assistInvulnToggle",
  "assistSkillToggle",
  "assistJumpToggle",
  "assistSpeedRange",
]) {
  assert.ok(html.includes(`id="${id}"`), `index.html should expose #${id}`);
}
assert.ok(html.includes('data-action="record"'), "the menu must reach the record screen");
assert.match(html, /id="wardenTrack"[^>]*role="progressbar"/, "the warden bar must expose progress semantics");

for (const marker of [
  "v2.0.0 Astral Echo composition boundary",
  ".record-item.unlocked",
  ".medal-badge.medal-star",
  ".marrow-badge.found",
  ".warden-badge.cleared",
  ".hud-chain-mult",
  ".warden-bar-track",
  ".report-mark.assist",
  ".settings-assist.assist-on",
  ".level-footer",
]) {
  assert.ok(css.includes(marker), `styles.css should define ${marker}`);
}
assert.doesNotMatch(css, /transition:\s*all\b/, "no blanket transitions");
assert.doesNotMatch(css, /backdrop-filter\s*:/, "no backdrop-filter on low-power devices");

for (const fn of ["renderRecordScreen", "renderOutcomeReport", "clearOutcomeReport"]) {
  assert.equal(typeof require("../src/render/hud.js")[fn], "function", `hud should export ${fn}`);
}
assert.ok(hud.includes("level-marks"), "chapter cards carry the new marks");
assert.ok(hud.includes("MEDAL_GLYPH_EMPTY"), "an unearned medal keeps its own glyph rather than a dash");

for (const fn of ["drawWarden", "drawSentry", "drawWarder", "drawMarrow", "drawLantern", "drawArenaSeal", "drawHostileBolt"]) {
  assert.equal(typeof WardenArt[fn], "function", `warden art should export ${fn}`);
}
assert.ok(!/document\.|window\./.test(fs.readFileSync("src/render/warden.js", "utf8").replace(/typeof window/g, "")),
  "warden art must stay a stateless canvas helper");

for (const cueName of ["warden_wake", "warden_sweep", "warden_fall", "sentry_fire", "deflect", "combo_up", "marrow", "lantern"]) {
  assert.ok(audio.includes(`${cueName}:`), `the cue table should define ${cueName}`);
}

/* -- browser-style module exports ------------------------------------------ */

{
  const browserContext = { window: {} };
  vm.runInNewContext(fs.readFileSync("src/core/progression.js", "utf8"), browserContext);
  assert.equal(typeof browserContext.window.NiniProgression.medalForTime, "function");
  const artContext = { window: {} };
  vm.runInNewContext(fs.readFileSync("src/render/warden.js", "utf8"), artContext);
  assert.equal(typeof artContext.window.NiniYuanWarden.drawWarden, "function");
}

console.log("astral-echo-v2.0.0: schema 4, medals, chain scoring, achievements, wardens, checkpoints, and UI contracts passed");
