const { spawn } = require("node:child_process");
const { chromium } = require("playwright");

function startServer(port = 4173) {
  return spawn("python3", ["-m", "http.server", String(port), "--bind", "127.0.0.1"], {
    cwd: process.cwd(),
    stdio: "ignore",
  });
}

async function waitForServer(base) {
  for (let i = 0; i < 40; i += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // Keep polling until the static server is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 125));
  }
  throw new Error(`Static server did not start at ${base}`);
}

async function withPage(testName, fn, options = {}) {
  const port = options.port || 4173;
  const base = `http://127.0.0.1:${port}`;
  const server = startServer(port);
  let browser = null;
  try {
    await waitForServer(base);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage(options.page || { viewport: { width: 1280, height: 720 } });
    if (options.init) await page.addInitScript(options.init);

    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto(base, { waitUntil: "networkidle" });
    await fn(page);
    if (errors.length) throw new Error(`${testName}: ${errors.join("\n")}`);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
}

module.exports = { withPage };
