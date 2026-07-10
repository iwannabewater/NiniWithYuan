const assert = require("node:assert/strict");
const { withPage } = require("../helpers/e2e");

async function installPlayerProbe(page) {
  await page.evaluate(() => {
    window.__playerDrawSamples = [];

    const saveStacks = new WeakMap();
    const originalSave = CanvasRenderingContext2D.prototype.save;
    const originalRestore = CanvasRenderingContext2D.prototype.restore;
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;

    CanvasRenderingContext2D.prototype.save = function probedSave() {
      const stack = saveStacks.get(this) || [];
      stack.push(this.getTransform());
      saveStacks.set(this, stack);
      return originalSave.call(this);
    };

    CanvasRenderingContext2D.prototype.restore = function probedRestore() {
      const result = originalRestore.call(this);
      saveStacks.get(this)?.pop();
      return result;
    };

    CanvasRenderingContext2D.prototype.drawImage = function probedDrawImage(source, ...args) {
      const sourceUrl = String(source?.currentSrc || source?.src || "");
      const match = sourceUrl.match(/\/assets\/characters\/(nini|yuan)\//);
      if (match && args.length >= 8) {
        const parent = saveStacks.get(this)?.at(-1);
        if (parent) {
          const local = parent.inverse().multiply(this.getTransform());
          window.__playerDrawSamples.push({
            character: match[1],
            time: performance.now(),
            x: local.e,
            y: local.f,
            sourceX: Number(args[0]),
            sourceY: Number(args[1]),
          });
          if (window.__playerDrawSamples.length > 1200) window.__playerDrawSamples.shift();
        }
      }
      return originalDrawImage.call(this, source, ...args);
    };
  });
}

async function waitForPlayerSample(page, character, since = 0) {
  await page.waitForFunction(
    ({ expectedCharacter, after }) =>
      window.__playerDrawSamples?.some(
        (sample) => sample.character === expectedCharacter && sample.time >= after
      ),
    { expectedCharacter: character, after: since }
  );
}

async function playerSamples(page, character, since = 0, until = Infinity) {
  return page.evaluate(
    ({ expectedCharacter, after, before }) =>
      window.__playerDrawSamples.filter(
        (sample) =>
          sample.character === expectedCharacter &&
          sample.time >= after &&
          sample.time <= before
      ),
    { expectedCharacter: character, after: since, before: until }
  );
}

async function latestPlayerSample(page, character) {
  const samples = await playerSamples(page, character);
  assert.ok(samples.length, `Expected a rendered ${character} player sample`);
  return samples.at(-1);
}

async function startWithMouse(page) {
  const continueButton = page.getByRole("button", { name: "继续冒险" });
  const box = await continueButton.boundingBox();
  assert.ok(box, "Continue button must have a mouse-clickable box");
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function run() {
  await withPage(
    "held menu jump input isolation",
    async (page) => {
      await installPlayerProbe(page);
      await page.keyboard.down("Space");
      await startWithMouse(page);
      await waitForPlayerSample(page, "nini");
      await page.keyboard.down("Space");

      const first = await latestPlayerSample(page, "nini");
      await page.waitForTimeout(120);
      const openingWindow = await playerSamples(page, "nini", first.time, first.time + 100);
      assert.ok(openingWindow.length >= 2, "Expected multiple player frames during the opening 100ms");

      const highestAnchor = Math.min(...openingWindow.map((sample) => sample.y));
      const leakedRise = first.y - highestAnchor;
      assert.ok(
        leakedRise < 10,
        `Menu Space leaked into an automatic opening jump (${leakedRise.toFixed(2)}px rise)`
      );
      await page.keyboard.up("Space");
      assert.equal(
        await page.locator("#overlay").evaluate((overlay) => overlay.classList.contains("active")),
        true,
        "Mouse activation should enter gameplay"
      );
    },
    { port: 4271 }
  );

  await withPage(
    "held Enter activation does not shoot",
    async (page) => {
      await page.evaluate(() => {
        window.__enterKeydowns = [];
        window.addEventListener("keydown", (event) => {
          if (event.code !== "Enter") return;
          window.__enterKeydowns.push({
            repeat: event.repeat,
            target: event.target?.id || event.target?.dataset?.action || event.target?.tagName,
          });
        });
      });
      const continueButton = page.getByRole("button", { name: "继续冒险" });
      await continueButton.focus();
      assert.equal(await continueButton.evaluate((button) => document.activeElement === button), true);

      await page.keyboard.down("Enter");
      await page.waitForFunction(() => document.querySelector("#overlay")?.classList.contains("active"));
      await page.keyboard.down("Enter");
      await page.waitForTimeout(100);

      assert.equal(
        await page.locator("#hudAmmo").textContent(),
        "14",
        "Holding Enter through menu activation must preserve the initial 14 shots"
      );
      const menuEvents = await page.evaluate(() => window.__enterKeydowns.slice());
      assert.ok(
        menuEvents.some((event) => event.repeat && event.target === "game"),
        `The menu regression must exercise a repeated Enter on the focused canvas: ${JSON.stringify(menuEvents)}`
      );
      await page.keyboard.up("Enter");

      await page.keyboard.press("Escape");
      await page.locator("#modal.active").waitFor();
      assert.equal(
        await page.evaluate(() => document.activeElement?.textContent?.trim()),
        "继续",
        "Pause should focus its resume action"
      );
      await page.keyboard.down("Enter");
      await page.waitForFunction(() =>
        document.querySelector("#overlay")?.classList.contains("active") &&
        !document.querySelector("#modal")?.classList.contains("active")
      );
      await page.keyboard.down("Enter");
      await page.waitForTimeout(100);
      assert.equal(
        await page.locator("#hudAmmo").textContent(),
        "14",
        "Holding Enter through resume activation must preserve ammunition"
      );
      const resumeEvents = (await page.evaluate(() => window.__enterKeydowns.slice())).slice(menuEvents.length);
      assert.ok(
        resumeEvents.some((event) => event.repeat && event.target === "game"),
        `The resume regression must exercise a repeated Enter on the canvas: ${JSON.stringify(resumeEvents)}`
      );
      await page.keyboard.up("Enter");

      await page.keyboard.down("Escape");
      await page.locator("#modal.active").waitFor();
      await page.getByRole("button", { name: "继续", exact: true }).click();
      await page.waitForFunction(() => !document.querySelector("#modal")?.classList.contains("active"));
      await page.keyboard.down("Escape");
      await page.waitForTimeout(100);
      assert.equal(
        await page.locator("#modal").evaluate((element) => element.classList.contains("active")),
        false,
        "A held Escape repeat must not reopen pause immediately after pointer resume"
      );
      await page.keyboard.up("Escape");
    },
    { port: 4272 }
  );

  await withPage(
    "settings range owns arrow keys",
    async (page) => {
      await installPlayerProbe(page);
      await page.getByRole("button", { name: "设置", exact: true }).click();
      const volume = page.locator("#volumeRange");
      await volume.focus();
      const before = Number(await volume.inputValue());

      await page.evaluate(() => {
        window.__rangeArrowEvent = null;
        window.addEventListener(
          "keydown",
          (event) => {
            if (event.code !== "ArrowRight" || event.target?.id !== "volumeRange") return;
            window.__rangeArrowEvent = {
              defaultPrevented: event.defaultPrevented,
              target: event.target.id,
            };
          },
          { once: true }
        );
      });
      await page.keyboard.down("ArrowRight");

      const rangeState = await page.evaluate(() => ({
        value: Number(document.querySelector("#volumeRange").value),
        event: window.__rangeArrowEvent,
        gameplayVisible: document.querySelector("#overlay").classList.contains("active"),
      }));
      assert.equal(rangeState.value, before + 1, "ArrowRight should change the focused range by one step");
      assert.deepEqual(
        rangeState.event,
        { defaultPrevented: false, target: "volumeRange" },
        "The settings ArrowRight event must remain owned by the native range control"
      );
      assert.equal(rangeState.gameplayVisible, false, "A settings arrow key must not enter gameplay");

      await page.locator("#settingsScreen [data-action='back']").click();
      await startWithMouse(page);
      await waitForPlayerSample(page, "nini");
      await page.keyboard.down("ArrowRight");
      const first = await latestPlayerSample(page, "nini");
      await page.waitForTimeout(100);
      const openingWindow = await playerSamples(page, "nini", first.time, first.time + 100);
      const horizontalDrift = Math.max(
        ...openingWindow.map((sample) => Math.abs(sample.x - first.x))
      );
      assert.ok(
        horizontalDrift < 3,
        `Settings ArrowRight leaked into opening movement (${horizontalDrift.toFixed(2)}px drift)`
      );
      await page.keyboard.up("ArrowRight");
    },
    { port: 4273 }
  );

  await withPage(
    "keyboard screen focus handoff",
    async (page) => {
      const settingsEntry = page.getByRole("button", { name: "设置", exact: true });
      await settingsEntry.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.querySelector("#settingsScreen")?.classList.contains("active"));

      const entered = await page.evaluate(() => {
        const active = document.activeElement;
        const settings = document.querySelector("#settingsScreen");
        const style = getComputedStyle(active);
        return {
          insideVisibleSettings: settings.contains(active) && settings.classList.contains("active"),
          isHeadingOrContainer: active.matches("h2, #settingsScreen"),
          visible:
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            active.getClientRects().length > 0,
          activeText: active.textContent.trim(),
          hiddenMenuButtonFocused: active === document.querySelector("#menu [data-action='settings']"),
        };
      });
      assert.equal(entered.insideVisibleSettings, true, `Focus missed settings: ${JSON.stringify(entered)}`);
      assert.equal(entered.isHeadingOrContainer, true, `Focus should land on the settings title/container: ${JSON.stringify(entered)}`);
      assert.equal(entered.visible, true, `Focused settings target must be visible: ${JSON.stringify(entered)}`);
      assert.equal(entered.hiddenMenuButtonFocused, false, "Focus must leave the hidden menu button");

      const back = page.locator("#settingsScreen [data-action='back']");
      await back.focus();
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.querySelector("#menu")?.classList.contains("active"));
      assert.equal(
        await page.evaluate(
          () => document.activeElement === document.querySelector("#menu [data-action='settings']")
        ),
        true,
        "Returning from settings should restore focus to the settings entry"
      );
    },
    { port: 4274 }
  );

  const characterCases = [
    { id: "nini", label: "妮妮", port: 4275 },
    { id: "yuan", label: "源源", port: 4276 },
  ];
  for (const character of characterCases) {
    await withPage(
      `${character.label} grounded opening jump`,
      async (page) => {
        await installPlayerProbe(page);
        await startWithMouse(page);
        await waitForPlayerSample(page, character.id);
        await page.waitForTimeout(55);

        const beforeJump = await latestPlayerSample(page, character.id);
        const pressedAt = await page.evaluate(() => performance.now());
        await page.keyboard.down("Space");
        await page.waitForTimeout(90);
        await page.keyboard.up("Space");

        const jumpFrames = await playerSamples(
          page,
          character.id,
          pressedAt,
          pressedAt + 100
        );
        assert.ok(jumpFrames.length >= 2, `${character.label} should render during the jump window`);
        const firstJumpRise = beforeJump.y - Math.min(...jumpFrames.map((sample) => sample.y));
        assert.ok(
          firstJumpRise > 15,
          `${character.label} did not move upward after a 55ms opening jump (${firstJumpRise.toFixed(2)}px)`
        );

        if (character.id === "nini") {
          await page.waitForTimeout(220);
          const beforeAirJump = await latestPlayerSample(page, character.id);
          const airJumpAt = await page.evaluate(() => performance.now());
          await page.keyboard.down("Space");
          await page.waitForTimeout(85);
          await page.keyboard.up("Space");
          const airJumpFrames = await playerSamples(
            page,
            character.id,
            airJumpAt,
            airJumpAt + 95
          );
          assert.ok(airJumpFrames.length >= 2, "Nini should render during the air-jump window");
          const airJumpRise = beforeAirJump.y - Math.min(...airJumpFrames.map((sample) => sample.y));
          assert.ok(
            airJumpRise > 20,
            `Nini's grounded opening jump consumed her air jump (${airJumpRise.toFixed(2)}px second rise)`
          );
        }

        assert.equal(
          (await page.locator("#hudCharacter").textContent()).trim(),
          character.label,
          `Expected ${character.label} to be the active character`
        );
      },
      {
        port: character.port,
        init:
          character.id === "yuan"
            ? () => {
                localStorage.setItem(
                  "nini-yuan-save-v1",
                  JSON.stringify({ schemaVersion: 2, selected: "yuan" })
                );
              }
            : undefined,
      }
    );
  }

  await withPage(
    "focus handoff releases held movement",
    async (page) => {
      await startWithMouse(page);
      await page.waitForFunction(() => document.activeElement?.id === "game");
      await page.keyboard.down("ArrowRight");
      await page.waitForFunction(() => {
        const width = Number.parseFloat(document.querySelector("#chapterBar span")?.style.width) || 0;
        return width >= 5;
      });

      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() => document.activeElement === document.querySelector('[data-action="pause"]')),
        true,
        "Tab from gameplay should focus the visible pause action"
      );
      const focusedProgress = Number.parseFloat(await page.locator("#chapterBar span").evaluate((bar) => bar.style.width));
      await page.keyboard.up("ArrowRight");
      await page.waitForTimeout(500);
      const releasedProgress = Number.parseFloat(await page.locator("#chapterBar span").evaluate((bar) => bar.style.width));
      assert.ok(
        releasedProgress - focusedProgress < 1,
        `Movement stayed latched after focus and key release (${focusedProgress}% to ${releasedProgress}%)`
      );
    },
    { port: 4277 }
  );

  console.log(
    "interaction-integrity-e2e: menu isolation, held activation, native controls, focus release, and grounded opening jumps passed"
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
