const { withPage } = require("../helpers/e2e");

async function run() {
  await withPage("pwa registration", async (page) => {
    const state = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return { supported: false };
      const registration = await navigator.serviceWorker.getRegistration("./");
      const manifest = document.querySelector('link[rel="manifest"]')?.getAttribute("href") || "";
      const icons = await fetch(manifest).then((response) => response.json()).then((data) => data.icons || []);
      return {
        supported: true,
        registered: Boolean(registration),
        manifest,
        icons: icons.map((icon) => icon.src),
      };
    });

    if (!state.supported || !state.registered || !state.manifest.endsWith("manifest.webmanifest") || state.icons.length < 2) {
      throw new Error(`PWA registration failed: ${JSON.stringify(state)}`);
    }
  });

  console.log("pwa-registration-e2e: service worker and manifest registration passed");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
