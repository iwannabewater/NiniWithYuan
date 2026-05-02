const { withPage } = require("../helpers/e2e");

function parseTime(value) {
  const [minutes, seconds] = value.split(":").map(Number);
  return minutes * 60 + seconds;
}

async function run() {
  await withPage("lifecycle pause", async (page) => {
    await page.getByText("继续冒险").click();
    await page.waitForTimeout(1250);
    const before = parseTime(await page.locator("#hudTime").textContent());

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(2100);
    const hidden = parseTime(await page.locator("#hudTime").textContent());

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForTimeout(350);
    const after = parseTime(await page.locator("#hudTime").textContent());

    if (hidden > before + 1 || after > before + 1) {
      throw new Error(`Game time advanced while hidden: ${JSON.stringify({ before, hidden, after })}`);
    }
  });

  console.log("lifecycle-e2e: visibility pause and resume passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
