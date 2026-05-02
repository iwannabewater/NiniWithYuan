const fs = require("node:fs");

const source = fs.readFileSync("src/game.js", "utf8");

function constant(name) {
  const match = source.match(new RegExp(`const ${name} = ([0-9.]+);`));
  if (!match) throw new Error(`Missing balance constant: ${name}`);
  return Number(match[1]);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const tile = 48;
const pickupReachX = constant("PICKUP_REACH_X");
const pickupReachTop = constant("PICKUP_REACH_TOP");
const pickupReachBottom = constant("PICKUP_REACH_BOTTOM");
const yuanDashSpeed = constant("YUAN_DASH_SPEED");
const yuanDashTime = constant("YUAN_DASH_TIME");
const yuanDashMinDistance = constant("YUAN_DASH_MIN_DISTANCE");
const yuanDashMaxDistance = constant("YUAN_DASH_MAX_DISTANCE");
const niniGlideDuration = constant("NINI_GLIDE_DURATION");
const niniGlideFallSpeed = constant("NINI_GLIDE_FALL_SPEED");

const player = { x: 8 * tile, y: 14 * tile - 56, w: 34, h: 56 };
const firstBerry = { x: 8 * tile + 10, y: 12 * tile + 10, w: 30, h: 30 };
const bodyRect = { x: player.x + 3, y: player.y + 3, w: player.w - 6, h: player.h - 3 };
const pickupRect = {
  x: player.x - pickupReachX,
  y: player.y - pickupReachTop,
  w: player.w + pickupReachX * 2,
  h: player.h + pickupReachTop + pickupReachBottom,
};

if (rectsOverlap(bodyRect, firstBerry)) {
  throw new Error("Regression setup invalid: physical body should miss the first standing berry");
}

if (!rectsOverlap(pickupRect, firstBerry)) {
  throw new Error("Standing pickup reach must collect visible food without requiring a jump");
}

if (!source.includes("const reach = pickupRect(player)") || source.includes("rectsOverlap(bodyRect(player), p)) continue;\n      p.taken = true")) {
  throw new Error("Pickups must use pickupRect(player), not the combat/platform bodyRect");
}

const yuanDashDistance = yuanDashSpeed * yuanDashTime;
if (yuanDashDistance < yuanDashMinDistance || yuanDashDistance > yuanDashMaxDistance) {
  throw new Error(
    `Yuan dash distance ${yuanDashDistance.toFixed(1)}px must stay within ${yuanDashMinDistance}-${yuanDashMaxDistance}px`
  );
}

if (!source.includes("function dashShouldStopAtEdge()") || !source.includes("inputs.jump")) {
  throw new Error("Yuan ground dash needs edge braking unless the player is intentionally jumping");
}

if (niniGlideDuration < 1 || niniGlideFallSpeed > 210) {
  throw new Error("Nini glide must be long and slow enough to feel responsive");
}

const glideBlock = source.slice(source.indexOf("const canNiniGlide"), source.indexOf("if (inputs.skillPressed"));
if (glideBlock.includes("player.vy > 0")) {
  throw new Error("Nini glide must not wait until the character is already falling");
}

if (!glideBlock.includes("player.glide === 0") || !glideBlock.includes("player.skillCd = skillCooldown")) {
  throw new Error("Nini glide must spend cooldown when glide starts, including hold-before-jump input");
}

console.log("mechanics-balance: pickup reach, dash distance, and glide responsiveness passed");
