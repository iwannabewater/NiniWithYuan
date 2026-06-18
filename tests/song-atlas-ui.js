const assert = require("node:assert/strict");
const fs = require("node:fs");

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("styles.css", "utf8");
const design = fs.readFileSync("docs/DESIGN.md", "utf8");
const heroPath = "assets/characters/concepts/nini-yuan-song-atlas-v1.png";

assert.ok(fs.existsSync(heroPath), "Approved paired protagonist art should be stored in the project");
const hero = fs.readFileSync(heroPath);
assert.equal(hero.readUInt32BE(16), 1024, "Paired protagonist art should keep its authored width");
assert.equal(hero.readUInt32BE(20), 1536, "Paired protagonist art should keep its authored height");

assert.match(html, /class="menu-hero-art"/);
assert.match(html, /src="\.\/assets\/characters\/concepts\/nini-yuan-song-atlas-v1\.png"/);
assert.match(html, /width="1024"\s+height="1536"/);
assert.match(html, /alt="妮妮手持璇玑星盘，源源佩青玉圭剑"/);
assert.match(html, /id="rotatePrompt"[\s\S]*?横持设备，展开完整星路/);

for (const token of ["--c-lacquer", "--c-indigo-silk", "--c-aged-gold", "--c-carved-jade", "--c-dusty-rose"]) {
  assert.ok(css.includes(token), `Missing Night Observatory token: ${token}`);
}
assert.doesNotMatch(css, /background-clip:\s*text/);
assert.match(css, /#shell:has\(#overlay\.active\) \.rotate-prompt/);

for (const phrase of ["宋式星图器物幻想", "夜观天象", "双璧入卷", "刻金显纹", "四角仪轨"]) {
  assert.ok(design.includes(phrase), `Design system should record ${phrase}`);
}

console.log("song-atlas-ui: approved hero art and Night Observatory design contract passed");
