((root) => {
  "use strict";

  const PALETTES = Object.freeze({
    nini: Object.freeze({ primary: "#b87b86", secondary: "#c3a468", pale: "#eee7d5" }),
    yuan: Object.freeze({ primary: "#6da895", secondary: "#c3a468", pale: "#eee7d5" }),
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function baseAnimationName(animation = "idle") {
    return String(animation).replace(/_(?:left|right)$/, "");
  }

  /**
   * A presentation-only action envelope. The atlas owns the pose; this helper
   * gives that pose a readable contact, release, and recovery beat without
   * changing collision geometry or action duration.
   */
  function resolveEffectPlan(input = {}) {
    const animation = baseAnimationName(input.animation);
    const elapsed = Math.max(0, Number(input.elapsed) || 0);
    const stride = clamp(input.stride, 0, 1.35);
    const reducedMotion = input.reducedMotion === true;
    const plan = {
      animation,
      contact: 0,
      cast: 0,
      orbit: 0,
      slash: 0,
      trailCount: 0,
      trailSpacing: 0,
      trailAlpha: 0,
    };

    if (animation === "land") {
      plan.contact = Math.pow(1 - clamp(elapsed / 0.2, 0, 1), 2);
    } else if (animation === "shoot") {
      plan.cast = Math.pow(1 - clamp(elapsed / 0.18, 0, 1), 1.5);
    } else if (animation === "skill") {
      const release = 1 - clamp(elapsed / 0.24, 0, 1);
      if (input.id === "nini") plan.orbit = 0.58 + release * 0.42;
      else plan.slash = Math.max(0.16, release);
      if (!reducedMotion) {
        plan.trailCount = 2;
        plan.trailSpacing = input.id === "yuan" ? 0.14 : 0.08;
        plan.trailAlpha = input.id === "yuan" ? 0.11 : 0.085;
      }
    } else if (animation === "run" && stride >= 0.46 && !reducedMotion) {
      plan.trailCount = stride > 0.9 ? 2 : 1;
      plan.trailSpacing = 0.055 + stride * 0.035;
      plan.trailAlpha = 0.055 + stride * 0.035;
    }

    return plan;
  }

  function ellipse(ctx, x, y, rx, ry, rotation = 0) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rotation, 0, Math.PI * 2);
  }

  function drawUnderlay(ctx, options = {}) {
    const plan = options.plan || resolveEffectPlan(options);
    const palette = PALETTES[options.id] || PALETTES.nini;
    const width = Math.max(1, Number(options.width) || 1);
    const height = Math.max(1, Number(options.height) || 1);
    const time = Number(options.time) || 0;
    const direction = options.direction < 0 ? -1 : 1;
    ctx.save();
    ctx.lineCap = "round";

    if (plan.contact > 0.001) {
      ctx.globalAlpha = 0.18 + plan.contact * 0.5;
      ctx.strokeStyle = palette.secondary;
      ctx.lineWidth = 1.2 + plan.contact * 1.8;
      ellipse(ctx, 0, 2, width * (0.3 + (1 - plan.contact) * 0.22), height * 0.028);
      ctx.stroke();
      ctx.globalAlpha = 0.22 + plan.contact * 0.34;
      for (let ray = -2; ray <= 2; ray += 1) {
        const x = ray * width * 0.12;
        ctx.beginPath();
        ctx.moveTo(x * 0.55, 1);
        ctx.lineTo(x, 4 + Math.abs(ray) * 1.2);
        ctx.stroke();
      }
    }

    if (plan.orbit > 0) {
      const still = options.reducedMotion === true;
      const rotation = still ? -0.45 : time * 1.7;
      ctx.globalAlpha = 0.18 + plan.orbit * 0.2;
      ctx.strokeStyle = palette.secondary;
      ctx.lineWidth = 1.15;
      ctx.save();
      ctx.translate(0, -height * 0.48);
      ctx.rotate(rotation);
      ellipse(ctx, 0, 0, width * 0.5, height * 0.16, 0.28);
      ctx.stroke();
      ctx.rotate(-rotation * 1.65);
      ellipse(ctx, 0, 0, width * 0.42, height * 0.115, -0.35);
      ctx.stroke();
      ctx.fillStyle = palette.primary;
      ctx.globalAlpha = 0.5 + plan.orbit * 0.28;
      ellipse(ctx, width * 0.36, -height * 0.045, Math.max(2, width * 0.026), Math.max(2, width * 0.026));
      ctx.fill();
      ctx.restore();
    }

    if (plan.slash > 0) {
      ctx.globalAlpha = 0.1 + plan.slash * 0.28;
      ctx.strokeStyle = palette.primary;
      ctx.lineWidth = 1.5 + plan.slash * 2.2;
      for (let echo = 0; echo < 3; echo += 1) {
        ctx.globalAlpha *= echo === 0 ? 1 : 0.68;
        ctx.beginPath();
        ctx.moveTo(-direction * width * (0.52 + echo * 0.05), -height * (0.1 - echo * 0.03));
        ctx.quadraticCurveTo(
          direction * width * 0.02,
          -height * (0.82 - echo * 0.035),
          direction * width * (0.68 - echo * 0.04),
          -height * (0.42 - echo * 0.02),
        );
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawAfterimages(ctx, image, frame, options = {}) {
    const plan = options.plan || resolveEffectPlan(options);
    if (!image || plan.trailCount <= 0) return;
    const width = Math.max(1, Number(options.width) || 1);
    const height = Math.max(1, Number(options.height) || 1);
    const direction = options.direction < 0 ? -1 : 1;
    const frameScaleX = options.frameScaleX < 0 ? -1 : 1;
    const localDirection = direction * frameScaleX;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    for (let index = plan.trailCount; index >= 1; index -= 1) {
      const distance = width * plan.trailSpacing * index;
      ctx.globalAlpha = plan.trailAlpha * (1 - (index - 1) / (plan.trailCount + 1));
      ctx.drawImage(
        image,
        frame.sx,
        frame.sy,
        frame.sw,
        frame.sh,
        -width / 2 - localDirection * distance,
        -height,
        width,
        height,
      );
    }
    ctx.restore();
  }

  function drawOverlay(ctx, options = {}) {
    const plan = options.plan || resolveEffectPlan(options);
    const palette = PALETTES[options.id] || PALETTES.nini;
    const width = Math.max(1, Number(options.width) || 1);
    const height = Math.max(1, Number(options.height) || 1);
    const direction = options.direction < 0 ? -1 : 1;
    if (plan.cast <= 0.001) return;
    const x = direction * width * 0.43;
    const y = -height * 0.56;
    const radius = Math.max(3, width * (0.045 + plan.cast * 0.025));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.globalAlpha = 0.24 + plan.cast * 0.62;
    ctx.strokeStyle = palette.pale;
    ctx.lineWidth = 1.1 + plan.cast * 1.3;
    ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
    ctx.globalAlpha = 0.24 + plan.cast * 0.36;
    ctx.strokeStyle = palette.secondary;
    ctx.strokeRect(-radius * 1.8, -radius * 1.8, radius * 3.6, radius * 3.6);
    ctx.restore();
  }

  const api = {
    baseAnimationName,
    resolveEffectPlan,
    drawUnderlay,
    drawAfterimages,
    drawOverlay,
  };

  root.NiniYuanCharacterEffects = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
