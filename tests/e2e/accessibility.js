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

async function run() {
  await withPage("accessibility", async (page) => {
    await scan(page, "menu");
    await page.getByRole("button", { name: "选择角色" }).click();
    await scan(page, "characters");
    await page.locator(".screen.active [data-action='back']").click();
    await page.getByRole("button", { name: "选择关卡" }).click();
    await scan(page, "levels");
    await page.locator(".screen.active [data-action='back']").click();
    await page.getByRole("button", { name: "设置" }).click();
    await scan(page, "settings");
    await page.locator(".screen.active [data-action='back']").click();
    await page.getByRole("button", { name: "继续冒险" }).click();
    await page.waitForTimeout(350);
    await scan(page, "game hud");
  });

  console.log("accessibility-e2e: no serious or critical WCAG violations");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
