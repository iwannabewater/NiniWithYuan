const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const fixedStep = require("../src/core/fixed-step");

assert.equal(globalThis.NiniFixedStep, fixedStep, "Node and browser-style exports should expose the same API");
{
  const browserContext = { window: {} };
  vm.runInNewContext(fs.readFileSync("src/core/fixed-step.js", "utf8"), browserContext);
  assert.equal(typeof browserContext.window.NiniFixedStep.planFrame, "function");
}
assert.equal(fixedStep.FIXED_DT, 1 / 120);
assert.equal(fixedStep.MAX_FRAME_DT, 0.08);
assert.equal(fixedStep.MAX_STEPS, 8);

function simulate(renderFps, durationSeconds) {
  const frameCount = renderFps * durationSeconds;
  let accumulator = 0;
  let simulatedSteps = 0;
  let droppedTime = 0;
  for (let frame = 0; frame < frameCount; frame += 1) {
    const result = fixedStep.runFrame(accumulator, 1 / renderFps, () => {
      simulatedSteps += 1;
    });
    accumulator = result.accumulator;
    droppedTime += result.droppedTime;
  }
  return { accumulator, simulatedSteps, droppedTime };
}

for (const renderFps of [60, 30, 25, 20]) {
  const durationSeconds = 20;
  const result = simulate(renderFps, durationSeconds);
  const simulatedTime = result.simulatedSteps * fixedStep.FIXED_DT + result.accumulator;
  assert.ok(
    Math.abs(simulatedTime - durationSeconds) <= fixedStep.FIXED_DT * 1e-6,
    `${renderFps}fps must simulate real time instead of a fixed slow-motion ratio`
  );
  assert.ok(result.simulatedSteps >= durationSeconds * 120 - 1);
  assert.equal(result.droppedTime, 0, `${renderFps}fps must stay below the overload guard`);
}

{
  const plan = fixedStep.planFrame(0, 1);
  assert.equal(plan.frameDt, 0.08, "Long lifecycle gaps must be clamped");
  assert.equal(plan.steps, 8, "A frame must never execute more than eight simulation steps");
  assert.ok(plan.droppedTime > 0, "Overload protection must report discarded whole-step time");
  assert.ok(plan.accumulator >= 0 && plan.accumulator < fixedStep.FIXED_DT);
}

{
  const calls = [];
  const result = fixedStep.runFrame(0, 1 / 30, (dt, index) => {
    calls.push([dt, index]);
    return { hitstopRequested: true };
  });
  assert.equal(result.plannedSteps, 4);
  assert.equal(result.steps, 1, "Hitstop must end the current fixed-step batch immediately");
  assert.equal(result.hitstopRequested, true);
  assert.equal(calls.length, 1);
  assert.ok(result.droppedTime >= 3 * fixedStep.FIXED_DT - 1e-12);
}

{
  const plan = fixedStep.planFrame(-1, Number.NaN);
  assert.deepEqual(plan, { steps: 0, accumulator: 0, frameDt: 0, droppedTime: 0 });
  assert.deepEqual(
    fixedStep.planFrame(Symbol("invalid"), Symbol("invalid")),
    { steps: 0, accumulator: 0, frameDt: 0, droppedTime: 0 }
  );
}

console.log("frame-pacing: 60/30/25/20fps real-time pacing, overload guard, and hitstop batching passed");
