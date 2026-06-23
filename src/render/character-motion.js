((root) => {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function resolveCharacterMotion(input) {
    const {
      id,
      facing = 1,
      vx = 0,
      vy = 0,
      onGround = true,
      speed = 460,
      turnTimer = 0,
      turnDuration = 0.1,
      landingTimer = 0,
      shootTimer = 0,
      glide = 0,
      skillTimer = 0,
      hurtFlash = 0,
      gaitPhase = null,
      now = 0,
    } = input || {};

    const direction = facing < 0 ? "left" : "right";
    const stride = clamp(Math.abs(vx) / Math.max(1, speed), 0, 1.35);
    const forward = clamp((vx * facing) / Math.max(1, speed), -1.2, 1.2);
    const turnSpan = Number.isFinite(turnDuration) && turnDuration > 0 ? turnDuration : 0.1;
    const turning = clamp(turnTimer / turnSpan, 0, 1);
    const landing = clamp(landingTimer / 0.18, 0, 1);
    const clock = now / 1000;
    const gait = Number.isFinite(gaitPhase) ? gaitPhase : clock * 11.5;
    const gaitWave = Math.sin(gait);
    const gaitPulse = Math.cos(gait * 2);

    let animation = "idle";
    let artifact = "rest";
    if (hurtFlash > 0) {
      animation = `hurt_${direction}`;
      artifact = "recoil";
    } else if ((id === "nini" && glide > 0) || (id === "yuan" && skillTimer > 0)) {
      animation = `skill_${direction}`;
      artifact = id === "nini" ? "star-dial-open" : "gui-sword-cut";
    } else if (shootTimer > 0) {
      animation = `shoot_${direction}`;
      artifact = id === "nini" ? "star-dial-cast" : "gui-sword-cast";
    } else if (landingTimer > 0) {
      animation = `land_${direction}`;
      artifact = "settle";
    } else if (turnTimer > 0) {
      animation = `turn_${direction}`;
      artifact = "turn";
    } else if (!onGround) {
      animation = vy > 120 ? "fall" : `jump_${direction}`;
      artifact = id === "nini" ? "star-dial-follow" : "gui-sword-follow";
    } else if (stride > 0.18) {
      animation = "run";
    }

    let bob = onGround
      ? stride > 0.18
        ? -Math.abs(gaitWave) * (1.2 + stride * 2.4)
        : Math.sin(clock * 2.4) * 0.9
      : 0;
    let lean = forward * (id === "nini" ? 0.055 : 0.07) + gaitWave * stride * 0.012;
    let scaleX = 1 + stride * 0.025 + gaitPulse * stride * 0.012;
    let scaleY = 1 - stride * 0.012 - gaitPulse * stride * 0.008;
    let lift = id === "nini" ? -2 : 0;

    if (turning > 0) {
      lean += Math.sin(turning * Math.PI) * 0.09;
      scaleX += Math.sin(turning * Math.PI) * 0.045;
      scaleY -= Math.sin(turning * Math.PI) * 0.035;
    }
    if (landing > 0) {
      const settle = Math.sin(landing * Math.PI);
      bob += settle * 5;
      scaleX += settle * 0.08;
      scaleY -= settle * 0.09;
    }
    if (!onGround && vy < -120) {
      scaleX -= 0.035;
      scaleY += 0.055;
      lift -= 4;
    } else if (!onGround && vy > 120) {
      scaleX += 0.035;
      scaleY -= 0.025;
    }
    if (artifact === "star-dial-open") {
      lean = clamp(forward * 0.028, -0.04, 0.04);
      scaleX += 0.025;
      scaleY -= 0.02;
      lift -= 8;
      bob = Math.sin(clock * 3.2) * 1.5;
    } else if (artifact === "gui-sword-cut") {
      lean = 0.18;
      scaleX += 0.10;
      scaleY -= 0.06;
      lift -= 2;
      bob = 0;
    } else if (artifact === "recoil") {
      lean = -0.10;
      scaleX += 0.05;
      scaleY -= 0.04;
    } else if (shootTimer > 0) {
      lean -= 0.035;
      scaleX += 0.025;
    }

    return { animation, artifact, direction, bob, lean, scaleX, scaleY, lift };
  }

  function resolveSpriteOrientation(animation, facing = 1, options = {}) {
    if (options.frontFacing === true) {
      return {
        authoredDirection: true,
        frameScaleX: 1,
        leanScale: 1,
        artifactScale: 1,
      };
    }
    const directionScale = facing < 0 ? -1 : 1;
    const sourceDirectionScale = options.sourceFacing === "left" ? -1 : 1;
    const authoredDirection = /_(left|right)$/.test(animation || "") && options.mirror !== true;
    return {
      authoredDirection,
      frameScaleX: authoredDirection ? 1 : sourceDirectionScale * directionScale,
      leanScale: authoredDirection ? directionScale : 1,
      artifactScale: directionScale,
    };
  }

  const api = { resolveCharacterMotion, resolveSpriteOrientation };
  root.NiniYuanCharacterMotion = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
