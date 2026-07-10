const fs = require("node:fs");
const { withPage } = require("../helpers/e2e");

const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

async function scan(page, label) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => {
    return axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa"],
      },
    });
  });
  const blocking = result.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
  if (blocking.length) {
    throw new Error(
      `${label} accessibility violations: ${blocking
        .map((violation) => `${violation.id}(${violation.impact}) ${violation.nodes.length}`)
        .join(", ")}`
    );
  }
}

async function clickActiveBack(page) {
  const activeScreen = page.locator(".screen.active");
  await activeScreen.evaluate(async (screen) => {
    const animations = screen
      .getAnimations()
      .filter((animation) => animation.playState !== "finished");
    await Promise.allSettled(animations.map((animation) => animation.finished));
  });
  await page.locator(".screen.active [data-action='back']").click();
}

async function run() {
  await withPage("accessibility", async (page) => {
    await scan(page, "menu");
    await page.getByRole("button", { name: "选择角色" }).click();
    await scan(page, "characters");
    await clickActiveBack(page);
    await page.getByRole("button", { name: "选择关卡" }).click();
    await scan(page, "levels");
    await clickActiveBack(page);
    await page.getByRole("button", { name: "设置" }).click();
    await scan(page, "settings");
    await clickActiveBack(page);
    await page.getByRole("button", { name: "继续冒险" }).click();
    await page.waitForTimeout(350);
    await scan(page, "game hud");
    await page.keyboard.press("Escape");
    const dialog = page.getByRole("dialog", { name: "暂停" });
    await dialog.waitFor({ state: "visible" });
    await scan(page, "pause dialog");

    const actions = dialog.getByRole("button");
    const actionCount = await actions.count();
    if (actionCount < 2) throw new Error(`Pause dialog exposed too few actions: ${actionCount}`);
    await actions.last().focus();
    await page.keyboard.press("Tab");
    if (!(await actions.first().evaluate((button) => document.activeElement === button))) {
      throw new Error("Tab escaped past the final pause action");
    }
    await page.keyboard.press("Shift+Tab");
    if (!(await actions.last().evaluate((button) => document.activeElement === button))) {
      throw new Error("Shift+Tab escaped before the first pause action");
    }
    await dialog.getByRole("button", { name: "返回菜单" }).click();
    await page.locator("#menu.active").waitFor();

    const letterTrigger = page.getByRole("button", { name: "设置", exact: true });
    await letterTrigger.focus();
    await page.evaluate(() => {
      window.NiniYuanLove.openLetter({
        eyebrow: "星图密语",
        body: "焦点回归测试",
        sign: "源源",
      });
    });
    const letter = page.getByRole("dialog", { name: "隐藏信件" });
    await letter.waitFor({ state: "visible" });
    const letterClose = letter.getByRole("button", { name: "心意收到" });
    if (!(await letterClose.evaluate((button) => document.activeElement === button))) {
      throw new Error("Hidden letter did not focus its close action");
    }
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    if (!(await letterClose.evaluate((button) => document.activeElement === button))) {
      throw new Error("Hidden-letter focus escaped its only action");
    }
    await page.keyboard.press("Escape");
    await letter.waitFor({ state: "detached" });
    if (!(await letterTrigger.evaluate((button) => document.activeElement === button))) {
      throw new Error("Hidden letter did not restore focus to its trigger");
    }
  });

  console.log("accessibility-e2e: no serious or critical WCAG violations");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
