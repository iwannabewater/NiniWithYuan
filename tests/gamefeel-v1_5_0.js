const assert = require("node:assert/strict");
const fs = require("node:fs");

const GameFeel = require("../src/render/game-feel.js");
const Audio = require("../src/core/audio.js");

function withMatchMedia(matches, fn) {
  const prev = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches });
  try {
    return fn();
  } finally {
    if (prev) globalThis.matchMedia = prev;
    else delete globalThis.matchMedia;
  }
}

withMatchMedia(false, () => {
  GameFeel.resetHitstop();
  GameFeel.requestHitstop(50);
  assert.equal(GameFeel.consumeHitstop(0.02), 0, "the first 20 ms should be fully frozen");
  assert.ok(Math.abs(GameFeel.getHitstopRemaining() - 30) < 0.001, "hit-stop should have about 30 ms remaining");
  assert.ok(Math.abs(GameFeel.consumeHitstop(0.04) - 0.01) < 1e-12, "a crossing frame should return its 10 ms simulation remainder");
  assert.equal(GameFeel.consumeHitstop(0.016), 0.016, "a cleared hit-stop should return the full frame");

  GameFeel.requestHitstop(200);
  assert.equal(GameFeel.getHitstopRemaining(), 120, "hit-stop should clamp to 120 ms");

  GameFeel.resetHitstop();
  GameFeel.requestHitstop(30);
  GameFeel.requestHitstop(50);
  assert.equal(GameFeel.getHitstopRemaining(), 50, "hit-stop requests should take max, not sum");

  GameFeel.resetHitstop();
  GameFeel.requestHitstop(80);
  GameFeel.resetHitstop();
  assert.equal(GameFeel.consumeHitstop(0.016), 0.016, "resetHitstop should restore the full frame");

  for (const fps of [60, 30, 25, 20]) {
    for (const requestedMs of [35, 70]) {
      GameFeel.resetHitstop();
      GameFeel.requestHitstop(requestedMs);
      const frameDt = 1 / fps;
      let frozenSeconds = 0;
      let firstSimulationFrame = 0;
      for (let frame = 1; frame <= 20; frame += 1) {
        const available = GameFeel.consumeHitstop(frameDt);
        frozenSeconds += frameDt - available;
        if (available > 0) {
          firstSimulationFrame = frame;
          break;
        }
      }
      assert.ok(
        Math.abs(frozenSeconds - requestedMs / 1000) < 1e-9,
        `${requestedMs}ms hit-stop must consume exactly its requested duration at ${fps}fps`
      );
      assert.ok(
        firstSimulationFrame * frameDt <= requestedMs / 1000 + frameDt + 1e-9,
        `${requestedMs}ms hit-stop must resume within the crossing frame at ${fps}fps`
      );
    }
  }
});

withMatchMedia(true, () => {
  GameFeel.resetHitstop();
  GameFeel.requestHitstop(50);
  assert.equal(GameFeel.getHitstopRemaining(), 0, "reduced motion should disable hit-stop");
});

const camera = { lookX: 0, lookY: 0 };
const offset = GameFeel.cameraLookaheadOffset({ vx: 820, vy: 480 }, { reducedMotion: false }, 1 / 60, camera);
assert.ok(Math.abs(camera.lookX) <= 1, "camera.lookX should stay normalized");
assert.ok(Math.abs(offset.x) <= 56, "horizontal lookahead should stay within 56 px");
assert.ok(Math.abs(offset.y) <= 30, "vertical lookahead should stay within 30 px");
GameFeel.cameraLookaheadReset(camera);
assert.deepEqual(camera, { lookX: 0, lookY: 0 }, "cameraLookaheadReset should zero lookahead immediately");

assert.equal(GameFeel.clampShake(0, 13, false, false), 13);
assert.equal(GameFeel.clampShake(0, 13, true, false), 8.450000000000001);
assert.equal(GameFeel.clampShake(10, 5, false, false), 10);
assert.equal(GameFeel.clampShake(0, 13, false, true), 3.9);

let sparkCalls = 0;
GameFeel.landingPuff(() => { sparkCalls += 1; }, 100, 100, 0.5, true);
assert.equal(sparkCalls, 1, "landingPuff should call spawnSpark once when FX is enabled");
GameFeel.landingPuff(() => { sparkCalls += 1; }, 100, 100, 0.5, false);
assert.equal(sparkCalls, 1, "landingPuff should not spawn when FX is disabled");

const cueNames = [
  "jump", "dash", "skill_ready", "shoot_nini", "shoot_yuan", "stomp", "hit_take", "hit_super",
  "pickup_coin", "pickup_gem", "pickup_powerup", "spring", "portal", "break_crystal", "complete", "fail",
];
for (const name of cueNames) {
  const cue = Audio.CUE_TABLE[name];
  assert.ok(cue, `missing cue: ${name}`);
  for (const key of ["wave", "freq", "attack", "release", "gain"]) assert.ok(key in cue, `${name} missing ${key}`);
}

class MockParam {
  constructor(value = 0) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}
class MockNode {
  constructor(kind, bucket) {
    this.kind = kind;
    this.bucket = bucket;
    this.frequency = new MockParam(440);
    this.detune = new MockParam(0);
    this.gain = new MockParam(1);
  }
  connect(target) { return target; }
  start() {}
  stop() {}
}
class MockAudioContext {
  constructor() {
    this.currentTime = 0;
    this.state = "running";
    this.destination = new MockNode("destination", []);
  }
  createOscillator() { const n = new MockNode("osc", MockAudioContext.nodes); MockAudioContext.nodes.push(n); return n; }
  createGain() { const n = new MockNode("gain", MockAudioContext.nodes); MockAudioContext.nodes.push(n); return n; }
  createBiquadFilter() { const n = new MockNode("biquad", MockAudioContext.nodes); n.frequency = new MockParam(0); MockAudioContext.nodes.push(n); return n; }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
MockAudioContext.nodes = [];

const previousAudioContext = globalThis.AudioContext;
globalThis.AudioContext = MockAudioContext;
try {
  const bus = Audio.createAudioBus({ getVolume: () => 70 });
  for (const [name, expected] of [
    ["jump", { osc: 1, gain: 1, biquad: 0 }],
    ["dash", { osc: 1, gain: 1, biquad: 1 }],
    ["portal", { osc: 2, gain: 2, biquad: 0 }],
  ]) {
    MockAudioContext.nodes = [];
    bus.cue(name);
    const count = (kind) => MockAudioContext.nodes.filter((node) => node.kind === kind).length;
    assert.equal(count("osc"), expected.osc, `${name} oscillator count`);
    assert.equal(count("gain"), expected.gain, `${name} gain count`);
    assert.equal(count("biquad"), expected.biquad, `${name} biquad count`);
  }
} finally {
  if (previousAudioContext) globalThis.AudioContext = previousAudioContext;
  else delete globalThis.AudioContext;
}

const game = fs.readFileSync("src/game.js", "utf8");
const html = fs.readFileSync("index.html", "utf8");
assert.ok(game.includes("vy < -160"), "variable jump cut threshold should stay pinned");
assert.ok(game.includes("player.vy *= 0.56"), "variable jump cut multiplier should stay pinned");
assert.ok(game.includes("player.coyote = 0.12"), "coyote time should stay pinned");
assert.ok(game.includes("player.jumpBuffer = 0.14"), "jump buffer should stay pinned");
assert.ok(game.includes("GameFeel?.consumeHitstop"), "game loop should consume hit-stop and retain crossing-frame time");
assert.ok(game.includes("GameFeel?.cameraLookaheadOffset"), "camera should include lookahead offset");
assert.match(html, /<script src="\.\/src\/game\.js" defer><\/script>/, "game runtime should join the deferred helper queue");
assert.ok(
  html.indexOf("./src/render/game-feel.js") < html.indexOf("./src/game.js"),
  "game-feel must execute before the game captures its runtime reference"
);
assert.ok(
  html.indexOf("./src/render/playfield-material.js") < html.indexOf("./src/game.js"),
  "playfield materials must execute before the game captures its renderer reference"
);

console.log("gamefeel-v1.5.0: hit-stop, lookahead, shake, cue table, and physics pins passed");
