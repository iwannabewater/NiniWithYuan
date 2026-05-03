const fs = require("node:fs");

const source = fs.readFileSync("src/game.js", "utf8");

function constant(name) {
  const match = source.match(new RegExp(`const ${name} = ([0-9.]+);`));
  if (!match) throw new Error(`Missing balance constant: ${name}`);
  return Number(match[1]);
}

function characterSpeed(id) {
  const match = source.match(new RegExp(`${id}: \\{([\\s\\S]*?)\\n    \\}`, "m"));
  if (!match) throw new Error(`Missing character block: ${id}`);
  const speed = match[1].match(/speed:\s*([0-9.]+)/);
  if (!speed) throw new Error(`Missing speed for ${id}`);
  return Number(speed[1]);
}

const windReferenceForce = constant("WIND_REFERENCE_FORCE");
const windGroundDrift = constant("WIND_GROUND_DRIFT");
const windAirDrift = constant("WIND_AIR_DRIFT");
const windMaxSpeed = constant("WIND_MAX_SPEED");
const windArrowSpacing = constant("WIND_ARROW_SPACING");
const windArrowSpeed = constant("WIND_ARROW_SPEED");
const enemyWidth = constant("ENEMY_WIDTH");
const enemyHeight = constant("ENEMY_HEIGHT");
const wispFloatGap = constant("WISP_FLOAT_GAP");
const wispHoverRange = constant("WISP_HOVER_RANGE");
const characterSpeeds = { nini: characterSpeed("nini"), yuan: characterSpeed("yuan") };

for (const force of [300, 310, 340, 360]) {
  const windStrength = force / windReferenceForce;
  for (const [id, speed] of Object.entries(characterSpeeds)) {
    const noInputAirTarget = speed * windAirDrift * windStrength;
    const noInputGroundTarget = speed * windGroundDrift * windStrength;
    const intoWindTarget = speed - noInputAirTarget;
    if (noInputAirTarget < 145) {
      throw new Error(`${id} air wind target ${noInputAirTarget.toFixed(1)}px/s is too weak to change landing positions`);
    }
    if (noInputAirTarget > 240) {
      throw new Error(`${id} air wind target ${noInputAirTarget.toFixed(1)}px/s is too strong for a traversable wind field`);
    }
    if (noInputGroundTarget > 90) {
      throw new Error(`${id} ground wind target ${noInputGroundTarget.toFixed(1)}px/s should not overpower walking`);
    }
    if (intoWindTarget < speed * 0.52) {
      throw new Error(`${id} airborne into-wind jump target ${intoWindTarget.toFixed(1)}px/s should still allow forward progress`);
    }
  }
}

if (windMaxSpeed < 1.2 || windMaxSpeed > 1.4) {
  throw new Error("Wind same-direction speed ceiling must stay noticeable but bounded");
}

if (windArrowSpacing !== 72 || windArrowSpeed !== 18) {
  throw new Error("Wind arrow spacing/speed should stay readable and slow enough for WebView");
}

if (enemyHeight !== 34 || !source.includes("const groundedY = y * TILE + TILE - ENEMY_HEIGHT")) {
  throw new Error("Ground enemies must spawn bottom-aligned to their intended platform row");
}

if (wispFloatGap < 20 || wispFloatGap > 30 || wispHoverRange < 4 || wispFloatGap - wispHoverRange < 14) {
  throw new Error("Wisp enemies need a stable visible hover gap instead of reading as misaligned ground enemies");
}

if (!source.includes('const enemyY = type === "wisp" ? groundedY - WISP_FLOAT_GAP : groundedY')) {
  throw new Error("Wisp enemies must spawn above the platform row while ground enemies stay bottom-aligned");
}

if (!source.includes("const target = clamp(leftRight * ch.speed + windTarget")) {
  throw new Error("Wind must participate in the horizontal velocity target instead of using low-magnitude post-input acceleration");
}

if (source.includes("player.vx = clamp(player.vx + w.force * dt")) {
  throw new Error("Regression: wind force is still applied as low-magnitude post-input acceleration");
}

if (source.includes("const beyondPatrol") || source.includes("const missingSupport")) {
  throw new Error("Ground enemies should use current platform bounds, not patrol-radius or front-foot early-turn heuristics");
}

if (!source.includes("const minX = support.x + 3") || !source.includes("const maxX = support.x + support.w - e.w - 3")) {
  throw new Error("Ground enemies need platform-bound patrol limits");
}

const buildStart = source.indexOf("  function buildLevels()");
const buildEnd = source.indexOf("  function resize()");
if (buildStart < 0 || buildEnd < 0) throw new Error("Could not extract buildLevels for enemy support validation");

const levels = new Function(
  `const TILE = 48; const ENEMY_WIDTH = ${enemyWidth}; const ENEMY_HEIGHT = ${enemyHeight}; const WISP_FLOAT_GAP = ${wispFloatGap}; const WISP_HOVER_RANGE = ${wispHoverRange}; ${source.slice(buildStart, buildEnd)}; return buildLevels();`
)();

function overlapsX(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x;
}

function nearestSupportBelow(level, enemy) {
  const foot = { x: enemy.x + 4, w: enemy.w - 8 };
  const bottom = enemy.y + enemy.h;
  return level.platforms
    .concat(level.moving)
    .filter((platform) => platform.y >= bottom && overlapsX(foot, platform))
    .sort((a, b) => a.y - b.y)[0];
}

for (const level of levels) {
  for (const enemy of level.enemies) {
    const foot = { x: enemy.x + 4, w: enemy.w - 8 };
    const bottom = enemy.y + enemy.h;
    const support = level.platforms.concat(level.moving).find((platform) => Math.abs(platform.y - bottom) < 0.01 && overlapsX(foot, platform));
    if (enemy.type === "wisp") {
      const hoverSupport = nearestSupportBelow(level, enemy);
      if (!hoverSupport) {
        throw new Error(`${level.id} wisp at x=${enemy.x} has no readable platform reference below it`);
      }
      const lowestHoverGap = hoverSupport.y - (enemy.y + enemy.h + wispHoverRange);
      if (lowestHoverGap < 14) {
        throw new Error(`${level.id} wisp at x=${enemy.x} hover gap ${lowestHoverGap.toFixed(1)}px is too small to present as flying`);
      }
      continue;
    }
    if (!support) {
      throw new Error(`${level.id} ${enemy.type} at x=${enemy.x} does not spawn with its feet on a platform`);
    }
    const patrolMin = support.x + 3;
    const patrolMax = support.x + support.w - enemy.w - 3;
    if (patrolMax - patrolMin < enemy.w) {
      throw new Error(`${level.id} ${enemy.type} support platform is too narrow for a readable full-platform patrol`);
    }
  }
}

if (!source.includes('if (e.type === "wisp")') || !source.includes("e.y = e.baseY + Math.sin(e.phase * 4) * WISP_HOVER_RANGE")) {
  throw new Error("Wisp enemies should keep bounded hovering separate from ground enemy walking");
}

if (!source.includes("function drawGroundEnemy(e)") || !source.includes("footY + 1")) {
  throw new Error("Ground enemies need a visible contact shadow/foot treatment to avoid floating visuals");
}

if (
  !source.includes("function drawWispEnemy(e)") ||
  !source.includes("WISP_FLOAT_GAP - hoverOffset") ||
  !source.includes("wingLift") ||
  !source.includes("ctx.createRadialGradient")
) {
  throw new Error("Wisp enemies need a distinct flying silhouette with a distant shadow, wings, and glow core");
}

if (!source.includes("const localX = i * WIND_ARROW_SPACING + (dir > 0 ? arrowPhase : -arrowPhase)")) {
  throw new Error("Wind arrow position must move left for negative wind and right for positive wind");
}

if (!source.includes("ctx.lineTo(px - dir * 9")) {
  throw new Error("Wind fields need visible directional arrowheads");
}

console.log("gameplay-bugfix: wind, full-platform grounding, and flying wisp readability guards passed");
