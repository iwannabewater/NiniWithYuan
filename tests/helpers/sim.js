"use strict";

// Headless simulation harness. Tests build either an authored chapter or a
// small synthetic one, then drive the fixed-step simulation with scripted
// input exactly as the runtime does: held actions plus one-step press edges.

const Sim = require("../../src/sim/sim.js");
const Chapters = require("../../src/data/chapters.js");
const { CHARACTERS } = require("../../src/data/characters.js");

const DT = 1 / 120;
const TILE = Chapters.TILE;

function chapters() {
  return Chapters.buildChapters();
}

function chapterById(id) {
  const chapter = chapters().find((level) => level.id === id);
  if (!chapter) throw new Error(`unknown chapter ${id}`);
  return chapter;
}

/** A minimal chapter: one long floor unless `platforms` says otherwise. */
function syntheticChapter(spec = {}) {
  const width = spec.width ?? TILE * 60;
  const height = spec.height ?? TILE * 16;
  return {
    id: spec.id ?? "synthetic",
    world: spec.world ?? { id: "world1", name: "test", subtitle: "" },
    name: "test",
    vibe: "test",
    hint: "",
    width,
    height,
    start: spec.start ?? { x: TILE * 2, y: TILE * 10 },
    goal: spec.goal ?? { x: width - TILE * 3, y: TILE * 9, w: 70, h: 120 },
    palette: ["#000000", "#111111", "#222222", "#333333"],
    platforms: spec.platforms ?? [{ x: 0, y: TILE * 14, w: width, h: TILE * 2, type: "ground", phase: "" }],
    coins: spec.coins ?? [],
    powerups: spec.powerups ?? [],
    enemies: spec.enemies ?? [],
    springs: spec.springs ?? [],
    hazards: spec.hazards ?? [],
    moving: spec.moving ?? [],
    wind: spec.wind ?? [],
    updrafts: spec.updrafts ?? [],
    bridges: spec.bridges ?? [],
    portals: spec.portals ?? [],
    lanterns: spec.lanterns ?? [],
    marrow: spec.marrow ?? null,
    warden: spec.warden ?? null,
    phaseTide: spec.phaseTide,
    par: spec.par ?? 30,
  };
}

function makeWorld(chapter, characterId = "nini", assist = {}) {
  return Sim.createWorld(chapter, { character: CHARACTERS[characterId], assist });
}

/** Advance `frames` fixed steps. `script(frame, input)` may set held actions and edges. */
function run(world, frames, script) {
  const input = world.__input || (world.__input = Sim.createInput());
  const events = world.__events || (world.__events = []);
  for (let frame = 0; frame < frames; frame += 1) {
    if (typeof script === "function") script(frame, input, world);
    Sim.step(world, input, DT);
    for (const event of Sim.drainEvents(world)) events.push(event);
  }
  return world;
}

function press(input, action) {
  input[action] = true;
  input[`${action}Pressed`] = true;
}

function release(input, action) {
  input[action] = false;
  if (action === "jump") input.jumpReleased = true;
}

function eventsOf(world, type) {
  return (world.__events || []).filter((event) => event.type === type);
}

function settle(world, frames = 12) {
  return run(world, frames);
}

module.exports = {
  Sim,
  Chapters,
  CHARACTERS,
  DT,
  TILE,
  chapters,
  chapterById,
  syntheticChapter,
  makeWorld,
  run,
  press,
  release,
  eventsOf,
  settle,
};
