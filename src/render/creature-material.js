((root) => {
  "use strict";

  const MATERIAL = Object.freeze({
    lacquer: "#0b1016",
    moonWhite: "#eee7d5",
    agedGold: "#c3a468",
    carvedJade: "#6da895",
    phaseBlue: "#7893a4",
    danger: "#c96978",
  });

  const PALETTES = Object.freeze({
    slime: Object.freeze({ body: "#6da895", dark: "#365b51", foot: "#29463e", core: "#b6cec4", intent: "#9bbcad" }),
    ember: Object.freeze({ body: "#ad6859", dark: "#673b38", foot: "#4c2f32", core: "#d9b987", intent: "#c3a468" }),
    wisp: Object.freeze({ body: "#7893a4", dark: "#355364", foot: "#233948", core: "#d7e0dc", intent: "#7893a4" }),
  });

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
      squashX: 1 + Math.abs(gait) * (enemy.type === "ember" ? 0.025 : 0.045),
      squashY: 1 - Math.abs(gait) * (enemy.type === "ember" ? 0.018 : 0.035),
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
    ctx.strokeStyle = "#fff7d1";
    ctx.lineWidth = 2 + pose.hit * 2;
    ellipse(
      ctx,
      enemy.x + enemy.w / 2,
      enemy.y + enemy.h / 2,
      enemy.w * (0.68 + pose.hit * 0.18),
      enemy.h * (0.64 + pose.hit * 0.14),
    );
    ctx.stroke();
    ctx.restore();
  }

  function drawFocusCrown(ctx, enemy, pose, colors) {
    if (pose.focus < 0.18) return;
    ctx.save();
    ctx.globalAlpha = (pose.focus - 0.18) * 0.34;
    ctx.strokeStyle = colors.intent;
    ctx.lineWidth = 1.3;
    const y = -enemy.h * 0.66;
    ctx.beginPath();
    ctx.moveTo(-9, y);
    ctx.lineTo(-4, y - 5);
    ctx.lineTo(0, y);
    ctx.lineTo(4, y - 5);
    ctx.lineTo(9, y);
    ctx.stroke();
    ctx.restore();
  }

  function drawGroundCreature(ctx, enemy, pose) {
    const colors = paletteFor(enemy.type);
    const footY = enemy.h / 2;
    ctx.save();
    ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    ctx.translate(0, footY);
    ctx.scale(pose.scale, pose.scale);
    ctx.translate(0, -footY);
    ctx.scale(pose.squashX, pose.squashY);

    ctx.fillStyle = "rgba(0,0,0,.3)";
    ellipse(ctx, 0, footY + 1, enemy.w * 0.48, 4);
    ctx.fill();

    const step = pose.gait * 2.5;
    ctx.fillStyle = colors.foot;
    ellipse(ctx, -9 - step, footY - 1, 6.5, 4.2, -0.08);
    ctx.fill();
    ellipse(ctx, 9 + step, footY - 1, 6.5, 4.2, 0.08);
    ctx.fill();

    const body = ctx.createRadialGradient(-7, -8, 2, 0, 3, enemy.w * 0.62);
    body.addColorStop(0, pose.hit > 0 ? "#fff7d1" : colors.core);
    body.addColorStop(0.34, colors.body);
    body.addColorStop(1, colors.dark);
    ctx.fillStyle = body;
    ellipse(ctx, 0, 2, enemy.w * 0.57, enemy.h * 0.46);
    ctx.fill();
    ctx.strokeStyle = enemy.type === "ember" ? "rgba(195,164,104,.66)" : "rgba(182,206,196,.52)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (enemy.type === "ember") {
      ctx.fillStyle = MATERIAL.agedGold;
      ctx.beginPath();
      ctx.moveTo(-11, -10);
      ctx.quadraticCurveTo(-8, -23 - pose.gait * 2, -2, -12);
      ctx.quadraticCurveTo(1, -28 + pose.gait * 2, 5, -11);
      ctx.quadraticCurveTo(11, -22 - pose.gait, 12, -7);
      ctx.quadraticCurveTo(2, -11, -11, -10);
      ctx.fill();
      ctx.strokeStyle = "rgba(238,231,213,.4)";
      ctx.beginPath();
      ctx.moveTo(-8, 5);
      ctx.lineTo(-2, -1);
      ctx.lineTo(4, 6);
      ctx.lineTo(10, 0);
      ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(182,206,196,.78)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-14, -9);
      ctx.quadraticCurveTo(-7, -17 - pose.gait, 0, -10);
      ctx.quadraticCurveTo(7, -17 + pose.gait, 14, -9);
      ctx.stroke();
      ctx.fillStyle = "rgba(109,168,149,.78)";
      ellipse(ctx, -13, -11, 4, 7, -0.6);
      ctx.fill();
      ellipse(ctx, 13, -11, 4, 7, 0.6);
      ctx.fill();
    }

    ctx.fillStyle = "rgba(238,231,213,.9)";
    ellipse(ctx, -7, -4, 3.5, 4.6);
    ctx.fill();
    ellipse(ctx, 7, -4, 3.5, 4.6);
    ctx.fill();
    ctx.fillStyle = MATERIAL.lacquer;
    ellipse(ctx, -7 + pose.direction, -3, 1.35, 2.25);
    ctx.fill();
    ellipse(ctx, 7 + pose.direction, -3, 1.35, 2.25);
    ctx.fill();

    ctx.globalAlpha = 0.62;
    ctx.strokeStyle = MATERIAL.agedGold;
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(4, -10);
    ctx.lineTo(0, -6);
    ctx.lineTo(-4, -10);
    ctx.closePath();
    ctx.stroke();
    drawFocusCrown(ctx, enemy, pose, colors);
    ctx.restore();
  }

  function drawWisp(ctx, enemy, pose, options) {
    const colors = PALETTES.wisp;
    const floatGap = Number(options.floatGap) || 24;
    const footY = enemy.h / 2;
    ctx.save();
    const shadow = wispShadowGeometry(enemy, { ...options, floatGap }, pose);
    ctx.globalAlpha = 0.24 + pose.focus * 0.08;
    ctx.fillStyle = colors.body;
    ellipse(ctx, shadow.x, shadow.y, shadow.rx, shadow.ry);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2);
    ctx.scale(pose.scale, pose.scale);

    ctx.strokeStyle = "rgba(120,147,164,.58)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (let tail = 0; tail < 4; tail += 1) {
      const y = 6 + tail * 3.5;
      ctx.globalAlpha = 0.45 - tail * 0.07;
      ctx.beginPath();
      ctx.moveTo(-pose.direction * 4, y);
      ctx.quadraticCurveTo(
        -pose.direction * (15 + tail * 4),
        y + pose.gait * (4 + tail),
        -pose.direction * (26 + tail * 4),
        y - 5,
      );
      ctx.stroke();
    }

    const wing = pose.gait * 4;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "rgba(120,147,164,.74)";
    ellipse(ctx, -16, -3 - wing, 10, 18, -0.72);
    ctx.fill();
    ellipse(ctx, 16, -3 + wing, 10, 18, 0.72);
    ctx.fill();
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = "rgba(238,231,213,.92)";
    ellipse(ctx, -13, -8 - wing * 0.5, 3, 9, -0.72);
    ctx.fill();
    ellipse(ctx, 13, -8 + wing * 0.5, 3, 9, 0.72);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowColor = colors.body;
    ctx.shadowBlur = 8 + pose.hit * 6 + pose.focus * 4;
    const core = ctx.createRadialGradient(-4, -6, 2, 0, 0, 21);
    core.addColorStop(0, pose.hit > 0 ? MATERIAL.moonWhite : colors.core);
    core.addColorStop(0.44, colors.body);
    core.addColorStop(1, colors.dark);
    ctx.fillStyle = core;
    ellipse(ctx, 0, 0, enemy.w * 0.39, enemy.h * 0.45);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = "rgba(238,231,213,.76)";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(6, -3);
    ctx.lineTo(0, 12);
    ctx.lineTo(-6, -3);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = "rgba(238,231,213,.86)";
    ellipse(ctx, -5, -6, 3, 4);
    ctx.fill();
    ellipse(ctx, 5, -6, 3, 4);
    ctx.fill();
    ctx.fillStyle = "#143047";
    ellipse(ctx, -5 + pose.direction, -5, 1.4, 2.2);
    ctx.fill();
    ellipse(ctx, 5 + pose.direction, -5, 1.4, 2.2);
    ctx.fill();
    drawFocusCrown(ctx, enemy, pose, colors);
    ctx.restore();
  }

  function drawEnemy(ctx, enemy, options = {}) {
    if (!ctx || !enemy) return;
    const pose = resolveCreaturePose(enemy, options);
    drawPatrolIntent(ctx, enemy, pose, options);
    drawHitContour(ctx, enemy, pose);
    if (enemy.type === "wisp") drawWisp(ctx, enemy, pose, options);
    else drawGroundCreature(ctx, enemy, pose);
  }

  const api = {
    MATERIAL,
    paletteFor,
    resolveCreaturePose,
    wispShadowGeometry,
    drawEnemy,
  };

  root.NiniYuanCreatureMaterial = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
