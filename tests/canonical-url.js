const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");

assert.ok(
  html.includes('<link rel="canonical" href="https://game.whynotsleep.cc/niniwithyuan/" />'),
  "index.html should declare the canonical game subdomain URL",
);
assert.ok(
  html.includes('const canonicalBase = "https://game.whynotsleep.cc/niniwithyuan/";'),
  "index.html should redirect legacy project URLs to the canonical game subdomain",
);
assert.ok(
  html.includes('host === "whynotsleep.cc"') &&
    html.includes('host === "iwannabewater.github.io"') &&
    html.includes("window.location.replace"),
  "legacy GitHub Pages and apex hosts should be normalized with location.replace",
);

console.log("canonical-url: legacy project URL normalization passed");
