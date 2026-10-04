"use strict";

// Name seals: each creature and fixture is introduced once, in view, in order.

const assert = require("node:assert/strict");
const { recordingContext } = require("../helpers/canvas.js");
const Plaques = require("../../src/render/plaques.js");
const Creatures = require("../../src/render/creature-material.js");
const Chapters = require("../../src/data/chapters.js");

for (const [kind, entry] of Object.entries(Plaques.CATALOG)) {
  assert.ok(/^[一-鿿]{2,4}$/.test(entry.name), `${kind} has a Chinese name`);
  assert.ok(/^[一-鿿]{4}$/.test(entry.hint), `${kind} has a four-character hint`);
}
for (const kind of ["slime", "ember", "wisp", "sentry", "warder"]) {
  assert.equal(Plaques.CATALOG[kind].name, Creatures.NAMES[kind], `${kind}: seal and bestiary agree`);
}

const level = Chapters.buildChapters()[0];
const state = Plaques.createIntroductions();
const everywhere = { x: -1e6, y: -1e6, w: 2e6, h: 2e6 };
const nowhere = { x: -1e6, y: -1e6, w: 1, h: 1 };
Plaques.scan(state, level, nowhere, 1);
assert.equal(state.queue.length, 0, "nothing off screen is introduced");
Plaques.scan(state, level, everywhere, 1);
const kinds = state.queue.map((item) => item.kind);
assert.ok(kinds.includes("slime") && kinds.includes("goal"), "visible kinds are queued");
assert.deepEqual(kinds, Plaques.KINDS.filter((kind) => kinds.includes(kind)), "queue follows catalogue priority");
const queued = state.queue.length;
Plaques.scan(state, level, everywhere, 1);
assert.equal(state.queue.length, queued, "a kind is introduced only once per session");

Plaques.update(state, 0.01);
assert.ok(state.active, "the first tag becomes active");
const ctx = recordingContext();
const fonts = { seal: "14px serif", name: "19px serif", hint: "13px serif" };
Plaques.update(state, 0.5);
Plaques.draw(ctx, state, (x, y, out) => { out.x = x; out.y = y; return out; }, fonts, { view: { w: 1280, h: 720 } });
const texts = ctx.calls.filter((call) => call[0] === "fillText").map((call) => call[1]);
const entry = Plaques.CATALOG[state.active.kind];
assert.deepEqual(texts, [entry.name[0], entry.name, entry.hint], "a tag shows its seal character, name, and hint");
Plaques.update(state, Plaques.HOLD + 1);
Plaques.update(state, 0.01);
assert.notEqual(state.active?.kind, kinds[0], "tags advance one at a time");
Plaques.clear(state);
assert.equal(state.active, null);
assert.ok(state.seen.size >= queued, "clearing a chapter keeps the session's introductions");

console.log("render/plaques: Chinese name seals, once per kind, in view, in order passed");
