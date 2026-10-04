((root) => {
  "use strict";

  // Interactive props: star dew, jade shards, power-up medallions, the moon
  // gate goal, bronze-mirror portals, crosswind silk, player projectiles, and
  // the phase-tide wash.
  //
  // Every function is stateless and draws in world space under the camera
  // transform. Glows come from cached sprites instead of `shadowBlur`, static
  // icon geometry is built once as Path2D, and colour strings are constants,
  // so a frame of props allocates nothing.

  const Art = dependency("NiniYuanArt", "./art.js");

  const MATERIAL = Object.freeze({
    lacquer: "#0b1016",
    lacquerRaised: "#111821",
    indigoSilk: "#18212d",
    indigoRaised: "#202c3a",
    moonWhite: "#eee7d5",
    moonWhiteSoft: "#c6bfae",
    agedGold: "#c3a468",
    agedGoldDeep: "#80683f",
    carvedJade: "#6da895",
    dustyRose: "#b87b86",
    phaseBlue: "#7893a4",
    danger: "#c96978",
  });

  const POWERUP_COLORS = Object.freeze({
    berry: MATERIAL.dustyRose,
    moon: MATERIAL.moonWhite,
    core: MATERIAL.carvedJade,
    bell: MATERIAL.agedGold,
    heart: MATERIAL.danger,
  });

  const PORTAL_COLORS = Object.freeze({
    cyan: MATERIAL.phaseBlue,
    gold: MATERIAL.agedGold,
    jade: MATERIAL.carvedJade,
    rose: MATERIAL.dustyRose,
  });

  const INK = "#0a0f15";
  const INK_LINE = "rgba(10,15,21,0.78)";
  const INK_SOFT = "rgba(10,15,21,0.45)";
  const WHITE_HIGHLIGHT = "rgba(255,255,255,0.55)";
  const WHITE_FAINT = "rgba(255,255,255,0.18)";
  const GOLD_LINE = "rgba(226,194,125,0.85)";
  const STONE = "#5d6b7a";
  const STONE_DEEP = "#2a333e";
  const BRONZE = "#9a7a45";
  const BRONZE_DEEP = "#4a3720";

  function dependency(name, path) {
    if (root[name]) return root[name];
    if (typeof require === "function") return require(path);
    throw new Error(`${name} must load before props`);
  }

  const tintCache = new Map();

  /** `Art.rgba` memoized for the small, fixed set of (colour, alpha) pairs props use. */
  function tint(color, alpha) {
    let byAlpha = tintCache.get(color);
    if (!byAlpha) {
      byAlpha = new Map();
      tintCache.set(color, byAlpha);
    }
    let value = byAlpha.get(alpha);
    if (value === undefined) {
      value = Art.rgba(color, alpha);
      byAlpha.set(alpha, value);
    }
    return value;
  }

  const mirrorFaces = new Map();

  function mirrorFace(color) {
    let value = mirrorFaces.get(color);
    if (value === undefined) {
      value = Art.mix(color, "#0b1016", 0.55);
      mirrorFaces.set(color, value);
    }
    return value;
  }

  function phaseColor(phase) {
    return phase === "b" ? MATERIAL.carvedJade : MATERIAL.phaseBlue;
  }

  function powerupColor(kind) {
    return POWERUP_COLORS[kind] || MATERIAL.agedGold;
  }

  function portalColor(portal) {
    return PORTAL_COLORS[portal?.palette] || MATERIAL.phaseBlue;
  }

  /** A slow breathing envelope shared by pickups; gems shine a little brighter. */
  function pickupPulse(kind, time = 0, phase = 0) {
    const t = Math.max(0, Number(time) || 0);
    const p = Math.max(0, Number(phase) || 0);
    const wave = Math.sin(t * 3.2 + p * 0.7);
    const bright = kind === "gem" ? 0.72 : 0.5;
    return {
      pulse: 0.5 + wave * 0.5,
      wash: 0.14 + Math.max(0, wave) * bright * 0.08,
    };
  }

  // --- static icon geometry ----------------------------------------------------

  let shapes = null;

  /** Icon paths at the origin, built once on first draw (Path2D is browser-only). */
  function iconShapes() {
    if (shapes || typeof root.Path2D !== "function") return shapes;
    const P = root.Path2D;
    const sparkle = new P();
    for (let i = 0; i < 8; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 4;
      const radius = i % 2 ? 3.2 : 10.5;
      if (i === 0) sparkle.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else sparkle.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    sparkle.closePath();
    const sparkleCore = new P();
    for (let i = 0; i < 8; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 4;
      const radius = i % 2 ? 1.6 : 5.5;
      if (i === 0) sparkleCore.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else sparkleCore.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    sparkleCore.closePath();
    const gem = new P();
    gem.moveTo(0, -13);
    gem.lineTo(9, -3);
    gem.lineTo(0, 13);
    gem.lineTo(-9, -3);
    gem.closePath();
    const gemLight = new P();
    gemLight.moveTo(0, -13);
    gemLight.lineTo(-9, -3);
    gemLight.lineTo(0, 1);
    gemLight.closePath();
    const gemShade = new P();
    gemShade.moveTo(0, 1);
    gemShade.lineTo(9, -3);
    gemShade.lineTo(0, 13);
    gemShade.closePath();
    const heart = new P();
    heart.moveTo(0, 11);
    heart.bezierCurveTo(-15, 1, -12, -11, -5, -11);
    heart.bezierCurveTo(-1, -11, 0, -7, 0, -5);
    heart.bezierCurveTo(0, -7, 1, -11, 5, -11);
    heart.bezierCurveTo(12, -11, 15, 1, 0, 11);
    heart.closePath();
    const crescent = new P();
    crescent.arc(0, 0, 11, Math.PI * 0.3, Math.PI * 1.7, false);
    crescent.arc(4.5, -1.5, 9, Math.PI * 1.62, Math.PI * 0.38, true);
    crescent.closePath();
    const bell = new P();
    bell.moveTo(-3, -11);
    bell.lineTo(3, -11);
    bell.quadraticCurveTo(8, -10, 8, -2);
    bell.lineTo(10, 7);
    bell.quadraticCurveTo(0, 10, -10, 7);
    bell.lineTo(-8, -2);
    bell.quadraticCurveTo(-8, -10, -3, -11);
    bell.closePath();
    const leaf = new P();
    leaf.moveTo(1, -8);
    leaf.quadraticCurveTo(8, -15, 13, -10);
    leaf.quadraticCurveTo(7, -5, 1, -8);
    leaf.closePath();
    const coreDiamond = new P();
    coreDiamond.moveTo(0, -12);
    coreDiamond.lineTo(11, 0);
    coreDiamond.lineTo(0, 12);
    coreDiamond.lineTo(-11, 0);
    coreDiamond.closePath();
    const star5 = new P();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const radius = i % 2 ? 4.4 : 11;
      if (i === 0) star5.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else star5.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    star5.closePath();
    const blade = new P();
    blade.moveTo(-12, -9);
    blade.quadraticCurveTo(10, -8, 14, 0);
    blade.quadraticCurveTo(10, 8, -12, 9);
    blade.quadraticCurveTo(4, 0, -12, -9);
    blade.closePath();
    shapes = { sparkle, sparkleCore, gem, gemLight, gemShade, heart, crescent, bell, leaf, coreDiamond, star5, blade };
    return shapes;
  }

  // --- pickups -------------------------------------------------------------------

  /** Star dew (coin) and jade shards (gem). Coin boxes are 22 x 22. */
  function drawCoin(ctx, coin, options = {}) {
    const time = Number(options.time) || 0;
    const still = options.reducedMotion === true;
    const pulse = pickupPulse(coin.kind, time, coin.x).pulse;
    const bob = still ? 0 : Math.sin(time / 0.36 + coin.x) * 2.5;
    const cx = coin.x + 11;
    const cy = coin.y + 11 + bob;
    const gem = coin.kind === "gem";
    const color = gem ? MATERIAL.carvedJade : MATERIAL.agedGold;
    if (options.fx !== false) Art.drawGlow(ctx, cx, cy, gem ? 22 : 20, color, 0.32 + pulse * 0.3);
    const icons = iconShapes();
    ctx.save();
    ctx.translate(cx, cy);
    if (!icons) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (gem) {
      ctx.rotate(still ? 0 : Math.sin(time * 1.3 + coin.x) * 0.12);
      ctx.fillStyle = color;
      ctx.fill(icons.gem);
      ctx.fillStyle = "rgba(220,244,232,0.55)";
      ctx.fill(icons.gemLight);
      ctx.fillStyle = "rgba(16,48,40,0.45)";
      ctx.fill(icons.gemShade);
      ctx.strokeStyle = INK_LINE;
      ctx.lineWidth = 1.2;
      ctx.stroke(icons.gem);
      ctx.fillStyle = WHITE_HIGHLIGHT;
      ctx.fillRect(-3.5, -7, 2, 2);
    } else {
      ctx.rotate(still ? 0 : Math.sin(time * 0.9 + coin.x) * 0.2);
      const scale = 0.92 + pulse * 0.12;
      ctx.scale(scale, scale);
      ctx.fillStyle = color;
      ctx.fill(icons.sparkle);
      ctx.strokeStyle = INK_SOFT;
      ctx.lineWidth = 1;
      ctx.stroke(icons.sparkle);
      ctx.fillStyle = MATERIAL.moonWhite;
      ctx.fill(icons.sparkleCore);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(0, 0, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** Power-up medallions: a halo, a gilt ring, and one readable icon. Boxes are 30 x 30. */
  function drawPowerup(ctx, powerup, options = {}) {
    const time = Number(options.time) || 0;
    const still = options.reducedMotion === true;
    const color = powerupColor(powerup.kind);
    const pulse = pickupPulse(powerup.kind, time, powerup.x).pulse;
    const bob = still ? 0 : Math.sin(time / 0.28 + powerup.x) * 3;
    const cx = powerup.x + powerup.w / 2;
    const cy = powerup.y + powerup.h / 2 + bob;
    if (options.fx !== false) Art.drawGlow(ctx, cx, cy, 30, color, 0.3 + pulse * 0.25);
    const icons = iconShapes();
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = "rgba(11,16,22,0.62)";
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = GOLD_LINE;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.strokeStyle = tint(color, 0.55);
    ctx.lineWidth = 1;
    ctx.beginPath();
    const spin = still ? 0 : time * 0.8;
    ctx.arc(0, 0, 19.5, spin, spin + Math.PI * 0.6);
    ctx.moveTo(Math.cos(spin + Math.PI) * 19.5, Math.sin(spin + Math.PI) * 19.5);
    ctx.arc(0, 0, 19.5, spin + Math.PI, spin + Math.PI * 1.6);
    ctx.stroke();
    if (!icons) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (powerup.kind === "berry") {
      ctx.fillStyle = MATERIAL.carvedJade;
      ctx.fill(icons.leaf);
      ctx.fillStyle = color;
      for (const [x, y, r] of BERRY_CLUSTER) {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = WHITE_HIGHLIGHT;
      ctx.beginPath();
      ctx.arc(-4.5, -0.5, 1.6, 0, Math.PI * 2);
      ctx.arc(3, 3.5, 1.3, 0, Math.PI * 2);
      ctx.fill();
    } else if (powerup.kind === "moon") {
      ctx.fillStyle = color;
      ctx.fill(icons.crescent);
      ctx.strokeStyle = MATERIAL.agedGold;
      ctx.lineWidth = 1;
      ctx.stroke(icons.crescent);
    } else if (powerup.kind === "core") {
      ctx.fillStyle = color;
      ctx.fill(icons.coreDiamond);
      ctx.strokeStyle = INK_LINE;
      ctx.lineWidth = 1;
      ctx.stroke(icons.coreDiamond);
      ctx.scale(0.62, 0.62);
      ctx.fillStyle = MATERIAL.moonWhite;
      ctx.fill(icons.sparkle);
    } else if (powerup.kind === "heart") {
      ctx.fillStyle = color;
      ctx.fill(icons.heart);
      ctx.strokeStyle = INK_LINE;
      ctx.lineWidth = 1;
      ctx.stroke(icons.heart);
      ctx.fillStyle = WHITE_HIGHLIGHT;
      ctx.beginPath();
      ctx.arc(-5, -5, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.fill(icons.bell);
      ctx.strokeStyle = INK_LINE;
      ctx.lineWidth = 1;
      ctx.stroke(icons.bell);
      ctx.fillStyle = BRONZE_DEEP;
      ctx.fillRect(-7, 3, 14, 1.4);
      ctx.beginPath();
      ctx.arc(0, 10, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = WHITE_FAINT;
      ctx.fillRect(-5, -6, 2, 8);
    }
    ctx.restore();
  }

  const BERRY_CLUSTER = Object.freeze([
    Object.freeze([-3.5, 1, 5.2]),
    Object.freeze([3.5, 2, 4.6]),
    Object.freeze([0, -4, 4.4]),
  ]);

  // --- goal ----------------------------------------------------------------------

  /**
   * The chapter exit: a moon gate (a round stone opening) holding a slow star
   * whirl. A warden-sealed gate goes dark and shows an ice-crack lattice, so
   * "not yet" reads before the player walks into it.
   */
  function drawGoal(ctx, goal, options = {}) {
    const time = Number(options.time) || 0;
    const still = options.reducedMotion === true;
    const sealed = options.sealed === true;
    const cx = goal.x + goal.w / 2;
    const radius = Math.min(goal.w * 0.7, goal.h * 0.42);
    const cy = goal.y + goal.h - radius - 6;
    const ground = goal.y + goal.h;
    if (!sealed) Art.drawGlow(ctx, cx, cy, radius * 2.3, MATERIAL.agedGold, 0.32 + (still ? 0 : Math.sin(time * 1.6) * 0.05));
    ctx.save();
    // Plinth.
    ctx.fillStyle = STONE_DEEP;
    ctx.fillRect(cx - radius - 6, ground - 6, (radius + 6) * 2, 6);
    ctx.fillStyle = STONE;
    ctx.fillRect(cx - radius - 2, ground - 9, (radius + 2) * 2, 4);
    // Interior.
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2);
    ctx.fillStyle = sealed ? "#121a24" : "#1b2a3b";
    ctx.fill();
    ctx.save();
    ctx.clip();
    if (sealed) {
      ctx.strokeStyle = "rgba(198,191,174,0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (const [x0, y0, x1, y1] of SEAL_LATTICE) {
        ctx.moveTo(cx + x0 * radius, cy + y0 * radius);
        ctx.lineTo(cx + x1 * radius, cy + y1 * radius);
      }
      ctx.stroke();
    } else {
      Art.drawGlow(ctx, cx, cy, radius * 1.25, MATERIAL.moonWhite, 0.55);
      const spin = still ? 0 : time * 0.55;
      ctx.lineCap = "round";
      for (let arm = 0; arm < 3; arm += 1) {
        ctx.strokeStyle = arm === 1 ? "rgba(109,168,149,0.55)" : "rgba(226,194,125,0.6)";
        ctx.lineWidth = 2.2 - arm * 0.4;
        ctx.beginPath();
        for (let step = 0; step <= 18; step += 1) {
          const t = step / 18;
          const angle = spin + arm * ((Math.PI * 2) / 3) + t * 3.6;
          const r = (radius - 8) * (1 - t * 0.85);
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          if (step === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = "#fffaf0";
      for (let i = 0; i < 9; i += 1) {
        const angle = (still ? 0 : time * (0.3 + (i % 3) * 0.12)) + i * 2.1;
        const r = (radius - 10) * (0.25 + ((i * 37) % 10) / 13);
        const twinkle = still ? 0.7 : 0.45 + Math.sin(time * 3 + i) * 0.35;
        ctx.globalAlpha = Math.max(0, twinkle);
        ctx.fillRect(cx + Math.cos(angle) * r - 1, cy + Math.sin(angle) * r - 1, 2, 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // Stone ring with a gilt inlay.
    ctx.lineWidth = 9;
    ctx.strokeStyle = sealed ? "#3a4450" : STONE;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = INK_LINE;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 4.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = sealed ? MATERIAL.agedGoldDeep : GOLD_LINE;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    // Keystone ornament.
    ctx.fillStyle = sealed ? MATERIAL.agedGoldDeep : MATERIAL.agedGold;
    ctx.beginPath();
    ctx.moveTo(cx, cy - radius - 8);
    ctx.lineTo(cx + 5, cy - radius);
    ctx.lineTo(cx, cy - radius + 8);
    ctx.lineTo(cx - 5, cy - radius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  const SEAL_LATTICE = Object.freeze([
    [-0.9, -0.2, -0.1, -0.35], [-0.1, -0.35, 0.3, -0.9], [-0.1, -0.35, 0.15, 0.2],
    [0.15, 0.2, 0.9, 0.05], [0.15, 0.2, -0.35, 0.85], [-0.35, 0.85, -0.9, 0.35],
    [0.15, 0.2, 0.55, 0.75], [-0.1, -0.35, -0.6, -0.75], [0.3, -0.9, 0.85, -0.45],
  ].map((segment) => Object.freeze(segment)));

  // --- portals -------------------------------------------------------------------

  /** Paired portals: an upright bronze mirror whose face carries the pair colour. */
  function drawPortal(ctx, portal, options = {}) {
    const time = Number(options.time) || 0;
    const still = options.reducedMotion === true;
    const color = portalColor(portal);
    const cx = portal.x + portal.w / 2;
    const cy = portal.y + portal.h / 2;
    const rx = portal.w * 0.5;
    const ry = portal.h * 0.5;
    const breathe = still ? 0 : Math.sin(time * 3 + portal.x * 0.01);
    Art.drawGlow(ctx, cx, cy, portal.h * 0.85, color, 0.32 + breathe * 0.06);
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 3, ry - 3, 0, 0, Math.PI * 2);
    ctx.fillStyle = mirrorFace(color);
    ctx.fill();
    ctx.save();
    ctx.clip();
    Art.drawGlow(ctx, cx, cy, ry * 0.95, color, 0.75);
    ctx.strokeStyle = WHITE_HIGHLIGHT;
    ctx.lineWidth = 1.4;
    const spin = still ? 0 : time * 1.4;
    for (let ring = 0; ring < 3; ring += 1) {
      ctx.globalAlpha = 0.5 - ring * 0.12;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * (0.32 + ring * 0.2), ry * (0.3 + ring * 0.2), 0, spin + ring * 1.7, spin + ring * 1.7 + Math.PI * 1.3);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // Bronze rim with cast knobs.
    ctx.lineWidth = 4;
    ctx.strokeStyle = BRONZE;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.strokeStyle = INK_LINE;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx + 2.2, ry + 2.2, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = tint(color, 0.9);
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx - 2.4, ry - 2.4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = BRONZE_DEEP;
    for (let i = 0; i < 4; i += 1) {
      const angle = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry, 2.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Stand.
    ctx.fillStyle = BRONZE_DEEP;
    ctx.fillRect(cx - 9, portal.y + portal.h - 2, 18, 4);
    ctx.restore();
  }

  // --- crosswind -------------------------------------------------------------------

  /**
   * A crosswind column: silk streams drift with the wind, and swallow-tail
   * chevrons point the same way so direction reads even when motion is reduced.
   * Only rows inside `rect` are drawn.
   */
  function drawWind(ctx, wind, options = {}) {
    const time = Number(options.time) || 0;
    const still = options.reducedMotion === true;
    const rect = options.rect || wind;
    const direction = Math.sign(wind.force) || 1;
    const spacing = Number(options.arrowSpacing) || 72;
    const speed = Number(options.arrowSpeed) || 18;
    const x0 = wind.x;
    const x1 = wind.x + wind.w;
    const top = Math.max(wind.y, rect.y - 40);
    const bottom = Math.min(wind.y + wind.h, rect.y + rect.h + 40);
    if (bottom <= top) return;
    ctx.save();
    // Column edges: two soft curtains mark where the wind begins and ends.
    ctx.fillStyle = "rgba(198,191,174,0.06)";
    ctx.fillRect(x0, top, wind.w, bottom - top);
    ctx.fillStyle = "rgba(198,191,174,0.1)";
    ctx.fillRect(x0, top, 3, bottom - top);
    ctx.fillRect(x1 - 3, top, 3, bottom - top);
    // Silk streams.
    const flow = still ? 0 : time * speed * 3.2 * direction;
    ctx.lineCap = "round";
    ctx.setLineDash(STREAM_DASH);
    const firstRow = Math.floor((top - wind.y) / 64) * 64 + wind.y + 32;
    for (let y = firstRow; y < bottom; y += 64) {
      const row = Math.round((y - wind.y) / 64);
      ctx.lineDashOffset = -flow - row * 37;
      ctx.strokeStyle = row % 2 ? "rgba(238,231,213,0.22)" : "rgba(159,214,191,0.2)";
      ctx.lineWidth = row % 3 === 0 ? 2 : 1.3;
      ctx.beginPath();
      for (let x = x0 + 6; x <= x1 - 6; x += 24) {
        const yy = y + Math.sin((x + row * 53) * 0.021 + (still ? 0 : time * 1.2)) * 9;
        if (x === x0 + 6) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.setLineDash(NO_DASH);
    // Swallow-tail chevrons.
    const phase = still ? 0 : ((time / 0.3) * speed) % spacing;
    ctx.fillStyle = "rgba(238,231,213,0.62)";
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 1;
    const firstChevronRow = Math.floor((top - wind.y - 72) / 110) * 110 + wind.y + 72;
    for (let y = Math.max(wind.y + 72, firstChevronRow); y < bottom; y += 110) {
      for (let i = -1; i <= Math.ceil(wind.w / spacing) + 1; i += 1) {
        const localX = i * spacing + (direction > 0 ? phase : -phase);
        const x = wind.x + localX;
        if (x < x0 + 14 || x > x1 - 14) continue;
        const bob = still ? 0 : Math.sin(time * 6.6 + y * 0.04) * 6;
        ctx.beginPath();
        ctx.moveTo(x + direction * 13, y + bob);
        ctx.lineTo(x - direction * 7, y - 9 + bob);
        ctx.lineTo(x - direction * 2, y + bob);
        ctx.lineTo(x - direction * 7, y + 9 + bob);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  const STREAM_DASH = Object.freeze([46, 30, 8, 30]);
  const NO_DASH = Object.freeze([]);

  // --- projectiles -------------------------------------------------------------------

  /**
   * Player shots: Nini's spinning star seal, Yuan's crescent wind blade. The
   * colour comes from the caller, which resolves the simulation's tone.
   */
  function drawProjectile(ctx, projectile, options = {}) {
    const time = Number(options.time) || 0;
    const color = options.color || MATERIAL.agedGold;
    const cx = projectile.x + projectile.w / 2;
    const cy = projectile.y + projectile.h / 2;
    const direction = Math.sign(projectile.vx) || 1;
    const icons = iconShapes();
    if (options.fx !== false) Art.drawGlow(ctx, cx, cy, projectile.boosted ? 30 : 22, color, 0.55);
    ctx.save();
    ctx.translate(cx, cy);
    // A short ink-wash wake behind the shot.
    ctx.fillStyle = tint(color, 0.22);
    ctx.beginPath();
    ctx.ellipse(-direction * 14, 0, 14, projectile.h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!icons) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    if (projectile.owner === "nini") {
      ctx.rotate(time * 8.3 * direction);
      ctx.fillStyle = color;
      ctx.fill(icons.star5);
      ctx.strokeStyle = INK_SOFT;
      ctx.lineWidth = 1;
      ctx.stroke(icons.star5);
      ctx.fillStyle = MATERIAL.moonWhite;
      ctx.beginPath();
      ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.scale(direction, 1);
      ctx.fillStyle = color;
      ctx.fill(icons.blade);
      ctx.strokeStyle = WHITE_HIGHLIGHT;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.quadraticCurveTo(8, -5, 11, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- phase tide --------------------------------------------------------------------

  /**
   * World 3's tide: slow vertical currents tinted by the active phase. During
   * the warning window they thicken and brighten with urgency.
   */
  function drawPhaseTide(ctx, tide, options = {}) {
    if (!tide?.enabled) return;
    const rect = options.rect;
    const time = Number(options.time) || 0;
    const still = options.reducedMotion === true;
    const color = phaseColor(tide.active);
    const urgency = tide.warning ? tide.urgency || 0 : 0;
    const startX = Math.floor((rect.x - 160) / 220) * 220;
    const top = Math.floor((rect.y - 60) / 44) * 44;
    const bottom = rect.y + rect.h + 60;
    ctx.save();
    ctx.globalAlpha = tide.warning ? 0.18 + urgency * 0.1 : 0.1;
    ctx.strokeStyle = color;
    ctx.lineWidth = tide.warning ? 2 + urgency * 2 : 1.6;
    ctx.beginPath();
    for (let x = startX; x < rect.x + rect.w + 220; x += 220) {
      for (let y = top; y < bottom; y += 44) {
        const px = x + Math.sin(y * 0.018 + (still ? 0 : time * 1.6) + tide.progress * Math.PI * 2) * 18;
        if (y === top) ctx.moveTo(px, y);
        else ctx.lineTo(px, y);
      }
    }
    ctx.stroke();
    ctx.restore();
  }

  /** Inactive-phase pickups: a faint, breathing ghost of the real thing. */
  const ghostOptions = { time: 0, reducedMotion: false, fx: false };

  function drawPickupGhost(ctx, pickup, options = {}) {
    const time = Number(options.time) || 0;
    const previous = ctx.globalAlpha;
    ghostOptions.time = time;
    ghostOptions.reducedMotion = options.reducedMotion === true;
    ctx.globalAlpha = previous * (0.22 + Math.sin(time * 4.5 + pickup.x) * 0.05);
    if (pickup.kind === "coin" || pickup.kind === "gem") drawCoin(ctx, pickup, ghostOptions);
    else drawPowerup(ctx, pickup, ghostOptions);
    ctx.globalAlpha = previous;
  }

  const api = {
    MATERIAL,
    phaseColor,
    powerupColor,
    portalColor,
    pickupPulse,
    drawCoin,
    drawPowerup,
    drawGoal,
    drawPortal,
    drawWind,
    drawProjectile,
    drawPhaseTide,
    drawPickupGhost,
  };

  root.NiniYuanProps = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
