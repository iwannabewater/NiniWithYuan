((root) => {
  "use strict";

  const FIXED_DT = 1 / 120;
  const MAX_FRAME_DT = 0.08;
  const MAX_STEPS = 8;
  const STEP_EPSILON = FIXED_DT * 1e-9;

  function finiteNonNegative(value) {
    try {
      const number = Number(value);
      return Number.isFinite(number) && number > 0 ? number : 0;
    } catch {
      return 0;
    }
  }

  function normalizeRemainder(value) {
    if (value <= STEP_EPSILON || FIXED_DT - value <= STEP_EPSILON) return 0;
    return value;
  }

  function planFrame(accumulator, frameDt) {
    const carriedTime = finiteNonNegative(accumulator);
    const elapsedTime = Math.min(MAX_FRAME_DT, finiteNonNegative(frameDt));
    const availableTime = carriedTime + elapsedTime;
    const availableSteps = Math.floor((availableTime + STEP_EPSILON) / FIXED_DT);
    const steps = Math.min(MAX_STEPS, availableSteps);
    let remainder = Math.max(0, availableTime - steps * FIXED_DT);
    let droppedTime = 0;

    if (availableSteps > MAX_STEPS) {
      const retainedRemainder = remainder % FIXED_DT;
      droppedTime = remainder - retainedRemainder;
      remainder = retainedRemainder;
    }

    return {
      steps,
      accumulator: normalizeRemainder(remainder),
      frameDt: elapsedTime,
      droppedTime: droppedTime <= STEP_EPSILON ? 0 : droppedTime,
    };
  }

  function requestedHitstop(result) {
    return result === true || (result && result.hitstopRequested === true);
  }

  function runFrame(accumulator, frameDt, step) {
    const plan = planFrame(accumulator, frameDt);
    if (typeof step !== "function") {
      return {
        ...plan,
        plannedSteps: plan.steps,
        steps: 0,
        hitstopRequested: false,
        droppedTime: plan.droppedTime + plan.steps * FIXED_DT,
      };
    }

    const plannedSteps = plan.steps;
    let executedSteps = 0;
    let hitstopRequested = false;
    for (; executedSteps < plannedSteps; executedSteps += 1) {
      const result = step(FIXED_DT, executedSteps);
      if (requestedHitstop(result)) {
        executedSteps += 1;
        hitstopRequested = true;
        break;
      }
    }

    const skippedSteps = plannedSteps - executedSteps;
    return {
      ...plan,
      plannedSteps,
      steps: executedSteps,
      hitstopRequested,
      droppedTime: plan.droppedTime + skippedSteps * FIXED_DT,
    };
  }

  const api = {
    FIXED_DT,
    MAX_FRAME_DT,
    MAX_STEPS,
    planFrame,
    runFrame,
  };

  root.NiniFixedStep = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
