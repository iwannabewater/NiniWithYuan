"use strict";

// Conservative reachability: every chapter's goal must be reachable from its
// start by each protagonist with their own kit (Yuan: one jump plus his
// minimum dash distance; Nini: a jump plus her air jump), using ballistic
// jumps, springs, updrafts, star gates, moving platforms, and magpie bridges. Phase bridges count as standable because the
// tide always returns them. A safety factor keeps jumps well inside the real
// envelope, so a chapter that passes here has slack in play.

const assert = require("node:assert/strict");
const Chapters = require("../../src/data/chapters.js");
const { CHARACTERS } = require("../../src/data/characters.js");

const TILE = Chapters.TILE;
const levels = Chapters.buildChapters();
const YUAN_DASH = 130;
let hero = CHARACTERS.yuan;
const SAFETY = 0.94;
const BODY_W = 34;


/** Horizontal reach of a jump launched at `v` that lands `rise` px higher (negative = lower). */
function reach(v, rise, gravity, speed) {
  const disc = v * v - 2 * gravity * rise;
  if (disc < 0) return -1;
  const t = (v + Math.sqrt(disc)) / gravity;
  return speed * t;
}

function surfaces(level) {
  const list = [];
  const add = (x, y, w, kind, extra = {}) => list.push({ x, y, w, kind, ...extra });
  for (const p of level.platforms) add(p.x, p.y, p.w, p.type);
  for (const b of level.bridges || []) add(b.x, b.y, b.w, "magpie");
  for (const m of level.moving) {
    if (m.axis === "y") {
      add(m.ox, m.oy - m.range, m.w, "moving");
      add(m.ox, m.oy + m.range, m.w, "moving");
    } else {
      add(m.ox - m.range, m.oy, m.w + m.range * 2, "moving");
    }
  }
  for (const s of level.springs) {
    // A spring is a launch pad on whatever it rests on.
    list.push({ x: s.x, y: s.y + s.h, w: s.w, kind: "spring", launch: s.power });
  }
  return list;
}

function gap(a, b) {
  return Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w));
}

function canJump(a, b, level) {
  const rise = a.y - b.y;
  const v = Math.max(hero.jump, a.launch || 0);
  // Crosswinds over the gap scale air speed, as the controller's drift does
  // (capped at 1.3x with a tailwind; a headwind is assumed at its worst).
  const direction = b.x >= a.x ? 1 : -1;
  const left = Math.min(a.x + a.w, b.x);
  const right = Math.max(a.x, b.x + b.w);
  let speed = hero.speed;
  for (const w of level.wind || []) {
    if (w.x >= right || w.x + w.w <= left) continue;
    speed = Math.sign(w.force) === direction ? Math.max(speed, hero.speed * 1.3) : Math.min(speed, hero.speed * 0.7);
  }
  let horizontal = reach(v, rise, hero.gravity, speed);
  if (hero.id === "yuan" && horizontal >= 0) horizontal += YUAN_DASH;
  if (hero.id === "nini") {
    // Air jump at the apex: a second arc from the peak.
    const peak = (v * v) / (2 * hero.gravity);
    const v2 = hero.jump * 0.9;
    const second = reach(v2, rise - peak, hero.gravity, speed);
    if (second >= 0) horizontal = Math.max(horizontal, (v / hero.gravity) * speed + second);
  }
  if (horizontal >= 0 && gap(a, b) <= horizontal * SAFETY + BODY_W * 0.5) return true;
  // Updrafts: a column touching both surfaces lifts the player across.
  for (const u of level.updrafts || []) {
    const touchesA = u.x < a.x + a.w + TILE && u.x + u.w > a.x - TILE && u.y + u.h >= a.y - TILE * 0.5;
    const top = u.y - (u.max * u.max) / (2 * hero.gravity) * 0.6;
    const touchesB = gap(u, b) <= reach(u.max, 0, hero.gravity, hero.speed) * SAFETY && b.y >= top;
    if (touchesA && touchesB) return true;
  }
  return false;
}

function reachableGoal(level) {
  const nodes = surfaces(level);
  const startFoot = { x: level.start.x, y: level.start.y, w: BODY_W };
  const startNode = nodes
    .filter((n) => n.x <= startFoot.x + BODY_W && n.x + n.w >= startFoot.x && n.y >= startFoot.y - 2)
    .sort((a, b) => a.y - b.y)[0];
  if (!startNode) return { ok: false, reason: "start has no floor" };
  const seen = new Set([startNode]);
  const queue = [startNode];
  const portalFloor = (portal) => nodes.find((n) => Math.abs(n.y - (portal.y + portal.h)) < 2 && n.x <= portal.x + portal.w && n.x + n.w >= portal.x);
  while (queue.length) {
    const node = queue.shift();
    const next = [];
    for (const other of nodes) if (!seen.has(other) && canJump(node, other, level)) next.push(other);
    // Springs resting on this surface launch from it.
    for (const pad of nodes) {
      if (pad.kind === "spring" && !seen.has(pad) && Math.abs(pad.y - node.y) < 2 && gap(pad, node) === 0) next.push(pad);
    }
    for (const portal of level.portals || []) {
      const floor = portalFloor(portal);
      if (floor !== node) continue;
      const pair = level.portals.find((p) => p.id === portal.pair);
      const exit = pair && portalFloor(pair);
      if (exit && !seen.has(exit)) next.push(exit);
    }
    for (const n of next) {
      seen.add(n);
      queue.push(n);
    }
  }
  const goal = level.goal;
  const goalFoot = { x: goal.x, y: goal.y + goal.h, w: goal.w };
  for (const node of seen) {
    if (gap(node, goalFoot) <= TILE * 0.5 && node.y >= goalFoot.y - TILE * 3 && node.y - goalFoot.y <= ((hero.jump * hero.jump) / (2 * hero.gravity)) * SAFETY) return { ok: true };
  }
  if (process.env.DEBUG_REACH) console.log([...seen].map((n) => `${n.kind}@${(n.x / TILE).toFixed(1)},${(n.y / TILE).toFixed(1)}+${(n.w / TILE).toFixed(1)}`).join(" "));
  return { ok: false, reason: `reached ${seen.size} of ${nodes.length} surfaces` };
}

for (const id of ["yuan", "nini"]) {
  hero = CHARACTERS[id];
  for (const level of levels) {
    const result = reachableGoal(level);
    assert.ok(result.ok, `${level.id}: goal unreachable for ${id} (${result.reason})`);
  }
}
hero = CHARACTERS.yuan;

// The validator is not vacuous: a chapter with a canyon too wide to jump fails.
{
  const level = {
    start: { x: TILE, y: TILE * 10 - 60 },
    goal: { x: TILE * 40, y: TILE * 10 - 124, w: 72, h: 124 },
    platforms: [{ x: 0, y: TILE * 10, w: TILE * 6, h: TILE * 2 }, { x: TILE * 30, y: TILE * 10, w: TILE * 15, h: TILE * 2 }],
    moving: [], springs: [], portals: [], bridges: [], updrafts: [],
  };
  assert.equal(reachableGoal(level).ok, false, "a 24-tile canyon is unreachable");
  level.updrafts = [];
  level.bridges = [{ x: TILE * 10, y: TILE * 10, w: TILE * 4, h: 18 }, { x: TILE * 18, y: TILE * 10, w: TILE * 4, h: 18 }, { x: TILE * 25, y: TILE * 10, w: TILE * 3, h: 18 }];
  assert.equal(reachableGoal(level).ok, true, "magpie bridges can span the canyon");
}

console.log(`content/reachability: all ${levels.length} chapters reachable for both protagonists`);
