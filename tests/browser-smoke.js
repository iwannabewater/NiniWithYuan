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
          ambientHidden: getComputedStyle(document.querySelector(".ambient-left")).opacity === "0" && getComputedStyle(document.querySelector(".ambient-strip")).opacity === "0",
          ammo: Number(document.querySelector("#hudAmmo").textContent),
          skill: document.querySelector("#hudSkill").textContent.trim(),
          intro: document.querySelector("#chapterIntro").classList.contains("active"),
          tips: [...document.querySelectorAll("#controlTips span")].map((tip) => tip.textContent.trim()),
          characterSpriteDraws: window.__characterSpriteDraws,
          pixel,
        };
      });
      if (!state.hud || state.menu || state.modal || !state.ambientHidden || state.ammo >= 14 || !state.skill.includes("技能") || !state.intro || state.characterSpriteDraws <= 0 || state.tips.length < 5 || state.pixel[3] === 0) {
        throw new Error(`Game did not enter playable state: ${JSON.stringify(state)}`);
      }
    });

    await withPage(
      "bgm autoplay retry",
      async (page) => {
        await page.getByText("继续冒险").click();
        await page.waitForTimeout(100);
        await page.keyboard.press("Space");
        await page.waitForTimeout(200);
        const state = await page.evaluate(() => {
          const audio = window.__mockAudioInstances?.[0];
          return {
            hasAudio: !!audio,
            paused: audio?.paused,
            playCalls: audio?.playCalls,
          };
        });
        if (!state.hasAudio || state.paused || state.playCalls < 2) {
          throw new Error(`BGM autoplay retry failed: ${JSON.stringify(state)}`);
        }
      },
      {
        init: () => {
          window.__mockAudioInstances = [];
          window.Audio = class MockAudio {
            constructor(src) {
              this.src = src;
              this.loop = false;
              this.preload = "";
              this.paused = true;
              this.muted = false;
              this.volume = 1;
              this.playCalls = 0;
              window.__mockAudioInstances.push(this);
            }
            play() {
              this.playCalls += 1;
              if (this.playCalls === 1) return Promise.reject(new Error("autoplay blocked"));
              this.paused = false;
              return Promise.resolve();
            }
            pause() {
              this.paused = true;
            }
            removeAttribute() {}
            load() {}
          };
        },
      }
    );

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
      "menu polish layout",
      async (page) => {
        const menuState = await page.evaluate(() => {
          const heroDetail = getComputedStyle(document.querySelector(".menu-heroes"), "::after").backgroundImage;
          const ambient = {
            left: !!document.querySelector(".ambient.ambient-left .ambient-streamer"),
            right: !!document.querySelector(".ambient.ambient-right .ambient-streamer"),
            strip: !!document.querySelector(".ambient-strip"),
            constellation: !!document.querySelector(".ambient-right .ambient-constellation"),
          };
          const ambientStyle = getComputedStyle(document.querySelector(".ambient.ambient-left"));
          const stripStyle = getComputedStyle(document.querySelector(".ambient-strip"));
          const shellStyle = getComputedStyle(document.querySelector("#shell"));
          return {
            subtitle: document.querySelector(".brand p").textContent.trim(),
            description: document.querySelector('meta[name="description"]').content,
            chapterScopeCopy: document.querySelector(".brand p").textContent.includes("多世界章节") && document.querySelector('meta[name="description"]').content.includes("多世界章节"),
            heroHasStarChart: heroDetail.includes("circle at 18% 24%") && heroDetail.includes("circle at 66% 21%"),
            ambient,
            ambientStripVisible: stripStyle.opacity !== "0",
            ambientAboveShell: Number(ambientStyle.zIndex) > Number(shellStyle.zIndex),
            cursorTrailScript: !!document.querySelector('script[src="./src/render/cursor-trail.js"]'),
            easterEggScript: !!document.querySelector('script[src="./src/render/easter-eggs.js"]'),
          };
        });
        if (
          menuState.subtitle.includes("平台跳跃") ||
          !menuState.subtitle.includes("双角色星图冒险") ||
          menuState.description.includes("平台跳跃") ||
          !menuState.heroHasStarChart ||
          !menuState.chapterScopeCopy ||
          !menuState.ambient.left ||
          !menuState.ambient.right ||
          !menuState.ambient.strip ||
          !menuState.ambient.constellation ||
          !menuState.ambientStripVisible ||
          !menuState.ambientAboveShell ||
          !menuState.cursorTrailScript ||
          !menuState.easterEggScript
        ) {
          throw new Error(`Menu polish layout invalid: ${JSON.stringify(menuState)}`);
        }

        await page.mouse.move(890, 230);
        await page.waitForTimeout(40);
        await page.mouse.move(940, 280);
        await page.waitForTimeout(80);
        const trailState = await page.evaluate(() => {
          const layers = [...document.querySelectorAll(".cursor-trail")].map((layer) => {
            const rect = layer.getBoundingClientRect();
            const style = getComputedStyle(layer);
            return { width: rect.width, height: rect.height, zIndex: Number(style.zIndex) };
          });
          return {
            sparks: document.querySelectorAll(".cursor-spark").length,
            layers,
            viewport: { width: innerWidth, height: innerHeight },
          };
        });
        if (
          trailState.sparks < 1 ||
          trailState.layers.length !== 1 ||
          !trailState.layers.every((layer) => layer.width >= trailState.viewport.width - 1 && layer.height >= trailState.viewport.height - 1 && layer.zIndex >= 9)
        ) {
          throw new Error(`Cursor trail did not render above the menu surface: ${JSON.stringify(trailState)}`);
        }

        const titleBox = await page.locator("#menu .brand h1").boundingBox();
        await page.mouse.move(titleBox.x + 12, titleBox.y + 18);
        await page.mouse.down();
        await page.mouse.move(titleBox.x + titleBox.width - 16, titleBox.y + titleBox.height * 0.58, { steps: 6 });
        await page.mouse.up();
        const selectionState = await page.evaluate(() => ({
          selectedText: String(getSelection()),
          titleUserSelect: getComputedStyle(document.querySelector("#menu .brand h1")).userSelect,
          playUserSelect: getComputedStyle(document.querySelector('[data-action="play"]')).userSelect,
        }));
        if (selectionState.selectedText || selectionState.titleUserSelect !== "none" || selectionState.playUserSelect !== "none") {
          throw new Error(`Interactive menu text should not become selected: ${JSON.stringify(selectionState)}`);
        }

        for (const key of ["Digit5", "Digit2", "Digit0"]) await page.keyboard.press(key);
        await page.waitForSelector(".love-letter.show");
        const numberLetter = await page.locator(".love-letter-sign").textContent();
        if (!numberLetter.includes("第 520 颗星")) {
          throw new Error(`520 code opened the wrong letter: ${numberLetter}`);
        }
        await page.locator(".love-letter-close").click();
        await page.waitForSelector(".love-letter", { state: "detached" });

        for (const sequence of [
          ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyN", "KeyY"],
          ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyN", "KeyY"],
        ]) {
          for (const key of sequence) await page.keyboard.press(key);
          await page.waitForSelector(".love-letter.show");
          const konamiState = await page.evaluate(() => ({
            sign: document.querySelector(".love-letter-sign")?.textContent.trim(),
            hearts: document.querySelectorAll(".love-heart.show").length,
          }));
          if (konamiState.sign !== "—— 源源" || konamiState.hearts < 1) {
            throw new Error(`Konami code should open the second letter and heart: ${JSON.stringify(konamiState)}`);
          }
          await page.keyboard.press("Escape");
          await page.waitForSelector(".love-letter", { state: "detached" });
        }

        await page.getByText("选择关卡").click();
        await page.waitForTimeout(150);
        const levelState = await page.evaluate(() => {
          const cards = [...document.querySelectorAll(".level-item")].slice(0, 4);
          const headings = [...document.querySelectorAll(".level-world")].map((heading) => ({
            world: heading.dataset.world,
            text: heading.textContent.trim(),
          }));
          const offsets = cards.map((card) => {
            const cardRect = card.getBoundingClientRect();
            const copyRect = card.querySelector(".level-copy").getBoundingClientRect();
            const metaRect = card.querySelector(".level-meta").getBoundingClientRect();
            const filled = card.querySelector(".level-stars .star.filled");
            const bestValue = card.querySelector(".level-best-value");
            const filledColor = filled ? getComputedStyle(filled).color : "";
            const bestColor = bestValue ? getComputedStyle(bestValue).color : "";
            return {
              copyLeft: Math.round(copyRect.left - cardRect.left),
              metaLeft: Math.round(metaRect.left - cardRect.left),
              copyClass: card.querySelector(".level-copy").className,
              hasStars: !!card.querySelector(".level-stars"),
              hasBestValue: !!bestValue,
              filledColor,
              bestColor,
            };
          });
          return {
            visible: document.querySelector("#levelScreen").classList.contains("active"),
            totalCards: document.querySelectorAll(".level-item").length,
            headings,
            world2Unlocked: ![...document.querySelectorAll(".level-item")].find((card) => card.textContent.includes("第六章 星门浅湾"))?.disabled,
            world3Unlocked: ![...document.querySelectorAll(".level-item")].find((card) => card.textContent.includes("第十一章 相位浅滩"))?.disabled,
            offsets,
          };
        });
        const copyLefts = levelState.offsets.map((item) => item.copyLeft);
        const metaLefts = levelState.offsets.map((item) => item.metaLeft);
        const expectedLeftEdge = (value) => value >= 18 && value <= 24;
        const isGoldish = (color) => {
          if (!color) return false;
          const rgb = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color);
          if (rgb) {
            const [, r, g, b] = rgb.map(Number);
            return r >= 220 && g >= 200 && b <= 200;
          }
          const oklch = /oklch\(([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)/.exec(color);
          if (oklch) {
            const [, l, c, h] = oklch.map(Number);
            return l >= 0.7 && c >= 0.04 && h >= 70 && h <= 100;
          }
          return false;
        };
        if (
          !levelState.visible ||
          levelState.totalCards !== 15 ||
          !levelState.world2Unlocked ||
          !levelState.world3Unlocked ||
          levelState.headings.length !== 3 ||
          !levelState.headings.some((heading) => heading.world === "world1" && heading.text.includes("第一星域")) ||
          !levelState.headings.some((heading) => heading.world === "world2" && heading.text.includes("第二星域")) ||
          !levelState.headings.some((heading) => heading.world === "world3" && heading.text.includes("第三星域")) ||
          !copyLefts.every(expectedLeftEdge) ||
          !metaLefts.every(expectedLeftEdge) ||
          Math.max(...copyLefts) - Math.min(...copyLefts) > 2 ||
          !levelState.offsets.every((item) => item.copyClass === "level-copy") ||
          !levelState.offsets.every((item) => item.hasStars && item.hasBestValue) ||
          !isGoldish(levelState.offsets[0].filledColor) ||
          !isGoldish(levelState.offsets[0].bestColor)
        ) {
          throw new Error(`Level card text alignment or score-line gold invalid: ${JSON.stringify(levelState)}`);
        }

        await page.locator(".level-item").filter({ hasText: "第十一章 相位浅滩" }).click();
        await page.waitForTimeout(500);
        const chapterElevenState = await page.evaluate(() => ({
          hud: document.querySelector("#overlay").classList.contains("active"),
          title: document.querySelector("#chapterIntroTitle").textContent.trim(),
          status: document.querySelector("#hudStatus").textContent.trim(),
        }));
        if (!chapterElevenState.hud || chapterElevenState.title !== "第十一章 相位浅滩" || !chapterElevenState.status.includes("星潮")) {
          throw new Error(`Chapter 11 did not start from grouped level select: ${JSON.stringify(chapterElevenState)}`);
        }
      },
      {
        init: () => {
          localStorage.setItem(
            "nini-yuan-save-v1",
            JSON.stringify({
              schemaVersion: 2,
              selected: "nini",
            unlocked: 15,
              totalCoins: 389,
              bestTimes: { sakura: 22, moonruin: 15, cloudsea: 19, crystalforge: 16, auroracitadel: 28, stargatecove: 31, loopinglighthouse: 35, ringconservatory: 44, starbridgetide: 52, islandstarcore: 60, phaseshallows: 38 },
              levelStars: { sakura: 3, moonruin: 3, cloudsea: 3, crystalforge: 2, auroracitadel: 3, stargatecove: 2, loopinglighthouse: 2, ringconservatory: 2, starbridgetide: 2, islandstarcore: 1, phaseshallows: 2 },
              settings: { volume: 70, touch: 98, fx: true, bgmVolume: 60 },
            })
          );
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

    console.log("browser-smoke: 7 passed");
  } finally {
    server.kill();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
