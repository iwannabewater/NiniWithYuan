const { withPage } = require("../helpers/e2e");

function check(condition, message, details) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(details)}`);
}

async function runFinePointerChecks() {
  await withPage(
    "fine pointer responsive gates",
    async (page) => {
      await page.getByText("继续冒险").click();
      await page.waitForTimeout(120);
      let state = await page.evaluate(() => ({
        touch: getComputedStyle(document.querySelector("#touchControls")).display,
        rotate: getComputedStyle(document.querySelector("#rotatePrompt")).display,
        hud: getComputedStyle(document.querySelector("#overlay")).visibility,
      }));
      check(state.touch === "none" && state.rotate === "none" && state.hud === "visible", "800 by 600 desktop must not inherit touch UI", state);

      await page.setViewportSize({ width: 600, height: 900 });
      await page.waitForTimeout(120);
      state = await page.evaluate(() => ({
        touch: getComputedStyle(document.querySelector("#touchControls")).display,
        rotate: getComputedStyle(document.querySelector("#rotatePrompt")).display,
        hud: getComputedStyle(document.querySelector("#overlay")).visibility,
        gated: document.querySelector("#shell").classList.contains("portrait-gated"),
      }));
      check(state.touch === "none" && state.rotate === "none" && state.hud === "visible" && !state.gated, "narrow desktop portrait must remain playable", state);
    },
    { port: 43180, page: { viewport: { width: 800, height: 600 } } }
  );
}

async function runDesktopScreenChecks() {
  await withPage(
    "desktop atlas screens",
    async (page) => {
      await page.getByText("选择角色").click();
      let state = await page.evaluate(() => {
        const panel = document.querySelector("#characterScreen");
        return {
          fits: panel.scrollHeight <= panel.clientHeight + 2,
          pressed: [...document.querySelectorAll("[data-pick]")].map((button) => button.getAttribute("aria-pressed")),
        };
      });
      check(state.fits && state.pressed.join(",") === "true,false", "character comparison should fit and expose selection state", state);
      await page.locator('[data-pick="yuan"]').click();
      state = await page.evaluate(() => [...document.querySelectorAll("[data-pick]")].map((button) => ({ pressed: button.getAttribute("aria-pressed"), text: button.textContent.trim() })));
      check(state[0].pressed === "false" && state[1].pressed === "true" && state[1].text.includes("已选"), "character selection should update text and ARIA together", state);

      await page.locator("#characterScreen [data-action=back]").click();
      await page.getByText("选择关卡").click();
      state = await page.evaluate(() => {
        const panel = document.querySelector("#levelScreen");
        const locked = document.querySelector(".level-item.locked");
        return {
          fits: panel.scrollHeight <= panel.clientHeight + 2,
          groups: [...document.querySelectorAll(".level-world-group")].map((group) => group.querySelectorAll(".level-item").length),
          locked: {
            disabled: locked.disabled,
            text: locked.querySelector(".level-state")?.textContent.trim(),
            opacity: Number(getComputedStyle(locked).opacity),
          },
        };
      });
      check(
        state.fits && state.groups.length === 3 && state.groups.every((count) => count === 5) && state.locked.disabled && state.locked.text.includes("完成上一章") && state.locked.opacity >= 0.9,
        "chapter atlas should fit and communicate locks through text, semantics, and texture",
        state
      );

      await page.locator("#levelScreen [data-action=back]").click();
      await page.locator('#menu [data-action="settings"]').click();
      await page.locator("#hudScaleRange").fill("130");
      state = await page.evaluate(() => ({
        fits: document.querySelector("#settingsScreen").scrollHeight <= document.querySelector("#settingsScreen").clientHeight + 2,
        output: document.querySelector("#hudScaleValue").value,
        cssScale: getComputedStyle(document.documentElement).getPropertyValue("--hud-scale").trim(),
      }));
      check(state.fits && state.output === "130%" && state.cssScale === "1.3", "settings should preview and expose display scale", state);
    },
    { port: 43181, page: { viewport: { width: 1280, height: 720 } } }
  );
}

async function runPortraitChecks() {
  await withPage(
    "portrait orientation dialog",
    async (page) => {
      await page.getByText("继续冒险").tap();
      await page.locator("#rotatePrompt").waitFor({ state: "visible" });
      let state = await page.evaluate(() => {
        const prompt = document.querySelector("#rotatePrompt");
        const buttons = [...prompt.querySelectorAll("button")].map((button) => {
          const rect = button.getBoundingClientRect();
          return { action: button.dataset.action, width: rect.width, height: rect.height };
        });
        return {
          gated: document.querySelector("#shell").classList.contains("portrait-gated"),
          focus: document.activeElement?.dataset?.action,
          role: prompt.getAttribute("role"),
          buttons,
          hud: getComputedStyle(document.querySelector("#overlay")).visibility,
        };
      });
      check(
        state.gated && state.focus === "continue-portrait" && state.role === "dialog" && state.hud === "hidden" && state.buttons.every((button) => button.width >= 48 && button.height >= 48),
        "portrait gate should own focus and expose two usable choices",
        state
      );

      const gateButtons = page.locator("#rotatePrompt button");
      await gateButtons.last().focus();
      await page.keyboard.press("Tab");
      check(await gateButtons.first().evaluate((button) => document.activeElement === button), "portrait gate should wrap focus after its final action");
      await page.keyboard.press("Shift+Tab");
      check(await gateButtons.last().evaluate((button) => document.activeElement === button), "portrait gate should wrap focus before its first action");
      const frozenTime = await page.locator("#hudTime").textContent();
      await page.waitForTimeout(1150);
      const gatedTime = await page.locator("#hudTime").textContent();
      check(gatedTime === frozenTime, "portrait gate should freeze level simulation while awaiting a choice", { frozenTime, gatedTime });

      await page.locator('[data-action="continue-portrait"]').tap();
      await page.waitForTimeout(100);
      state = await page.evaluate(() => ({
        gated: document.querySelector("#shell").classList.contains("portrait-gated"),
        rotate: getComputedStyle(document.querySelector("#rotatePrompt")).display,
        hud: getComputedStyle(document.querySelector("#overlay")).visibility,
        touch: getComputedStyle(document.querySelector("#touchControls")).display,
        focus: document.activeElement?.id,
        healthLabel: document.querySelector("#hudHealth").parentElement.getAttribute("aria-label"),
      }));
      const healthGroup = await page.getByRole("group", { name: "生命 3 / 3" }).count();
      check(!state.gated && state.rotate === "none" && state.hud === "visible" && state.touch !== "none" && state.focus === "game" && state.healthLabel.includes("3 / 3") && healthGroup === 1, "portrait continuation should restore a semantically exposed playable surface", { ...state, healthGroup });

      await page.keyboard.press("Escape");
      await page.locator("#modal.active").waitFor();
      const pauseCopy = await page.locator("#modalText").textContent();
      check(pauseCopy.includes("左侧星盘") && !pauseCopy.includes("WASD"), "touch pause help must match the active input modality", pauseCopy);
    },
    { port: 43182, page: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }
  );
}

async function runLandscapeChecks() {
  await withPage(
    "landscape atlas and touch rail",
    async (page) => {
      let state = await page.evaluate(() => [...document.querySelectorAll("#menu .menu-actions button:not(.primary)")].map((button) => {
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }));
      check(state.every((rect) => rect.width >= 44 && rect.height >= 44), "landscape menu actions should retain 44-pixel targets", state);

      await page.getByText("选择角色").tap();
      state = await page.evaluate(() => [...document.querySelectorAll("#characterScreen [data-pick]")].map((button) => {
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }));
      check(state.every((rect) => rect.width >= 44 && rect.height >= 44), "landscape character actions should retain 44-pixel targets", state);
      await page.locator("#characterScreen [data-action=back]").tap();

      await page.getByText("选择关卡").tap();
      state = await page.evaluate(() => {
        const panel = document.querySelector("#levelScreen");
        const list = document.querySelector(".level-list");
        return {
          verticalFit: panel.scrollHeight <= panel.clientHeight + 2 && list.scrollHeight <= list.clientHeight + 2,
          horizontalPages: list.scrollWidth > list.clientWidth * 2.8,
          groups: document.querySelectorAll(".level-world-group").length,
        };
      });
      check(state.verticalFit && state.horizontalPages && state.groups === 3, "landscape chapters should page horizontally without vertical overflow", state);

      await page.locator("#levelScreen [data-action=back]").tap();
      await page.getByRole("button", { name: "设置", exact: true }).tap();
      await page.locator("#hudScaleRange").fill("140");
      await page.locator("#settingsScreen [data-action=back]").tap();
      await page.getByText("继续冒险").tap();
      await page.waitForTimeout(120);
      const left = page.locator('[data-touch="left"]');
      const right = page.locator('[data-touch="right"]');
      const leftBox = await left.boundingBox();
      const rightBox = await right.boundingBox();
      check(leftBox && rightBox, "movement rail must be visible", { leftBox, rightBox });
      await page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(rightBox.x + rightBox.width * 0.75, rightBox.y + rightBox.height / 2);
      await page.waitForTimeout(60);
      state = await page.evaluate(() => ({
        left: document.querySelector('[data-touch="left"]').classList.contains("active"),
        right: document.querySelector('[data-touch="right"]').classList.contains("active"),
      }));
      await page.mouse.up();
      check(!state.left && state.right, "captured movement pointer should slide from left to right intent", state);

      state = await page.evaluate(() => {
        const rects = [...document.querySelectorAll(".touch-btn")].map((button) => {
          const rect = button.getBoundingClientRect();
          return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
        });
        const overlaps = rects.some((a, i) => rects.some((b, j) => i < j && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top));
        const hudBottom = Math.max(...[...document.querySelectorAll(".hud-corner")].map((element) => element.getBoundingClientRect().bottom));
        const controlTop = Math.min(...rects.map((rect) => rect.top));
        const skill = document.querySelector("#hudSkill");
        return {
          rects,
          overlaps,
          clearBand: controlTop - hudBottom,
          hudScale: getComputedStyle(document.documentElement).getPropertyValue("--hud-scale").trim(),
          skillFont: Number.parseFloat(getComputedStyle(skill).fontSize),
          skillHeight: skill.getBoundingClientRect().height,
        };
      });
      check(!state.overlaps && state.rects.every((rect) => rect.width >= 64 && rect.height >= 64) && state.clearBand >= 80 && state.hudScale === "1.4" && state.skillFont >= 13.9 && state.skillHeight >= 41.9, "touch targets and scaled HUD should remain separate with a clear play band", state);
    },
    { port: 43183, page: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }
  );
}

async function runCompactPortraitChecks() {
  await withPage(
    "compact portrait controls and settings",
    async (page) => {
      await page.getByText("选择角色").tap();
      let state = await page.evaluate(() => {
        const panel = document.querySelector("#characterScreen");
        panel.scrollTop = panel.scrollHeight;
        const action = panel.querySelector(".character-card button").getBoundingClientRect();
        const bounds = panel.getBoundingClientRect();
        return {
          panelScrollable: panel.scrollHeight > panel.clientHeight,
          action: { top: action.top, bottom: action.bottom, height: action.height },
          panel: { top: bounds.top, bottom: bounds.bottom },
        };
      });
      check(state.action.height >= 48 && state.action.top >= state.panel.top && state.action.bottom <= state.panel.bottom, "compact character cards should keep their selection action reachable after panel scroll", state);

      await page.locator("#characterScreen [data-action=back]").tap();
      await page.getByRole("button", { name: "设置", exact: true }).tap();
      state = await page.evaluate(() => {
        const panel = document.querySelector("#settingsScreen");
        const controls = [...panel.querySelectorAll("label, input")].map((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, right: rect.right, width: rect.width };
        });
        return {
          panelWidth: panel.clientWidth,
          panelScrollWidth: panel.scrollWidth,
          viewport: innerWidth,
          controls,
        };
      });
      check(
        state.panelScrollWidth <= state.panelWidth + 1 && state.controls.every((rect) => rect.left >= 0 && rect.right <= state.viewport + 1 && rect.width > 0),
        "compact settings should not overflow the viewport horizontally",
        state,
      );

      await page.locator("#settingsScreen [data-action=back]").tap();
      await page.getByText("继续冒险").tap();
      await page.locator("#rotatePrompt").waitFor({ state: "visible" });
      await page.locator('[data-action="continue-portrait"]').tap();
      await page.waitForTimeout(80);
      state = await page.evaluate(() => {
        const touch = [...document.querySelectorAll(".touch-btn")].map((button) => {
          const rect = button.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        });
        const pause = document.querySelector('[data-action="pause"]').getBoundingClientRect();
        return { touch, pause: { width: pause.width, height: pause.height } };
      });
      check(
        state.touch.every((rect) => rect.width >= 64 && rect.height >= 64) && state.pause.width >= 48 && state.pause.height >= 48,
        "compact portrait gameplay should preserve 64-pixel actions and a 48-pixel pause target",
        state,
      );
    },
    { port: 43187, page: { viewport: { width: 320, height: 568 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } },
  );
}

async function run() {
  await runFinePointerChecks();
  await runDesktopScreenChecks();
  await runPortraitChecks();
  await runLandscapeChecks();
  await runCompactPortraitChecks();
  console.log("ui-layout-integrity-e2e: 5 viewport and input modality suites passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
