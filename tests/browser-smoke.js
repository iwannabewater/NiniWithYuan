const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

const PORT = 4173;
const BASE = `http://127.0.0.1:${PORT}`;

function startServer() {
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: process.cwd(),
    stdio: "ignore",
  });
  return server;
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const response = await fetch(BASE);
      if (response.ok) return;
    } catch {
      // Keep polling until the static server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error("Static server did not start");
}

async function withPage(testName, fn, options = {}) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage(options.page || { viewport: { width: 1280, height: 720 } });
  if (options.init) await page.addInitScript(options.init);
  await page.addInitScript(() => {
    window.__characterSpriteDraws = 0;
    const originalDrawImage = CanvasRenderingContext2D.prototype.drawImage;
    CanvasRenderingContext2D.prototype.drawImage = function patchedDrawImage(source, ...args) {
      if (source instanceof HTMLImageElement && source.src.includes("/assets/characters/")) {
        window.__characterSpriteDraws += 1;
      }
      return originalDrawImage.call(this, source, ...args);
    };
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto(BASE, { waitUntil: "networkidle" });
  await fn(page);
  await browser.close();
  if (errors.length) throw new Error(`${testName}: ${errors.join("\n")}`);
}

async function run() {
  const server = startServer();
  try {
    await waitForServer();

    await withPage("desktop gameplay", async (page) => {
      await page.getByText("继续冒险").click();
      await page.waitForTimeout(500);
      await page.keyboard.down("ArrowRight");
      await page.keyboard.press("Space");
      await page.keyboard.press("KeyK");
      await page.waitForTimeout(350);
      await page.keyboard.up("ArrowRight");
      const state = await page.evaluate(() => {
        const canvas = document.querySelector("#game");
        const ctx = canvas.getContext("2d");
        const pixel = Array.from(ctx.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data);
        return {
          hud: document.querySelector("#overlay").classList.contains("active"),
          menu: document.querySelector("#menu").classList.contains("active"),
          modal: document.querySelector("#modal").classList.contains("active"),
          ammo: Number(document.querySelector("#hudAmmo").textContent),
          skill: document.querySelector("#hudSkill").textContent.trim(),
          intro: document.querySelector("#chapterIntro").classList.contains("active"),
          tips: [...document.querySelectorAll("#controlTips span")].map((tip) => tip.textContent.trim()),
          characterSpriteDraws: window.__characterSpriteDraws,
          pixel,
        };
      });
      if (!state.hud || state.menu || state.modal || state.ammo >= 14 || !state.skill.includes("技能") || !state.intro || state.characterSpriteDraws <= 0 || state.tips.length < 5 || state.pixel[3] === 0) {
        throw new Error(`Game did not enter playable state: ${JSON.stringify(state)}`);
      }
    });

    await withPage(
      "roundRect fallback",
      async (page) => {
        await page.getByText("继续冒险").click();
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => ({
          hud: document.querySelector("#overlay").classList.contains("active"),
        }));
        if (!state.hud) throw new Error(`HUD missing with roundRect fallback: ${JSON.stringify(state)}`);
      },
      { init: () => { delete CanvasRenderingContext2D.prototype.roundRect; } }
    );

    await withPage(
      "storage unavailable",
      async (page) => {
        await page.getByText("选择角色").click();
        await page.locator('[data-pick="yuan"]').click();
        await page.waitForTimeout(250);
        const state = await page.evaluate(() => ({
          selected: !!document.querySelector('.character-card.selected[data-character="yuan"]'),
          toast: document.querySelector("#toast").textContent,
        }));
        if (!state.selected || !state.toast.includes("本地存档暂不可用")) {
          throw new Error(`Storage fallback failed: ${JSON.stringify(state)}`);
        }
      },
      {
        init: () => {
          Object.defineProperty(window, "localStorage", {
            get() {
              throw new Error("storage unavailable");
            },
          });
        },
      }
    );

    await withPage(
      "mobile controls fit",
      async (page) => {
        await page.getByText("继续冒险").tap();
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => {
          const controls = [...document.querySelectorAll(".touch-btn")].map((button) => {
            const rect = button.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, label: button.textContent.trim() };
          });
          const tips = document.querySelector("#controlTips").getBoundingClientRect();
          return {
            hud: document.querySelector("#overlay").classList.contains("active"),
            intro: document.querySelector("#chapterIntro").classList.contains("active"),
            touchDisplay: getComputedStyle(document.querySelector("#touchControls")).display,
            allVisible: controls.every((rect) => rect.left >= -1 && rect.right <= innerWidth + 1),
            tipsAboveControls: tips.bottom <= Math.min(...controls.map((rect) => rect.top)) - 6,
            controls,
          };
        });
        if (!state.hud || !state.intro || state.touchDisplay === "none" || !state.allVisible || !state.tipsAboveControls) {
          throw new Error(`Mobile controls invalid: ${JSON.stringify(state)}`);
        }
        if (!state.controls.some((button) => button.label === "弹")) {
          throw new Error(`Shoot control missing: ${JSON.stringify(state)}`);
        }
      },
      { page: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }
    );

    await withPage(
      "landscape mobile controls fit",
      async (page) => {
        const menuState = await page.evaluate(() => {
          const panel = document.querySelector("#menu.panel");
          const panelRect = panel.getBoundingClientRect();
          const actions = [...document.querySelectorAll(".menu-actions button")].map((button) => {
            const rect = button.getBoundingClientRect();
            return { top: Math.round(rect.top), width: rect.width };
          });
          const hero = document.querySelector(".menu-heroes").getBoundingClientRect();
          return {
            panelWithinViewport: panelRect.left >= -1 && panelRect.right <= innerWidth + 1 && panelRect.top >= -1 && panelRect.bottom <= innerHeight + 1,
            panelNoOverflow: panel.scrollWidth <= panel.clientWidth + 1 && panel.scrollHeight <= panel.clientHeight + 1,
            actionsSingleRow: new Set(actions.map((rect) => rect.top)).size === 1,
            actionsReadable: actions.every((rect) => rect.width >= 86),
            heroWithinPanel: hero.left >= panelRect.left && hero.right <= panelRect.right && hero.top >= panelRect.top && hero.bottom <= panelRect.bottom,
            panel: { left: panelRect.left, right: panelRect.right, top: panelRect.top, bottom: panelRect.bottom, scrollWidth: panel.scrollWidth, clientWidth: panel.clientWidth, scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight },
            actions,
          };
        });
        if (!menuState.panelWithinViewport || !menuState.panelNoOverflow || !menuState.actionsSingleRow || !menuState.actionsReadable || !menuState.heroWithinPanel) {
          throw new Error(`Landscape menu layout invalid: ${JSON.stringify(menuState)}`);
        }

        await page.getByText("继续冒险").tap();
        await page.waitForTimeout(500);
        const state = await page.evaluate(() => {
          const rectOf = (el) => {
            const rect = el.getBoundingClientRect();
            return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          };
          const controls = [...document.querySelectorAll(".touch-btn")].map(rectOf);
          const hudRects = [...document.querySelectorAll(".top-hud > *")].map(rectOf);
          const intro = rectOf(document.querySelector("#chapterIntro"));
          const bossbar = rectOf(document.querySelector("#chapterBar"));
          const controlsTop = Math.min(...controls.map((rect) => rect.top));
          const hudBottom = Math.max(...hudRects.map((rect) => rect.bottom));
          return {
            hud: document.querySelector("#overlay").classList.contains("active"),
            introActive: document.querySelector("#chapterIntro").classList.contains("active"),
            touchDisplay: getComputedStyle(document.querySelector("#touchControls")).display,
            tipsDisplay: getComputedStyle(document.querySelector("#controlTips")).display,
            allControlsVisible: controls.every((rect) => rect.left >= -1 && rect.right <= innerWidth + 1 && rect.bottom <= innerHeight + 1),
            hudAboveControls: hudBottom <= controlsTop - 8,
            introWithinViewport: intro.left >= -1 && intro.right <= innerWidth + 1 && intro.bottom <= controlsTop - 8,
            bossbarWithinViewport: bossbar.left >= -1 && bossbar.right <= innerWidth + 1,
            controls,
            hudRects,
            intro,
            bossbar,
          };
        });
        if (!state.hud || !state.introActive || state.touchDisplay === "none" || state.tipsDisplay !== "none" || !state.allControlsVisible || !state.hudAboveControls || !state.introWithinViewport || !state.bossbarWithinViewport) {
          throw new Error(`Landscape mobile layout invalid: ${JSON.stringify(state)}`);
        }
      },
      { page: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } }
    );

    console.log("browser-smoke: 5 passed");
  } finally {
    server.kill();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
