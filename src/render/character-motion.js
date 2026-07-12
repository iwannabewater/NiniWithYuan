((root) => {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function resolveMotionFacing(input = {}) {
    const facing = input.facing < 0 ? -1 : 1;
    if (input.id === "yuan" && Number(input.skillTimer) > 0) return input.dashDir < 0 ? -1 : 1;
    return facing;
  }

  function shouldHoldLandingPose(landingTimer = 0, stride = 0) {
    const timer = Math.max(0, Number(landingTimer) || 0);
    if (timer <= 0) return false;
    return timer > 0.11 || Math.max(0, Number(stride) || 0) < 0.62;
  }

  function emptyMotionPose() {
    return { bob: 0, lean: 0, scaleX: 1, scaleY: 1, lift: 0, stride: 0, forward: 0 };
  }

  function blendMotionPose(previous, next, alpha = 1, options = {}) {
    const from = previous && typeof previous === "object" ? previous : emptyMotionPose();
    const to = next && typeof next === "object" ? next : emptyMotionPose();
    if (options.snap === true) {
      return {
        bob: Number(to.bob) || 0,
        lean: Number(to.lean) || 0,
        scaleX: Number.isFinite(Number(to.scaleX)) ? Number(to.scaleX) : 1,
        scaleY: Number.isFinite(Number(to.scaleY)) ? Number(to.scaleY) : 1,
        lift: Number(to.lift) || 0,
        stride: Number(to.stride) || 0,
        forward: Number(to.forward) || 0,
        animation: to.animation,
        artifact: to.artifact,
        direction: to.direction,
        gaitWave: Number(to.gaitWave) || 0,
      };
    }
    const t = clamp(Number(alpha) || 0, 0, 1);
    const ease = t * t * (3 - 2 * t);
    return {
      bob: lerp(Number(from.bob) || 0, Number(to.bob) || 0, ease),
      lean: lerp(Number(from.lean) || 0, Number(to.lean) || 0, ease),
      scaleX: lerp(
        Number.isFinite(Number(from.scaleX)) ? Number(from.scaleX) : 1,
        Number.isFinite(Number(to.scaleX)) ? Number(to.scaleX) : 1,
        ease,
      ),
      scaleY: lerp(
        Number.isFinite(Number(from.scaleY)) ? Number(from.scaleY) : 1,
        Number.isFinite(Number(to.scaleY)) ? Number(to.scaleY) : 1,
        ease,
      ),
      lift: lerp(Number(from.lift) || 0, Number(to.lift) || 0, ease),
      stride: lerp(Number(from.stride) || 0, Number(to.stride) || 0, ease),
      forward: lerp(Number(from.forward) || 0, Number(to.forward) || 0, ease),
      animation: to.animation,
      artifact: to.artifact,
      direction: to.direction,
      gaitWave: Number(to.gaitWave) || 0,
    };
  }

  function advanceAnimationState(previous, animation, simulationTime = 0) {
    const name = typeof animation === "string" && animation ? animation : "idle";
    const now = Math.max(0, Number(simulationTime) || 0);
    if (previous?.name === name && Number.isFinite(previous.enteredAt)) return previous;
    return { name, enteredAt: now };
  }

  function animationElapsed(state, simulationTime = 0) {
    const now = Math.max(0, Number(simulationTime) || 0);
    return Math.max(0, now - Math.max(0, Number(state?.enteredAt) || 0));
  }

  function sampleAnimationFrame(animation, elapsed = 0) {
    const frames = animation?.frames?.length ? animation.frames : [0];
    if (frames.length === 1) return frames[0];
    const fps = Math.max(0.001, Number(animation?.fps) || 1);
    const index = Math.floor(Math.max(0, Number(elapsed) || 0) * fps);
    const sampledIndex = animation?.loop === false ? Math.min(frames.length - 1, index) : index % frames.length;
    return frames[sampledIndex];
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
    } else if (!onGround) {
      animation = vy > 120 ? "fall" : `jump_${direction}`;
      artifact = id === "nini" ? "star-dial-follow" : "gui-sword-follow";
    } else if (shouldHoldLandingPose(landingTimer, stride)) {
      animation = `land_${direction}`;
      artifact = "settle";
    } else if (turnTimer > 0) {
      animation = `turn_${direction}`;
      artifact = "turn";
    } else if (stride > 0.18) {
      animation = "run";
    }

    let bob = onGround
      ? stride > 0.18
        ? -Math.abs(gaitWave) * (1.05 + stride * 1.9)
        : Math.sin(clock * 2.1) * 0.45
      : 0;
    let lean = forward * (id === "nini" ? 0.05 : 0.062) + gaitWave * stride * 0.01;
    let scaleX = 1 + stride * 0.018 + gaitPulse * stride * 0.008;
    let scaleY = 1 - stride * 0.01 - gaitPulse * stride * 0.006;
    let lift = id === "nini" ? -1 : 0;

    if (turning > 0) {
      lean += Math.sin(turning * Math.PI) * 0.08;
      scaleX += Math.sin(turning * Math.PI) * 0.03;
      scaleY -= Math.sin(turning * Math.PI) * 0.025;
    }
    if (landing > 0) {
      const settle = Math.sin(landing * Math.PI);
      bob += settle * 3.8;
      scaleX += settle * 0.055;
      scaleY -= settle * 0.065;
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

    return { animation, artifact, direction, bob, lean, scaleX, scaleY, lift, stride, forward, gaitWave };
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

  const api = {
    resolveCharacterMotion,
    resolveSpriteOrientation,
    resolveMotionFacing,
    shouldHoldLandingPose,
    blendMotionPose,
    emptyMotionPose,
    advanceAnimationState,
    animationElapsed,
    sampleAnimationFrame,
  };
  root.NiniYuanCharacterMotion = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
