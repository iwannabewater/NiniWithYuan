((root) => {
  "use strict";

  // Chapter creatures, painted as beings from Chinese myth:
  //
  //   slime -> Jade Toad, the moon palace toad carved in jade, hopping its
  //            patrol with a gilt cloud scroll on its back.
  //   ember -> Huodou, the fire-eating ink hound of the Classic of Mountains
  //            and Seas, with a flame mane and a curling fire tail.
  //   wisp  -> Lantern Wraith, a red paper lantern that drifted off its eave,
  //            ribs glowing, tassel swaying beneath it.
  //
  // `NAMES` carries their in-game Chinese names.
  //
  // Hitboxes are untouched: creatures are only drawn larger than their boxes
  // (the compact-viewport visual floor), and gameplay reads nothing from here.
  // Glows come from cached sprites; nothing here uses shadowBlur.


  const MATERIAL = Object.freeze({
    lacquer: "#0b1016",
    moonWhite: "#eee7d5",
    agedGold: "#c3a468",
    carvedJade: "#6da895",
    phaseBlue: "#7893a4",
    danger: "#c96978",
  });

  const PALETTES = Object.freeze({
    slime: Object.freeze({ body: "#6da895", light: "#b5e0cc", dark: "#2e5348", foot: "#29463e", core: "#d8efe4", intent: "#9bbcad" }),
    ember: Object.freeze({ body: "#2a1d22", light: "#f2a65a", dark: "#140d11", foot: "#1a1216", core: "#ffd27a", intent: "#e0915a" }),
    wisp: Object.freeze({ body: "#b8423f", light: "#ffcf8a", dark: "#5c1d22", foot: "#3a1418", core: "#fff0c4", intent: "#d88a6a" }),
  });

  /** Chinese bestiary names shown on first sighting. */
  const NAMES = Object.freeze({
    slime: "玉蟾",
    ember: "祸斗",
    wisp: "灯魅",
    sentry: "哨星",
    warder: "石胄",
  });

  const INK = "rgba(10,12,16,0.85)";
  const INK_SOFT = "rgba(10,12,16,0.35)";
  const SHADOW = "rgba(0,0,0,0.3)";
  const HIT_WASH = "#fff7d1";

  /** Soft glow via the shared sprite cache; skipped if the art helpers are absent. */
  function glow(ctx, x, y, radius, color, alpha) {
    const art = root.NiniYuanArt || (typeof require === "function" ? require("./art.js") : null);
    if (art) art.drawGlow(ctx, x, y, radius, color, alpha);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function paletteFor(type) {
    return PALETTES[type] || PALETTES.slime;
  }

  function resolveCreaturePose(enemy = {}, options = {}) {
    const phase = Number(enemy.phase) || 0;
    const direction = Math.sign(Number(enemy.vx) || Number(enemy.facing) || 1) || 1;
    const hit = clamp((Number(enemy.hitTimer) || 0) / Math.max(0.01, Number(options.hitDuration) || 0.18), 0, 1);
    const reducedMotion = options.reducedMotion === true;
    const gait = reducedMotion ? 0 : Math.sin(phase * (enemy.type === "wisp" ? 7 : 9));
    const focus = clamp(options.focus, 0, 1);
    return {
      direction,
      hit,
      gait,
      focus,
      scale: enemy.type === "wisp" ? 1.28 : 1.36,
      squashX: 1 + Math.abs(gait) * (enemy.type === "ember" ? 0.025 : 0.06),
      squashY: 1 - Math.abs(gait) * (enemy.type === "ember" ? 0.018 : 0.05),
    };
  }

  function wispShadowGeometry(enemy = {}, options = {}, pose = {}) {
    const width = Math.max(1, Number(enemy.w) || 1);
    const height = Math.max(1, Number(enemy.h) || 1);
    const baseY = Number.isFinite(Number(enemy.baseY)) ? Number(enemy.baseY) : Number(enemy.y) || 0;
    const scale = Math.max(0.1, Number(pose.scale) || 1.28);
    return {
      x: (Number(enemy.x) || 0) + width / 2,
      y: baseY + height + (Number(options.floatGap) || 24) + 2,
      rx: width * 0.36 * scale,
      ry: 3.5 * scale,
    };
  }

  function ellipse(ctx, x, y, rx, ry, rotation = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2);
  }

  // --- readability layers (unchanged contracts) ---------------------------------

  function drawPatrolIntent(ctx, enemy, pose, options) {
    const colors = paletteFor(enemy.type);
    const support = options.support;
    ctx.save();
    if (enemy.type === "wisp") {
      const centerX = enemy.x + enemy.w / 2;
      const centerY = enemy.y + enemy.h * 0.72;
      const tetherY = enemy.baseY + enemy.h + (Number(options.floatGap) || 24) + 2;
      ctx.globalAlpha = 0.16 + pose.focus * 0.14 + pose.hit * 0.16;
      ctx.strokeStyle = colors.intent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.quadraticCurveTo(centerX - pose.direction * 18, tetherY - 18, centerX - pose.direction * 30, tetherY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = colors.intent;
      ellipse(ctx, centerX - pose.direction * 30, tetherY, 5, 2.5);
      ctx.fill();
      ctx.restore();
      return;
    }
    const y = support ? support.y - 4 : enemy.y + enemy.h + 3;
    const minX = support ? support.x + 10 : enemy.x - 28;
    const maxX = support ? support.x + support.w - 10 : enemy.x + enemy.w + 28;
    const arrowX = clamp(enemy.x + enemy.w / 2 + pose.direction * 21, minX + 10, maxX - 10);
    ctx.globalAlpha = 0.13 + pose.focus * 0.14 + pose.hit * 0.15;
    ctx.strokeStyle = colors.intent;
    ctx.lineWidth = 1.6 + pose.focus * 0.7;
    ctx.beginPath();
    ctx.moveTo(minX, y);
    ctx.lineTo(maxX, y);
    ctx.stroke();
    ctx.globalAlpha = 0.32 + pose.focus * 0.2 + pose.hit * 0.2;
    ctx.beginPath();
    ctx.moveTo(minX, y - 4);
    ctx.lineTo(minX, y + 4);
    ctx.moveTo(maxX, y - 4);
    ctx.lineTo(maxX, y + 4);
    ctx.stroke();
    ctx.fillStyle = colors.intent;
    ctx.beginPath();
    ctx.moveTo(arrowX + pose.direction * 8, y - 8);
    ctx.lineTo(arrowX - pose.direction * 5, y - 13);
    ctx.lineTo(arrowX - pose.direction * 2, y - 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawHitContour(ctx, enemy, pose) {
    if (pose.hit <= 0) return;
    ctx.save();
    ctx.globalAlpha = 0.54 * pose.hit;
    ctx.strokeStyle = HIT_WASH;
    ctx.lineWidth = 2 + pose.hit * 2;
    ellipse(ctx, enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.w * (0.68 + pose.hit * 0.18), enemy.h * (0.64 + pose.hit * 0.14));
    ctx.stroke();
    ctx.restore();
  }

  /** A small chevron crown when the player is close: "this one is coming". */
  function drawFocusCrown(ctx, y, pose, colors) {
    if (pose.focus < 0.18) return;
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * (pose.focus - 0.18) * 0.4;
    ctx.strokeStyle = colors.intent;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-9, y);
    ctx.lineTo(-4, y - 5);
    ctx.lineTo(0, y);
    ctx.lineTo(4, y - 5);
    ctx.lineTo(9, y);
    ctx.stroke();
    ctx.globalAlpha = before;
  }

  /** On a hit, wash the current path toward warm white. */
  function hitWash(ctx, pose) {
    if (pose.hit <= 0) return;
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * pose.hit * 0.75;
    ctx.fillStyle = HIT_WASH;
    ctx.fill();
    ctx.globalAlpha = before;
  }

  // --- Jade Toad ----------------------------------------------------------------------

  function drawJadeToad(ctx, enemy, pose, options) {
    const c = PALETTES.slime;
    const hop = Math.max(0, pose.gait) * 3.5;
    const w = enemy.w;
    ctx.save();
    ctx.translate(enemy.x + w / 2, enemy.y + enemy.h);
    ctx.scale(pose.scale, pose.scale);
    ctx.fillStyle = SHADOW;
    ellipse(ctx, 0, 0.5, w * 0.48 * (1 - hop * 0.04), 3.6);
    ctx.fill();
    ctx.translate(0, -hop);
    ctx.scale(pose.direction * pose.squashX, pose.squashY);
    // Hind legs: folded haunches with webbed feet.
    ctx.fillStyle = c.dark;
    for (const side of [-1, 1]) {
      ellipse(ctx, side * 12, -6, 7.5, 6, side * 0.4);
      ctx.fill();
      ellipse(ctx, side * 15, -1, 6, 2.4, 0);
      ctx.fill();
    }
    // Body: a squat jade dome.
    const body = ctx.createRadialGradient(-5, -18, 2, 0, -10, w * 0.62);
    body.addColorStop(0, c.core);
    body.addColorStop(0.35, c.light);
    body.addColorStop(0.7, c.body);
    body.addColorStop(1, c.dark);
    ctx.fillStyle = body;
    ellipse(ctx, 0, -11, w * 0.5, 11.5);
    ctx.fill();
    hitWash(ctx, pose);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.1;
    ellipse(ctx, 0, -11, w * 0.5, 11.5);
    ctx.stroke();
    // Warts: pale jade bosses on the back.
    ctx.fillStyle = "rgba(216,239,228,0.55)";
    for (const [x, y, r] of WARTS) {
      ellipse(ctx, x, y, r, r * 0.8);
      ctx.fill();
    }
    // Gilt cloud scroll inlaid along the spine.
    ctx.strokeStyle = MATERIAL.agedGold;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-10, -17);
    ctx.bezierCurveTo(-6, -22, -1, -21, -1, -18);
    ctx.bezierCurveTo(-1, -15.5, -4.5, -15.5, -4.5, -17.5);
    ctx.moveTo(-1, -18);
    ctx.bezierCurveTo(3, -22, 8, -21, 9, -17);
    ctx.stroke();
    // Front legs.
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(8, -6);
    ctx.lineTo(11 + pose.gait, 0);
    ctx.moveTo(-2, -5);
    ctx.lineTo(-1 - pose.gait, 0);
    ctx.stroke();
    // Eyes high on the head, toward the direction of travel.
    for (const x of [5, 13]) {
      ctx.fillStyle = c.body;
      ellipse(ctx, x, -20, 4.4, 4.2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 0.9;
      ctx.stroke();
      ctx.fillStyle = "#e9c46a";
      ellipse(ctx, x + 0.4, -20.4, 3, 2.9);
      ctx.fill();
      ctx.fillStyle = MATERIAL.lacquer;
      ellipse(ctx, x + 1, -20.4, 0.9, 2.3);
      ctx.fill();
    }
    // A wide, calm mouth.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(4, -11);
    ctx.quadraticCurveTo(12, -8.5, 19, -12.5);
    ctx.stroke();
    // Throat glow: the moon it swallowed.
    ctx.fillStyle = "rgba(238,231,213,0.6)";
    ellipse(ctx, 12, -7, 3.4, 2);
    ctx.fill();
    drawFocusCrown(ctx, -30, pose, c);
    ctx.restore();
  }

  const WARTS = Object.freeze([
    [-12, -12, 2], [-6, -8, 1.6], [-14, -6.5, 1.3], [2, -9, 1.5], [-3, -14, 1.2], [9, -12, 1.4],
  ].map((wart) => Object.freeze(wart)));

  // --- Huodou -----------------------------------------------------------------------------

  function drawHuodou(ctx, enemy, pose, options) {
    const c = PALETTES.ember;
    const still = options.reducedMotion === true;
    const time = Number(options.time) || 0;
    const w = enemy.w;
    const flicker = still ? 0 : Math.sin(time * 14 + enemy.x * 0.07);
    ctx.save();
    ctx.translate(enemy.x + w / 2, enemy.y + enemy.h);
    ctx.scale(pose.scale, pose.scale);
    ctx.fillStyle = SHADOW;
    ellipse(ctx, 0, 0.5, w * 0.46, 3.4);
    ctx.fill();
    if (!still) glow(ctx, 0, -12, 26, "#ff8a3c", 0.32 + pose.focus * 0.15);
    ctx.scale(pose.direction * pose.squashX, pose.squashY);
    // Fire tail curling up behind.
    ctx.fillStyle = "#e0703a";
    ctx.beginPath();
    ctx.moveTo(-12, -12);
    ctx.bezierCurveTo(-22, -14, -25, -26 - flicker * 2, -18, -32 - flicker * 2);
    ctx.bezierCurveTo(-17, -25, -14, -21, -9, -17);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = c.core;
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.bezierCurveTo(-18, -16, -20, -23, -17, -27 - flicker);
    ctx.bezierCurveTo(-15, -22, -13, -19, -10, -16);
    ctx.closePath();
    ctx.fill();
    // Legs: a trotting gait, diagonal pairs together.
    ctx.strokeStyle = c.dark;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.beginPath();
    const a = pose.gait * 3;
    ctx.moveTo(-8, -9);
    ctx.lineTo(-9 + a, 0);
    ctx.moveTo(-4, -9);
    ctx.lineTo(-4 - a, 0);
    ctx.moveTo(7, -9);
    ctx.lineTo(7 - a, 0);
    ctx.moveTo(11, -9);
    ctx.lineTo(12 + a, 0);
    ctx.stroke();
    // Body: ink black with an ember belly.
    const body = ctx.createLinearGradient(0, -22, 0, -6);
    body.addColorStop(0, c.body);
    body.addColorStop(0.65, "#3a2228");
    body.addColorStop(1, "#b5562f");
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-13, -12);
    ctx.bezierCurveTo(-13, -19, -5, -20, 3, -19);
    ctx.bezierCurveTo(8, -18.5, 10, -17, 11, -15);
    ctx.bezierCurveTo(11, -10, 4, -7.5, -5, -8);
    ctx.bezierCurveTo(-11, -8, -13, -9, -13, -12);
    ctx.closePath();
    ctx.fill();
    hitWash(ctx, pose);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Neck and head: a raised skull, a long snout, an open ember jaw.
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(6, -17);
    ctx.bezierCurveTo(9, -22, 12, -26, 16, -26);
    ctx.bezierCurveTo(19, -26, 21, -24, 22, -22.5);
    ctx.lineTo(27, -21);
    ctx.quadraticCurveTo(28, -19.5, 26.5, -18.6);
    ctx.lineTo(21, -18.2);
    ctx.bezierCurveTo(18, -15, 13, -14, 9.5, -13);
    ctx.closePath();
    ctx.fill();
    hitWash(ctx, pose);
    ctx.strokeStyle = INK;
    ctx.stroke();
    ctx.fillStyle = "#f2a65a";
    ctx.beginPath();
    ctx.moveTo(21, -18.4);
    ctx.lineTo(26.5, -18.4);
    ctx.lineTo(22.5, -16.6);
    ctx.closePath();
    ctx.fill();
    // Ears.
    ctx.fillStyle = c.body;
    ctx.beginPath();
    ctx.moveTo(13, -25);
    ctx.lineTo(13.5, -32);
    ctx.lineTo(16.5, -25.5);
    ctx.moveTo(16, -25.8);
    ctx.lineTo(18.5, -31.5);
    ctx.lineTo(19.5, -24.4);
    ctx.fill();
    // Burning eye.
    ctx.fillStyle = c.core;
    ellipse(ctx, 18.4, -22.6, 1.7, 1.15, -0.25);
    ctx.fill();
    // Flame mane along the back.
    ctx.fillStyle = "#f2a65a";
    ctx.beginPath();
    ctx.moveTo(-9, -19);
    for (let i = 0; i < 5; i += 1) {
      const x = -9 + i * 4.6;
      const lick = 5 + ((i * 3) % 4) + (still ? 0 : Math.sin(time * 12 + i * 1.7) * 1.6);
      ctx.quadraticCurveTo(x + 1, -20 - lick, x + 3, -20 - lick * 0.35);
    }
    ctx.lineTo(12, -19);
    ctx.closePath();
    ctx.fill();
    // Sparks thrown off the mane.
    if (!still && time > 0) {
      const seed = Math.floor((enemy.x + enemy.y) / 23) % 3;
      const before = ctx.globalAlpha;
      for (let spark = 0; spark < 3; spark += 1) {
        const t = (time * (0.9 + spark * 0.3) + spark * 0.37 + seed * 0.21) % 1;
        ctx.globalAlpha = before * (1 - t) * 0.85;
        ctx.fillStyle = spark % 2 ? "#fff7d1" : "#f2a65a";
        ellipse(ctx, -6 + spark * 6 - t * 6, -24 - t * 12, 1.3 - t * 0.6, 1.3 - t * 0.6);
        ctx.fill();
      }
      ctx.globalAlpha = before;
    }
    drawFocusCrown(ctx, -36, pose, c);
    ctx.restore();
  }

  // --- Lantern Wraith ------------------------------------------------------------------------

  function drawLanternWraith(ctx, enemy, pose, options) {
    const c = PALETTES.wisp;
    const still = options.reducedMotion === true;
    const time = Number(options.time) || 0;
    const floatGap = Number(options.floatGap) || 24;
    const shadow = wispShadowGeometry(enemy, { floatGap }, pose);
    ctx.save();
    const before = ctx.globalAlpha;
    ctx.globalAlpha = before * (0.22 + pose.focus * 0.08);
    ctx.fillStyle = c.body;
    ellipse(ctx, shadow.x, shadow.y, shadow.rx, shadow.ry);
    ctx.fill();
    ctx.globalAlpha = before;
    ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    ctx.scale(pose.scale, pose.scale);
    const sway = still ? 0 : Math.sin(time * 2.2 + enemy.x * 0.01) * 0.12 + pose.gait * 0.05;
    ctx.rotate(sway);
    glow(ctx, 0, 0, 30 + pose.focus * 6, "#ffb45a", 0.42 + pose.hit * 0.3);
    // Hanging cord and top cap.
    ctx.strokeStyle = INK_SOFT;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(0, -16);
    ctx.stroke();
    ctx.fillStyle = "#2a1a14";
    ctx.fillRect(-6.5, -17, 13, 3.4);
    ctx.fillStyle = MATERIAL.agedGold;
    ctx.fillRect(-6.5, -17, 13, 1);
    // Paper body with ribs.
    const paper = ctx.createRadialGradient(-2, -2, 1, 0, 0, 16);
    paper.addColorStop(0, c.core);
    paper.addColorStop(0.35, c.light);
    paper.addColorStop(0.75, c.body);
    paper.addColorStop(1, c.dark);
    ctx.fillStyle = paper;
    ellipse(ctx, 0, 0, 13, 14);
    ctx.fill();
    hitWash(ctx, pose);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1;
    ellipse(ctx, 0, 0, 13, 14);
    ctx.stroke();
    ctx.strokeStyle = "rgba(92,29,34,0.55)";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (const k of [-0.62, -0.25, 0.25, 0.62]) {
      ctx.moveTo(13 * k, -14 * Math.sqrt(1 - k * k));
      ctx.quadraticCurveTo(15 * k * 1.12, 0, 13 * k, 14 * Math.sqrt(1 - k * k));
    }
    ctx.stroke();
    // Bottom cap and swaying tassel.
    ctx.fillStyle = "#2a1a14";
    ctx.fillRect(-5.5, 13, 11, 3);
    ctx.fillStyle = MATERIAL.agedGold;
    ctx.fillRect(-5.5, 15, 11, 1);
    const tassel = still ? 0 : Math.sin(time * 3.1 + enemy.x * 0.02) * 3 - pose.direction * 2;
    ctx.strokeStyle = "#c0392b";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    for (const dx of [-1.5, 0, 1.5]) {
      ctx.moveTo(dx, 16);
      ctx.quadraticCurveTo(dx + tassel * 0.4, 21, dx + tassel, 27);
    }
    ctx.stroke();
    ctx.fillStyle = MATERIAL.agedGold;
    ellipse(ctx, tassel * 0.15, 17.5, 1.6, 1.6);
    ctx.fill();
    // Face cut into the paper: crescent eyes and a small mouth, lit from within.
    ctx.fillStyle = "#3b0f12";
    ctx.beginPath();
    for (const x of [-4.6 + pose.direction, 4.6 + pose.direction]) {
      ctx.moveTo(x - 3, -2.5);
      ctx.quadraticCurveTo(x, -6.2, x + 3, -2.5);
      ctx.quadraticCurveTo(x, -4, x - 3, -2.5);
    }
    ctx.moveTo(-2.4 + pose.direction, 4);
    ctx.quadraticCurveTo(pose.direction, 6.5, 2.4 + pose.direction, 4);
    ctx.closePath();
    ctx.fill();
    drawFocusCrown(ctx, -27, pose, c);
    ctx.restore();
  }

  function drawEnemy(ctx, enemy, options = {}) {
    if (!ctx || !enemy) return;
    const pose = resolveCreaturePose(enemy, options);
    drawPatrolIntent(ctx, enemy, pose, options);
    drawHitContour(ctx, enemy, pose);
    if (enemy.type === "wisp") drawLanternWraith(ctx, enemy, pose, options);
    else if (enemy.type === "ember") drawHuodou(ctx, enemy, pose, options);
    else drawJadeToad(ctx, enemy, pose, options);
  }

  const api = {
    MATERIAL,
    NAMES,
    paletteFor,
    resolveCreaturePose,
    wispShadowGeometry,
    drawEnemy,
  };

  root.NiniYuanCreatureMaterial = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
