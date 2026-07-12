const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

const PORT = 4183;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(process.cwd(), "dist", "store-assets");
const CAPTURE_QUOTE = "愿每一次跳跃，都落在你想去的星上。";

function startServer() {
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: process.cwd(),
    stdio: ["ignore", "ignore", "pipe"],
  });
  server.captureError = "";
  server.stderr.setEncoding("utf8");
  server.stderr.on("data", (chunk) => {
    server.captureError = `${server.captureError}${chunk}`.slice(-1000);
  });
  return server;
}

async function waitForServer(server) {
  await new Promise((resolve) => setTimeout(resolve, 125));
  for (let i = 0; i < 40; i += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Store asset server exited before readiness: ${server.captureError.trim() || `code ${server.exitCode}`}`);
    }
    try {
      const response = await fetch(BASE);
      const html = response.ok ? await response.text() : "";
      if (html.includes("<title>妮妮源源历险记 | Nini & Yuan</title>")) return;
    } catch {
      // Keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error("Store asset server did not start");
}

function inspectPng(buffer) {
  if (buffer.toString("ascii", 1, 4) !== "PNG") throw new Error("Store capture did not produce a PNG");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
  };
}

async function createCapturePage(browser, options) {
  const page = await browser.newPage(options);
  await page.addInitScript(() => {
    let state = 0x4e494e49;
    Math.random = () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
  });
  return page;
}

async function normalizeCaptureState(page) {
  await page.evaluate((quote) => {
    const ambientQuote = document.querySelector("#ambientQuote");
    if (ambientQuote) ambientQuote.textContent = quote;
    document.querySelectorAll(".love-toast, .love-heart, .love-letter").forEach((node) => node.remove());
  }, CAPTURE_QUOTE);
}

async function captureStable(page, name, expected, options = {}) {
  await normalizeCaptureState(page);
  const first = await page.screenshot({ fullPage: false });
  const second = await page.screenshot({ fullPage: false });
  if (!first.equals(second)) throw new Error(`${name} changed between consecutive reduced-motion captures`);
  const png = inspectPng(first);
  if (png.width !== expected.width || png.height !== expected.height) {
    throw new Error(`${name} dimensions ${png.width}x${png.height} did not match ${expected.width}x${expected.height}`);
  }
  if (png.bitDepth !== 8 || png.colorType !== 2) {
    throw new Error(`${name} must be a 24-bit RGB PNG without alpha; got bit depth ${png.bitDepth}, color type ${png.colorType}`);
  }
  if (options.maxAspectRatio && Math.max(png.width, png.height) / Math.min(png.width, png.height) > options.maxAspectRatio) {
    throw new Error(`${name} exceeds the ${options.maxAspectRatio}:1 store screenshot aspect ratio`);
  }
  fs.writeFileSync(path.join(OUT_DIR, `${name}.png`), first);
}

async function settleVisuals(page, selector = "html") {
  await page.evaluate(async (rootSelector) => {
    await document.fonts?.ready;
    await Promise.all([...document.images].map((image) => image.decode?.().catch(() => {})));
    const root = document.querySelector(rootSelector) || document.documentElement;
    const finiteAnimations = root.getAnimations({ subtree: true }).filter((animation) => {
      const iterations = animation.effect?.getTiming?.().iterations;
      return animation.playState !== "finished" && Number.isFinite(iterations);
    });
    await Promise.allSettled(finiteAnimations.map((animation) => animation.finished));
  }, selector);
}

async function stageFrozenGameplay(page, touch) {
  await page.evaluate(() => {
    document.querySelector("#continueAction").click();
    document.querySelector('[data-action="pause"]').click();
  });
  await page.waitForFunction(() => document.querySelector("#hudSkill")?.textContent.includes("璇玑星渡"));
  await page.evaluate((showTouch) => {
    document.querySelector("#modal").classList.remove("active");
    document.querySelector("#overlay").classList.add("active");
    document.querySelector("#touchControls").classList.toggle("playing", showTouch);
  }, touch);
}

async function restorePauseDialog(page) {
  await page.evaluate(() => {
    document.querySelector("#modal").classList.add("active");
    document.querySelector("#overlay").classList.remove("active");
    document.querySelector("#touchControls").classList.remove("playing");
  });
  await settleVisuals(page, "#modal");
}

async function run() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = startServer();
  let browser = null;
  try {
    await waitForServer(server);
    browser = await chromium.launch({ headless: true });

    const phone = await createCapturePage(browser, {
      viewport: { width: 540, height: 960 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await phone.goto(BASE, { waitUntil: "networkidle" });
    await settleVisuals(phone, "#menu");
    await captureStable(phone, "01-menu", { width: 1080, height: 1920 }, { maxAspectRatio: 2 });

    await phone.getByRole("button", { name: "选择角色" }).tap();
    await settleVisuals(phone, "#characterScreen");
    await captureStable(phone, "02-characters", { width: 1080, height: 1920 }, { maxAspectRatio: 2 });

    await phone.locator(".screen.active [data-action='back']").tap();
    await phone.getByRole("button", { name: "选择关卡" }).tap();
    await settleVisuals(phone, "#levelScreen");
    await captureStable(phone, "03-levels", { width: 1080, height: 1920 }, { maxAspectRatio: 2 });

    await phone.locator(".screen.active [data-action='back']").tap();
    await phone.getByRole("button", { name: "继续冒险" }).tap();
    await phone.locator("#rotatePrompt").waitFor({ state: "visible" });
    await captureStable(phone, "04-rotate-prompt", { width: 1080, height: 1920 }, { maxAspectRatio: 2 });

    const landscapePhone = await createCapturePage(browser, {
      viewport: { width: 960, height: 540 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await landscapePhone.goto(BASE, { waitUntil: "networkidle" });
    await settleVisuals(landscapePhone, "#menu");
    await captureStable(landscapePhone, "05-menu-landscape", { width: 1920, height: 1080 }, { maxAspectRatio: 2 });
    await stageFrozenGameplay(landscapePhone, true);
    await captureStable(landscapePhone, "06-gameplay-landscape", { width: 1920, height: 1080 }, { maxAspectRatio: 2 });
    await restorePauseDialog(landscapePhone);
    await captureStable(landscapePhone, "07-pause-landscape", { width: 1920, height: 1080 }, { maxAspectRatio: 2 });

    const desktop = await createCapturePage(browser, {
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    await desktop.goto(BASE, { waitUntil: "networkidle" });
    await stageFrozenGameplay(desktop, false);
    await captureStable(desktop, "08-gameplay-desktop", { width: 1280, height: 720 }, { maxAspectRatio: 2 });

    const feature = await createCapturePage(browser, {
      viewport: { width: 1024, height: 500 },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    await feature.goto(BASE, { waitUntil: "networkidle" });
    await settleVisuals(feature, "#menu");
    await captureStable(feature, "feature-graphic-1024x500", { width: 1024, height: 500 });

    console.log(`store-assets: wrote ${OUT_DIR}`);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
