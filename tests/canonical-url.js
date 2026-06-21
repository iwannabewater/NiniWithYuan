const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync("index.html", "utf8");
const redirectScript = html.match(/<script>\s*([\s\S]*?)\s*<\/script>/)?.[1];

function resolveRedirect(url) {
  const parsed = new URL(url);
  let replaced = null;
  const location = {
    hostname: parsed.hostname,
    pathname: parsed.pathname,
    protocol: parsed.protocol,
    search: parsed.search,
    hash: parsed.hash,
    replace(target) {
      replaced = target;
    },
  };
  vm.runInNewContext(redirectScript, { URL, window: { location } });
  return replaced;
}

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
assert.equal(
  resolveRedirect("http://game.whynotsleep.cc/niniwithyuan?chapter=2#start"),
  "https://game.whynotsleep.cc/niniwithyuan/?chapter=2#start",
  "the lowercase no-slash public URL should normalize before relative assets load",
);
assert.equal(
  resolveRedirect("http://game.whynotsleep.cc/niniwithyuan/"),
  "https://game.whynotsleep.cc/niniwithyuan/",
  "the HTTP canonical path should upgrade to HTTPS",
);
assert.equal(
  resolveRedirect("https://game.whynotsleep.cc/niniwithyuan/"),
  null,
  "the canonical HTTPS URL should not redirect again",
);
assert.equal(resolveRedirect("http://127.0.0.1:4173/niniwithyuan"), null, "local development URLs should not redirect");
assert.equal(resolveRedirect("file:///android_asset/index.html"), null, "the Android WebView asset entry should not redirect");
assert.equal(
  resolveRedirect("https://whynotsleep.cc/NiniWithYuan///redirect.example"),
  "https://game.whynotsleep.cc/niniwithyuan/",
  "legacy path suffixes must not turn canonicalization into an open redirect",
);

console.log("canonical-url: public and legacy URL normalization passed");
