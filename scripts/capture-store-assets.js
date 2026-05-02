const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

const PORT = 4183;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT_DIR = path.join(process.cwd(), "dist", "store-assets");

function startServer() {
  return spawn("python3", ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"], {
    cwd: process.cwd(),
    stdio: "ignore",
  });
}

async function waitForServer() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const response = await fetch(BASE);
      if (response.ok) return;
    } catch {
      // Keep polling.
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error("Store asset server did not start");
}

async function capturePhone(page, name) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: false });
}

async function run() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const server = startServer();
  let browser = null;
  try {
    await waitForServer();
    browser = await chromium.launch({ headless: true });

    const phone = await browser.newPage({
      viewport: { width: 540, height: 960 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await phone.goto(BASE, { waitUntil: "networkidle" });
    await capturePhone(phone, "01-menu");

    await phone.getByRole("button", { name: "选择角色" }).tap();
    await phone.waitForTimeout(250);
    await capturePhone(phone, "02-characters");

    await phone.locator(".screen.active [data-action='back']").tap();
    await phone.getByRole("button", { name: "选择关卡" }).tap();
    await phone.waitForTimeout(250);
    await capturePhone(phone, "03-levels");

    await phone.locator(".screen.active [data-action='back']").tap();
    await phone.getByRole("button", { name: "继续冒险" }).tap();
    await phone.waitForTimeout(650);
    await capturePhone(phone, "04-gameplay");

    await phone.getByLabel("暂停").tap();
    await phone.waitForTimeout(250);
    await capturePhone(phone, "05-pause-modal");

    const landscapePhone = await browser.newPage({
      viewport: { width: 844, height: 390 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await landscapePhone.goto(BASE, { waitUntil: "networkidle" });
    await landscapePhone.screenshot({ path: path.join(OUT_DIR, "00-menu-landscape.png"), fullPage: false });
    await landscapePhone.getByRole("button", { name: "继续冒险" }).tap();
    await landscapePhone.waitForTimeout(650);
    await landscapePhone.screenshot({ path: path.join(OUT_DIR, "06-gameplay-landscape.png"), fullPage: false });

    const feature = await browser.newPage({ viewport: { width: 1024, height: 500 }, deviceScaleFactor: 1 });
    await feature.goto(BASE, { waitUntil: "networkidle" });
    await feature.screenshot({ path: path.join(OUT_DIR, "feature-graphic-1024x500.png"), fullPage: false });

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
