const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const rules = require("../src/core/game-rules");
const gameSource = fs.readFileSync("src/game.js", "utf8");

assert.equal(globalThis.NiniRules, rules, "Node and browser-style exports should expose the same API");
{
  const browserContext = { window: {} };
  vm.runInNewContext(fs.readFileSync("src/core/game-rules.js", "utf8"), browserContext);
  assert.equal(typeof browserContext.window.NiniRules.calculateStarRating, "function");
}
assert.equal(rules.BASE_AMMO_CAP, 14);
assert.equal(rules.RESERVE_AMMO_CAP, 24);

assert.equal(rules.calculateStarRating(83, 100), 3);
assert.equal(rules.calculateStarRating(82, 100), 2);
assert.equal(rules.calculateStarRating(53, 100), 2);
assert.equal(rules.calculateStarRating(52, 100), 1);
assert.equal(rules.calculateStarRating(200, 100), 3, "Collection values above the level total must be clamped");
assert.equal(rules.calculateStarRating(-10, 100), 1);
assert.equal(rules.calculateStarRating(Number.NaN, 100), 1);
assert.equal(rules.calculateStarRating(100, 0), 1, "Invalid level totals must not award free stars");
assert.equal(rules.calculateStarRating(100, Number.POSITIVE_INFINITY), 1);
assert.equal(rules.calculateStarRating(Symbol("invalid"), 100), 1);

assert.equal(rules.clampAmmo(-5), 0);
assert.equal(rules.clampAmmo(12.9), 12);
assert.equal(rules.clampAmmo(99), 24);
assert.equal(rules.clampAmmo(99, rules.BASE_AMMO_CAP), 14);
assert.equal(rules.clampAmmo(Number.NaN), 0);

assert.equal(rules.resolveTerminalOutcome({ isDead: true, reachedGoal: true }), rules.OUTCOME_DEATH);
assert.equal(rules.resolveTerminalOutcome({ isDead: false, reachedGoal: true }), rules.OUTCOME_COMPLETE);
assert.equal(rules.resolveTerminalOutcome({ isDead: false, reachedGoal: false }), null);
assert.equal(
  rules.resolveTerminalOutcome({ settledOutcome: rules.OUTCOME_COMPLETE, isDead: true }),
  rules.OUTCOME_DEATH,
  "Death must win even if a stale completion candidate is present"
);
assert.equal(rules.resolveTerminalOutcome({ isDead: "true", reachedGoal: 1 }), null);

assert.equal(rules.groundedSpawnY(720, 56), 664);
assert.equal(rules.groundedSpawnY(40, 56), 0);
assert.equal(rules.groundedSpawnY(-10, 56), 0);
assert.equal(rules.groundedSpawnY(Number.NaN, 56), 0);
assert.equal(rules.groundedSpawnY(720, Number.NaN), 664);

assert.equal(rules.advanceIntentWindow(0, { pressed: true, eligible: true, dt: 1 / 120, minimum: 0.12 }), 0.12);
assert.ok(Math.abs(rules.advanceIntentWindow(0.12, { pressed: false, eligible: true, dt: 0.02, minimum: 0.12 }) - 0.1) < 1e-9);
assert.equal(rules.advanceIntentWindow(0.04, { pressed: true, eligible: false, dt: 0.02, minimum: 0.12 }), 0.02);
assert.equal(rules.advanceIntentWindow(0.01, { pressed: false, eligible: true, dt: 0.02, minimum: 0.12 }), 0);

assert.match(
  gameSource,
  /updatePlayer\(dt\);\s*if \(mode !== "play" \|\| player\.settledOutcome\) return;\s*if \(player\.onGround/,
  "A terminal player update must stop downstream enemies, projectiles, pickups, and rewards in the same fixed step"
);

console.log("game-integrity-rules: collectible rating, ammo caps, intent windows, terminal arbitration, and grounded spawns passed");
