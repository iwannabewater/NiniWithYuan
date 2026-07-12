const { withPage } = require("../helpers/e2e");

function installCharacterProbe() {
  window.__characterProbe = null;
  const original = CanvasRenderingContext2D.prototype.drawImage;
  CanvasRenderingContext2D.prototype.drawImage = function probeCharacter(source, ...args) {
    if (source instanceof HTMLImageElement && source.src.includes("/assets/characters/nini/") && args.length >= 8) {
      const transform = this.getTransform();
      window.__characterProbe = {
        x: transform.e,
        y: transform.f,
        frame: (args[1] / args[3]) * 4 + args[0] / args[2],
      };
    }
    return original.call(this, source, ...args);
  };
}

function check(condition, message, details) {
  if (!condition) throw new Error(`${message}: ${JSON.stringify(details)}`);
}

async function sample(page) {
  return page.evaluate(() => window.__characterProbe);
}

async function restart(page) {
  await page.keyboard.press("Escape");
  await page.locator("#modal.active").waitFor();
  await page.getByRole("button", { name: "重新开始" }).click();
  await page.waitForTimeout(120);
}

async function run() {
  await withPage(
    "unified gameplay input arbitration",
    async (page) => {
      await page.getByText("继续冒险").click();
      await page.waitForTimeout(180);

      await page.keyboard.down("KeyD");
      await page.waitForTimeout(350);
      const rightward = await sample(page);
      await page.keyboard.down("KeyA");
      await page.waitForTimeout(350);
      const reversed = await sample(page);
      await page.keyboard.up("KeyA");
      await page.waitForTimeout(350);
      const fallback = await sample(page);
      await page.keyboard.up("KeyD");
      check(
        reversed.x < rightward.x - 12 && fallback.x > reversed.x + 12,
        "latest held direction should win and release should fall back to the still-held direction",
        { rightward, reversed, fallback }
      );

      await restart(page);
      await page.keyboard.down("Space");
      await page.waitForTimeout(300);
      const baselineJump = await sample(page);
      await page.keyboard.up("Space");

      await restart(page);
      await page.keyboard.down("Space");
      await page.waitForTimeout(80);
      await page.keyboard.down("KeyW");
      await page.waitForTimeout(80);
      await page.keyboard.up("Space");
      await page.waitForTimeout(140);
      const handedOffJump = await sample(page);
      await page.keyboard.up("KeyW");
      check(
        Math.abs(handedOffJump.y - baselineJump.y) <= 24,
        "Space to W handoff should preserve one jump instead of consuming the air jump or cutting height",
        { baselineJump, handedOffJump }
      );

      await restart(page);
      await page.keyboard.press("Space");
      await page.waitForTimeout(100);
      await page.keyboard.press("KeyJ");
      await page.waitForTimeout(45);
      const shortGlide = await sample(page);
      const skillLabel = await page.locator("#hudSkill").textContent();
      check(
        [11, 12].includes(shortGlide.frame) && skillLabel.includes("冷却"),
        "a sub-frame Nini skill tap should enter a visible glide window before cooldown",
        { shortGlide, skillLabel }
      );
    },
    { port: 43184, init: installCharacterProbe, page: { viewport: { width: 1280, height: 720 } } }
  );

  await withPage(
    "assistive touch activation",
    async (page) => {
      await page.getByText("继续冒险").tap();
      await page.waitForTimeout(180);
      const before = await sample(page);
      const right = page.locator('[data-touch="right"]');
      await right.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(220);
      const nudged = await sample(page);
      check(nudged.x > before.x + 8, "a synthesized touch-button click should produce a useful movement nudge", { before, nudged });

      const jump = page.locator('[data-touch="jump"]');
      await jump.focus();
      await page.keyboard.press("Space");
      await page.waitForTimeout(80);
      const jumped = await sample(page);
      check(jumped.y < nudged.y - 5, "keyboard or assistive activation should trigger a touch jump", { nudged, jumped });
    },
    {
      port: 43185,
      init: installCharacterProbe,
      page: { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    }
  );

  console.log("input-arbitration-e2e: direction fallback, alias handoff, short glide, and assistive touch activation passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
