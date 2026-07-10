const { withPage } = require("../helpers/e2e");

const SAVE_KEY = "nini-yuan-save-v1";
const VOLUME_INPUT_EVENTS = 36;
const STORAGE_WRITE_BUDGET = 2;
const HUD_MUTATION_BUDGET = 72;
const MOVEMENT_WINDOW_MS = 800;

function installStorageProbe() {
  const originalSetItem = Storage.prototype.setItem;
  const storageWrites = [];

  Storage.prototype.setItem = function observedSetItem(key, value) {
    storageWrites.push({
      key: String(key),
      value: String(value),
      at: performance.now(),
    });
    return Reflect.apply(originalSetItem, this, [key, value]);
  };

  window.__runtimeEfficiency = { storageWrites };
}

async function waitForProbeWindow(page, markerName, durationMs) {
  await page.waitForFunction(
    ({ markerName: name, duration }) => {
      const marker = window.__runtimeEfficiency?.[name];
      return Number.isFinite(marker) && performance.now() - marker >= duration;
    },
    { markerName, duration: durationMs },
    { polling: "raf", timeout: Math.max(1500, durationMs * 4) }
  );
}

async function verifyDebouncedSettingsPersistence(page) {
  await page.getByRole("button", { name: "设置" }).click();
  await page.locator("#settingsScreen.active #volumeRange").waitFor({ state: "visible" });

  const burst = await page.evaluate(
    ({ eventCount, saveKey }) => {
      const range = document.querySelector("#settingsScreen.active #volumeRange");
      const probe = window.__runtimeEfficiency;
      const baseline = probe.storageWrites.filter((write) => write.key === saveKey).length;
      const finalValue = 83;

      probe.volumeBurstStartedAt = performance.now();
      for (let index = 0; index < eventCount; index += 1) {
        range.value = String(index === eventCount - 1 ? finalValue : 20 + (index % 61));
        range.dispatchEvent(new Event("input", { bubbles: true }));
      }

      return {
        baseline,
        eventCount,
        finalValue,
        immediateWrites: probe.storageWrites.filter((write) => write.key === saveKey).length - baseline,
      };
    },
    { eventCount: VOLUME_INPUT_EVENTS, saveKey: SAVE_KEY }
  );

  if (burst.eventCount < 30) {
    throw new Error(`Volume persistence probe dispatched too few input events: ${burst.eventCount}`);
  }
  if (burst.immediateWrites > STORAGE_WRITE_BUDGET) {
    throw new Error(`Volume input wrote synchronously ${burst.immediateWrites} times for ${burst.eventCount} events`);
  }

  await waitForProbeWindow(page, "volumeBurstStartedAt", 100);

  const writesBeforeChange = await page.evaluate(
    ({ baseline, saveKey }) =>
      window.__runtimeEfficiency.storageWrites.filter((write) => write.key === saveKey).length - baseline,
    { baseline: burst.baseline, saveKey: SAVE_KEY }
  );
  if (writesBeforeChange > STORAGE_WRITE_BUDGET) {
    throw new Error(`Volume input exceeded the ${STORAGE_WRITE_BUDGET}-write debounce budget before change: ${writesBeforeChange}`);
  }

  await page.locator("#volumeRange").evaluate((range) => {
    range.dispatchEvent(new Event("change", { bubbles: true }));
    window.__runtimeEfficiency.volumeChangeDispatchedAt = performance.now();
  });

  await page.waitForFunction(
    ({ saveKey, expectedVolume }) => {
      const raw = localStorage.getItem(saveKey);
      if (!raw) return false;
      try {
        return JSON.parse(raw).settings?.volume === expectedVolume;
      } catch {
        return false;
      }
    },
    { saveKey: SAVE_KEY, expectedVolume: burst.finalValue },
    { polling: "raf", timeout: 1500 }
  );

  await waitForProbeWindow(page, "volumeChangeDispatchedAt", 180);

  const result = await page.evaluate(
    ({ baseline, saveKey, burstStartedAt }) => {
      const writes = window.__runtimeEfficiency.storageWrites
        .filter((write) => write.key === saveKey)
        .slice(baseline);
      const saved = JSON.parse(localStorage.getItem(saveKey));
      return {
        totalWrites: writes.length,
        writesInDebounceWindow: writes.filter((write) => write.at - burstStartedAt <= 150).length,
        storedVolume: saved.settings.volume,
      };
    },
    { baseline: burst.baseline, saveKey: SAVE_KEY, burstStartedAt: await page.evaluate(() => window.__runtimeEfficiency.volumeBurstStartedAt) }
  );

  if (result.writesInDebounceWindow > STORAGE_WRITE_BUDGET || result.totalWrites > STORAGE_WRITE_BUDGET) {
    throw new Error(`Volume persistence was not substantially throttled: ${JSON.stringify(result)}`);
  }
  if (result.storedVolume !== burst.finalValue) {
    throw new Error(`Volume change did not flush the final value: ${JSON.stringify(result)}`);
  }

  return result;
}

async function startRuntimeProbes(page) {
  return page.evaluate(() => {
    const fixedStep = window.NiniFixedStep;
    if (!fixedStep || typeof fixedStep.runFrame !== "function") {
      throw new Error("Fixed-step runtime is unavailable");
    }

    const fixedStepStats = {
      frames: 0,
      executedSteps: 0,
      maxPlannedSteps: 0,
      observedFrameTime: 0,
    };
    const originalRunFrame = fixedStep.runFrame;
    fixedStep.runFrame = function observedRunFrame(...args) {
      const result = Reflect.apply(originalRunFrame, this, args);
      fixedStepStats.frames += 1;
      fixedStepStats.executedSteps += result.steps;
      fixedStepStats.maxPlannedSteps = Math.max(fixedStepStats.maxPlannedSteps, result.plannedSteps);
      fixedStepStats.observedFrameTime += result.frameDt;
      return result;
    };

    window.__runtimeEfficiency.fixedStepStats = fixedStepStats;
  });
}

async function beginHudProbe(page) {
  return page.evaluate(() => {
    const overlay = document.querySelector("#overlay");
    const progressBar = document.querySelector("#chapterBar span");
    const probe = {
      startedAt: performance.now(),
      startProgress: Number.parseFloat(progressBar.style.width) || 0,
      records: 0,
      childList: 0,
      characterData: 0,
      attributes: 0,
      styleAttributes: 0,
      progressStyleAttributes: 0,
    };

    const count = (records) => {
      for (const record of records) {
        probe.records += 1;
        probe[record.type] += 1;
        if (record.type === "attributes" && record.attributeName === "style") {
          probe.styleAttributes += 1;
          if (record.target === progressBar) probe.progressStyleAttributes += 1;
        }
      }
    };

    const observer = new MutationObserver(count);
    observer.observe(overlay, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    window.__runtimeEfficiency.hudProbe = {
      probe,
      finish() {
        count(observer.takeRecords());
        observer.disconnect();
        return {
          ...probe,
          elapsed: performance.now() - probe.startedAt,
          endProgress: Number.parseFloat(progressBar.style.width) || 0,
        };
      },
    };
  });
}

async function verifyHudMutationBudget(page) {
  await page.locator("#settingsScreen.active [data-action='back']").click();
  await page.getByRole("button", { name: "继续冒险" }).click();
  await page.waitForFunction(() => {
    const overlay = document.querySelector("#overlay");
    const progress = Number.parseFloat(document.querySelector("#chapterBar span")?.style.width);
    return overlay?.classList.contains("active") && Number.isFinite(progress) && document.activeElement?.id === "game";
  });

  await startRuntimeProbes(page);
  await beginHudProbe(page);
  await page.keyboard.down("ArrowRight");

  try {
    await page.waitForFunction(
      ({ duration }) => {
        const runtime = window.__runtimeEfficiency;
        const hud = runtime?.hudProbe?.probe;
        const progress = Number.parseFloat(document.querySelector("#chapterBar span")?.style.width) || 0;
        return hud && performance.now() - hud.startedAt >= duration && progress > hud.startProgress;
      },
      { duration: MOVEMENT_WINDOW_MS },
      { polling: "raf", timeout: 3000 }
    );
  } finally {
    await page.keyboard.up("ArrowRight");
  }

  const result = await page.evaluate(() => ({
    hud: window.__runtimeEfficiency.hudProbe.finish(),
    fixedStep: { ...window.__runtimeEfficiency.fixedStepStats },
  }));

  if (result.hud.elapsed < MOVEMENT_WINDOW_MS || result.hud.endProgress <= result.hud.startProgress) {
    throw new Error(`Sustained movement did not advance HUD progress: ${JSON.stringify(result.hud)}`);
  }
  if (result.hud.progressStyleAttributes < 1) {
    throw new Error(`HUD mutation probe observed no real progress updates: ${JSON.stringify(result.hud)}`);
  }
  if (result.hud.records > HUD_MUTATION_BUDGET) {
    throw new Error(`HUD exceeded the ${HUD_MUTATION_BUDGET}-mutation budget: ${JSON.stringify(result.hud)}`);
  }
  if (result.fixedStep.frames < 20 || result.fixedStep.executedSteps < 20 || result.fixedStep.observedFrameTime <= 0) {
    throw new Error(`Fixed-step runtime was not exercised during movement: ${JSON.stringify(result.fixedStep)}`);
  }

  return result;
}

async function run() {
  await withPage(
    "runtime efficiency",
    async (page) => {
      const storage = await verifyDebouncedSettingsPersistence(page);
      const runtime = await verifyHudMutationBudget(page);
      console.log(`runtime-efficiency-e2e: ${JSON.stringify({ storage, ...runtime })}`);
    },
    { init: installStorageProbe }
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
