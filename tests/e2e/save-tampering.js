const { withPage } = require("../helpers/e2e");

async function run() {
  await withPage(
    "save tampering",
    async (page) => {
      const menuState = await page.evaluate(() => ({
        selected: document.querySelector(".character-card.selected")?.dataset.character,
        saveStrip: document.querySelector("#saveStrip").textContent,
        touchSize: getComputedStyle(document.documentElement).getPropertyValue("--touch-size").trim(),
      }));

      if (menuState.selected !== "nini" || !menuState.saveStrip.includes("15 / 15") || menuState.touchSize !== "140px") {
        throw new Error(`Tampered save was not sanitized on menu render: ${JSON.stringify(menuState)}`);
      }

      await page.getByText("继续冒险").click();
      await page.waitForTimeout(500);
      const playState = await page.evaluate(() => ({
        hud: document.querySelector("#overlay").classList.contains("active"),
        character: document.querySelector("#hudCharacter").textContent,
        modal: document.querySelector("#modal").classList.contains("active"),
      }));

      if (!playState.hud || playState.character !== "妮妮" || playState.modal) {
        throw new Error(`Tampered save blocked gameplay startup: ${JSON.stringify(playState)}`);
      }
    },
    {
      init: () => {
        localStorage.setItem(
          "nini-yuan-save-v1",
          JSON.stringify({
            selected: "<script>",
            unlocked: 99,
            totalCoins: "31.8",
            bestTimes: { sakura: 39.2, "<img>": 1 },
            levelStars: { sakura: 3, moonruin: 7 },
            settings: { volume: -4, touch: 999, fx: "not-a-bool" },
          })
        );
      },
    }
  );

  console.log("save-tampering-e2e: invalid localStorage falls back safely");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
