const { withPage } = require("../helpers/e2e");

const LANDSCAPE_PAGE = {
  viewport: { width: 844, height: 390 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
};

const COMPACT_LANDSCAPE_PAGE = {
  viewport: { width: 568, height: 320 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
};

const PORTRAIT_PAGE = {
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
};

function seedUnlockedSave() {
  localStorage.setItem(
    "nini-yuan-save-v1",
    JSON.stringify({
      schemaVersion: 2,
      selected: "nini",
      unlocked: 15,
      totalCoins: 389,
      bestTimes: {
        sakura: 22,
        moonruin: 15,
        cloudsea: 19,
        crystalforge: 16,
        auroracitadel: 28,
        stargatecove: 31,
        loopinglighthouse: 35,
        ringconservatory: 44,
        starbridgetide: 52,
        islandstarcore: 60,
      },
      levelStars: {
        sakura: 3,
        moonruin: 3,
        cloudsea: 3,
        crystalforge: 2,
        auroracitadel: 3,
        stargatecove: 2,
        loopinglighthouse: 2,
        ringconservatory: 2,
        starbridgetide: 2,
        islandstarcore: 1,
      },
      settings: { volume: 70, touch: 98, fx: true, bgmVolume: 60 },
    })
  );
}

function check(condition, message, details) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(details)}`);
}

function within(value, min, max) {
  return value >= min && value <= max;
}

async function runLandscapeChecks(name, port, pageOptions) {
  await withPage(
    name,
    async (page) => {
      if (pageOptions.viewport.height <= 340) {
        const compactMenu = await page.evaluate(() => {
          const footer = document.querySelector(".ambient-strip");
          const panel = document.querySelector("#menu.active");
          const saveStrip = document.querySelector("#saveStrip");
          const secretGem = document.querySelector(".menu-heroes .secret-gem");
          const saveRect = saveStrip.getBoundingClientRect();
          const secretRect = secretGem.getBoundingClientRect();
          return {
            footerDisplay: getComputedStyle(footer).display,
            panelScrollable: panel.scrollHeight <= panel.clientHeight || getComputedStyle(panel).overflowY === "auto",
            saveBottom: saveRect.bottom,
            secretTarget: { width: secretRect.width, height: secretRect.height },
            viewportHeight: innerHeight,
          };
        });
        check(
          compactMenu.footerDisplay === "none" &&
            compactMenu.panelScrollable &&
            compactMenu.saveBottom <= compactMenu.viewportHeight &&
            compactMenu.secretTarget.width >= 48 &&
            compactMenu.secretTarget.height >= 48,
          "The 568 by 320 menu must keep its save strip readable without a decorative footer overlay",
          compactMenu
        );
      }
      await page.getByRole("button", { name: "选择关卡" }).tap();
      await page.locator("#levelScreen.active").waitFor();

      const chapterEleven = page.locator("#levelList .level-item").filter({ hasText: "第十一章 相位浅滩" });
      check((await chapterEleven.count()) === 1, "Chapter 11 must be unlocked exactly once", await chapterEleven.count());
      await chapterEleven.tap();

      await page.waitForFunction(() => {
        const status = document.querySelector("#hudStatus.phase-critical");
        if (!status || !status.textContent.includes("星潮")) return false;
        const style = getComputedStyle(status);
        const rect = status.getBoundingClientRect();
        return style.display !== "none" && style.visibility === "visible" && rect.width > 0 && rect.height > 0;
      });

      const state = await page.evaluate(() => {
        const describe = (element) => {
          const style = getComputedStyle(element);
          const rect = element.getBoundingClientRect();
          return {
            computedWidth: Number.parseFloat(style.width),
            computedHeight: Number.parseFloat(style.height),
            fontSize: Number.parseFloat(style.fontSize),
            display: style.display,
            visibility: style.visibility,
            opacity: Number.parseFloat(style.opacity),
            rect: {
              top: rect.top,
              right: rect.right,
              bottom: rect.bottom,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            },
          };
        };
        const status = document.querySelector("#hudStatus.phase-critical");
        const touchControls = document.querySelector("#touchControls");
        const topHud = document.querySelector(".top-hud");
        const toast = document.querySelector("#toast");
        const wardenBar = document.querySelector("#wardenBar");
        const wasWardenHidden = wardenBar.hidden;
        toast.style.transition = "none";
        wardenBar.hidden = false;
        toast.textContent = "星莓：身体变大，生命上限提升";
        toast.classList.add("show");
        void toast.offsetWidth;
        const gameplayToast = describe(toast).rect;
        const wardenHud = {
          rect: describe(wardenBar).rect,
          title: describe(document.querySelector("#wardenName")),
          phase: describe(document.querySelector("#wardenPhase")),
        };
        const hudType = [...document.querySelectorAll(
          "#overlay.active .hud-pill, #overlay.active .hud-button, #overlay.active .hud-icon, #wardenBar:not([hidden]) .warden-bar-title, #wardenBar:not([hidden]) .warden-bar-phase",
        )]
          .map(describe)
          .filter((item) => item.display !== "none" && item.visibility === "visible" && item.rect.width > 0 && item.rect.height > 0);
        toast.classList.remove("show");
        toast.textContent = "";
        toast.style.removeProperty("transition");
        wardenBar.hidden = wasWardenHidden;
        return {
          environment: {
            coarse: matchMedia("(pointer: coarse)").matches,
            touchPoints: navigator.maxTouchPoints,
            landscape: matchMedia("(orientation: landscape)").matches,
            viewport: { width: innerWidth, height: innerHeight },
          },
          touchDisplay: getComputedStyle(touchControls).display,
          touchButtons: [...document.querySelectorAll(".touch-btn")].map((button) => ({
            action: button.dataset.touch,
            ...describe(button),
          })),
          pause: describe(document.querySelector('[data-action="pause"]')),
          topHud: {
            clientWidth: topHud.clientWidth,
            scrollWidth: topHud.scrollWidth,
          },
          hudType,
          gameplayToast,
          wardenHud,
          status: {
            text: status.textContent.trim(),
            className: status.className,
            ...describe(status),
          },
        };
      });

      check(
        state.environment.coarse && state.environment.touchPoints > 0 && state.environment.landscape,
        "Landscape checks require a real coarse touch context",
        state.environment
      );
      check(state.touchDisplay !== "none", "Touch controls must be rendered during play", state);
      check(state.touchButtons.length === 5, "All five touch actions must be present", state.touchButtons);
      check(
        state.touchButtons.every(
          (button) =>
            within(button.computedWidth, 64, 84) &&
            within(button.computedHeight, 64, 84) &&
            within(button.rect.width, 64, 84) &&
            within(button.rect.height, 64, 84) &&
            button.display !== "none" &&
            button.visibility === "visible" &&
            button.opacity > 0
        ),
        "Landscape touch controls must compute to 64 through 84 CSS pixels",
        state.touchButtons
      );
      check(
        state.pause.rect.width >= 48 &&
          state.pause.rect.height >= 48 &&
          state.pause.display !== "none" &&
          state.pause.visibility === "visible" &&
          state.pause.rect.left >= 0 &&
          state.pause.rect.right <= state.environment.viewport.width,
        "The coarse-pointer pause target must be at least 48 by 48 CSS pixels and remain inside the viewport",
        state.pause
      );
      check(
        state.topHud.scrollWidth <= state.topHud.clientWidth,
        "The compact HUD must not clip or horizontally overflow its instruments",
        state.topHud
      );
      check(
        state.hudType.length > 0 && state.hudType.every((item) => item.fontSize >= 13),
        "Visible coarse-pointer HUD type must preserve the 13-pixel design floor",
        state.hudType
      );
      check(
        state.gameplayToast.top >= 0 && state.gameplayToast.bottom <= state.environment.viewport.height * 0.31,
        "Transient gameplay notices must remain in the upper safe rail above the protagonist",
        state.gameplayToast
      );
      check(
        state.gameplayToast.bottom <= state.wardenHud.rect.top || state.gameplayToast.top >= state.wardenHud.rect.bottom,
        "A live gameplay notice must not cover the guardian title, phase, or health rail",
        { toast: state.gameplayToast, warden: state.wardenHud }
      );
      check(
        state.wardenHud.title.fontSize >= 13 && state.wardenHud.phase.fontSize >= 13,
        "Guardian title and phase text must preserve the gameplay HUD type floor",
        state.wardenHud
      );
      check(
        state.status.text.includes("星潮") &&
          state.status.className.split(/\s+/).includes("phase-critical") &&
          state.status.display !== "none" &&
          state.status.visibility === "visible" &&
          state.status.rect.width > 0 &&
          state.status.rect.height > 0 &&
          state.status.rect.left >= 0 &&
          state.status.rect.right <= state.environment.viewport.width,
        "World 3 must keep its phase-critical tide status visible in landscape",
        state.status
      );
    },
    { port, init: seedUnlockedSave, page: pageOptions }
  );
}

async function runPortraitChecks() {
  await withPage(
    "mobile portrait integrity",
    async (page) => {
      const environment = await page.evaluate(() => ({
        coarse: matchMedia("(pointer: coarse)").matches,
        touchPoints: navigator.maxTouchPoints,
        portrait: matchMedia("(orientation: portrait)").matches,
        viewport: { width: innerWidth, height: innerHeight },
      }));
      check(
        environment.coarse && environment.touchPoints > 0 && environment.portrait,
        "Portrait checks require a real coarse touch context",
        environment
      );

      await page.getByRole("button", { name: "继续冒险" }).tap();
      const rotatePrompt = page.locator("#rotatePrompt");
      await rotatePrompt.waitFor({ state: "visible" });

      const rotateState = await page.evaluate(() => {
        const prompt = document.querySelector("#rotatePrompt");
        const action = prompt.querySelector('[data-action="exit-game"]');
        const promptStyle = getComputedStyle(prompt);
        const actionStyle = getComputedStyle(action);
        const actionRect = action.getBoundingClientRect();
        return {
          promptDisplay: promptStyle.display,
          promptVisibility: promptStyle.visibility,
          action: {
            text: action.textContent.trim(),
            display: actionStyle.display,
            visibility: actionStyle.visibility,
            width: actionRect.width,
            height: actionRect.height,
          },
        };
      });
      check(
        rotateState.promptDisplay !== "none" && rotateState.promptVisibility === "visible",
        "Portrait gameplay must show the rotate prompt",
        rotateState
      );
      check(
        rotateState.action.text === "返回菜单" &&
          rotateState.action.display !== "none" &&
          rotateState.action.visibility === "visible" &&
          rotateState.action.width >= 48 &&
          rotateState.action.height >= 48,
        "The rotate prompt must expose a 48-pixel escape target",
        rotateState.action
      );

      await page.locator('#rotatePrompt [data-action="exit-game"]').tap();
      await page.locator("#menu.active").waitFor();
      const exited = await page.evaluate(() => ({
        activeScreen: document.querySelector(".screen.active")?.id,
        hudActive: document.querySelector("#overlay").classList.contains("active"),
        touchPlaying: document.querySelector("#touchControls").classList.contains("playing"),
        rotateDisplay: getComputedStyle(document.querySelector("#rotatePrompt")).display,
      }));
      check(
        exited.activeScreen === "menu" && !exited.hudActive && !exited.touchPlaying && exited.rotateDisplay === "none",
        "Rotate-prompt exit must leave gameplay and restore the menu",
        exited
      );

      await page.getByRole("button", { name: "设置" }).tap();
      await page.locator("#settingsScreen.active").waitFor();
      const settingRows = await page.evaluate(() =>
        [...document.querySelectorAll(".settings-list label[data-rune]")].map((row) => ({
          rune: row.dataset.rune,
          paddingLeft: Number.parseFloat(getComputedStyle(row).paddingLeft),
          width: row.getBoundingClientRect().width,
        }))
      );
      check(
        settingRows.length >= 7 && settingRows.every((row) => row.paddingLeft >= 44 && row.width > 0),
        "Every settings rune row must reserve at least 44 pixels on the left",
        settingRows
      );

      await page.locator("#settingsScreen [data-action='back']").tap();
      await page.locator("#menu.active").waitFor();
      await page.getByRole("button", { name: "继续冒险" }).tap();
      await rotatePrompt.waitFor({ state: "visible" });
      await page.locator('#rotatePrompt [data-action="continue-portrait"]').tap();
      await page.waitForFunction(() => document.querySelector("#overlay").classList.contains("active"));
      const portraitRails = await page.evaluate(() => {
        const rect = (selector) => {
          const bounds = document.querySelector(selector).getBoundingClientRect();
          return { top: bounds.top, right: bounds.right, bottom: bounds.bottom, left: bounds.left };
        };
        const toast = document.querySelector("#toast");
        const wardenBar = document.querySelector("#wardenBar");
        const chain = document.querySelector("#hudChain");
        toast.style.transition = "none";
        wardenBar.hidden = false;
        const normalWarden = rect("#wardenBar");
        toast.textContent = "守望者测试通知";
        toast.classList.add("show");
        chain.hidden = false;
        void toast.offsetWidth;
        const result = {
          viewport: { width: innerWidth, height: innerHeight },
          topHud: rect(".top-hud"),
          progress: rect("#chapterBar"),
          toast: rect("#toast"),
          normalWarden,
          stackedWarden: rect("#wardenBar"),
          stackedChain: rect("#hudChain"),
        };
        toast.classList.remove("show");
        toast.textContent = "";
        toast.style.removeProperty("transition");
        wardenBar.hidden = true;
        chain.hidden = true;
        return result;
      });
      const portraitInstrumentBottom = Math.max(portraitRails.topHud.bottom, portraitRails.progress.bottom);
      check(
        portraitRails.toast.top >= portraitInstrumentBottom &&
          portraitRails.normalWarden.top >= portraitInstrumentBottom &&
          portraitRails.stackedWarden.top >= portraitRails.toast.bottom &&
          portraitRails.stackedChain.top >= portraitRails.stackedWarden.bottom &&
          portraitRails.toast.left >= 0 &&
          portraitRails.toast.right <= portraitRails.viewport.width,
        "Continued portrait play must stack notices and guardian instruments below the top HUD",
        portraitRails
      );
      await page.keyboard.press("Escape");
      await page.locator("#modal.active").waitFor();
      await page.locator("#modal .modal-card").evaluate(async (card) => {
        const entrance = card.getAnimations().find((animation) => animation.animationName === "modal-pop");
        if (entrance) await entrance.finished;
      });

      const modalState = await page.evaluate(() => {
        const container = document.querySelector("#modalActions");
        const buttons = [...container.querySelectorAll("button")].map((button) => {
          const rect = button.getBoundingClientRect();
          return {
            text: button.textContent.trim(),
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          };
        });
        return {
          display: getComputedStyle(container).display,
          buttons,
          modalVisible: getComputedStyle(document.querySelector("#modal")).visibility === "visible",
        };
      });
      const alignedLeft = modalState.buttons.every(
        (button) => Math.abs(button.left - modalState.buttons[0].left) <= 1
      );
      const equalWidth = modalState.buttons.every(
        (button) => Math.abs(button.width - modalState.buttons[0].width) <= 1
      );
      const verticallySeparated = modalState.buttons.slice(1).every(
        (button, index) => button.top >= modalState.buttons[index].bottom
      );
      check(
        modalState.modalVisible &&
          modalState.display === "grid" &&
          modalState.buttons.length === 3 &&
          modalState.buttons.every((button) => button.height >= 48) &&
          alignedLeft &&
          equalWidth &&
          verticallySeparated,
        "The 390-pixel pause modal must use one full-width action column with 48-pixel targets",
        modalState
      );
    },
    { port: 43172, init: seedUnlockedSave, page: PORTRAIT_PAGE }
  );
}

async function runMenuToastTransitionCheck() {
  await withPage(
    "mobile menu toast transition",
    async (page) => {
      await page.getByRole("button", { name: "选择角色" }).tap();
      await page.locator('[data-pick="yuan"]').tap();
      const menuToast = await page.evaluate(() => ({
        visible: document.querySelector("#toast").classList.contains("show"),
        text: document.querySelector("#toast").textContent.trim(),
      }));
      check(menuToast.visible && menuToast.text.includes("已选择"), "Character selection should expose its menu feedback", menuToast);

      await page.locator('#characterScreen [data-action="back"]').tap();
      await page.getByRole("button", { name: "继续冒险" }).tap();
      await page.waitForFunction(() => document.querySelector("#chapterIntro").classList.contains("active"));
      const gameplayState = await page.evaluate(() => ({
        introActive: document.querySelector("#chapterIntro").classList.contains("active"),
        toastVisible: document.querySelector("#toast").classList.contains("show"),
        toastText: document.querySelector("#toast").textContent,
      }));
      check(
        gameplayState.introActive && !gameplayState.toastVisible && gameplayState.toastText === "",
        "Menu feedback must be cleared before the chapter intro enters gameplay",
        gameplayState
      );
    },
    { port: 43174, page: LANDSCAPE_PAGE }
  );
}

async function run() {
  await runLandscapeChecks("mobile landscape integrity", 43171, LANDSCAPE_PAGE);
  await runLandscapeChecks("compact mobile landscape integrity", 43173, COMPACT_LANDSCAPE_PAGE);
  await runPortraitChecks();
  await runMenuToastTransitionCheck();
  console.log("mobile-integrity-e2e: landscape controls, phase HUD, portrait escape, toast transition, modal, and settings passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
