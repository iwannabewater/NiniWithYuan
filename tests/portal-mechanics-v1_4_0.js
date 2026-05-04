const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("src/game.js", "utf8");

const buildStart = source.indexOf("  function buildLevels()");
const buildEnd = source.indexOf("  function resize()");
assert.ok(buildStart >= 0 && buildEnd > buildStart, "Could not extract buildLevels for portal validation");

const levels = new Function(
  `const TILE = 48; const ENEMY_WIDTH = 38; const ENEMY_HEIGHT = 34; const WISP_FLOAT_GAP = 24; const WISP_HOVER_RANGE = 6; ${source.slice(buildStart, buildEnd)}; return buildLevels();`
)();

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function bodyRect(p) {
  return { x: p.x + 3, y: p.y + 3, w: p.w - 6, h: p.h - 3 };
}

function exitRect(portal) {
  return {
    x: portal.x + portal.w / 2 - 17,
    y: portal.y + portal.h - 56,
    w: 34,
    h: 56,
  };
}

const world2 = levels.filter((level) => level.world?.id === "world2");
const portalLevels = levels.filter((level) => Array.isArray(level.portals) && level.portals.length > 0);
assert.equal(world2.length, 5, "World 2 should contain five portal-focused chapters in v1.4.0");
assert.equal(portalLevels.length, 7, "v1.4.0 should contain five World 2 portal chapters plus two World 3 hybrid chapters");

for (const level of portalLevels) {
  assert.ok(Array.isArray(level.portals), `${level.id} should declare portals`);
  assert.ok(level.portals.length >= 2, `${level.id} should include at least one portal pair`);
  assert.equal(level.portals.length % 2, 0, `${level.id} should have an even portal endpoint count`);

  const ids = new Set();
  for (const portal of level.portals) {
    assert.ok(portal.id && typeof portal.id === "string", `${level.id} portal missing id`);
    assert.ok(portal.pair && typeof portal.pair === "string", `${level.id}.${portal.id} missing pair`);
    assert.ok(!ids.has(portal.id), `${level.id} has duplicate portal id ${portal.id}`);
    ids.add(portal.id);
    assert.ok(portal.w >= 36 && portal.h >= 64, `${level.id}.${portal.id} portal should be visibly large`);
    assert.ok(portal.x >= 0 && portal.y >= 0 && portal.x + portal.w <= level.width && portal.y + portal.h <= level.height, `${level.id}.${portal.id} is out of bounds`);
  }

  const solids = level.platforms.concat(level.moving);
  for (const portal of level.portals) {
    const pair = level.portals.find((candidate) => candidate.id === portal.pair);
    assert.ok(pair, `${level.id}.${portal.id} points to missing pair ${portal.pair}`);
    assert.equal(pair.pair, portal.id, `${level.id}.${portal.id} pair should point back for readability`);

    const exit = exitRect(pair);
    assert.ok(exit.x >= 0 && exit.y >= 0 && exit.x + exit.w <= level.width && exit.y + exit.h <= level.height, `${level.id}.${portal.id} exit is out of bounds`);
    assert.ok(!solids.some((solid) => !solid.broken && rectsOverlap(bodyRect(exit), solid)), `${level.id}.${portal.id} exit overlaps a solid platform`);
    assert.ok(
      !solids.some((solid) => solid.phase && rectsOverlap({ x: exit.x - 18, y: exit.y - 18, w: exit.w + 36, h: exit.h + 36 }, solid)),
      `${level.id}.${portal.id} exit should not sit inside a phase bridge activation zone`
    );
  }
}

assert.ok(source.includes("PORTAL_COOLDOWN"), "Portal runtime should include a re-entry cooldown");
assert.ok(source.includes("portalLock"), "Portal runtime should require the player to leave the exit gate before it can trigger again");
assert.ok(source.includes("portalExitRectIsSafe"), "Portal runtime should guard unsafe exits");
assert.ok(source.includes("drawPortal"), "Portal runtime should render portals on canvas");

console.log("portal-mechanics-v1.4.0: portal pairs, exits, cooldown, phase-adjacent safety, and rendering guards passed");
