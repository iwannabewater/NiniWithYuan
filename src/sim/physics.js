((root) => {
  "use strict";

  // Collision primitives and movement response for the fixed-step simulation.
  //
  // Everything here is pure and allocation-free on the hot path: overlap tests
  // read entity fields directly instead of building throwaway rect objects, so
  // a 120 Hz step does not feed the garbage collector.

  const PLAYER_W = 34;
  const PLAYER_H = 56;
  const BIG_PLAYER_W = 43;
  const BIG_PLAYER_H = 72;
  const BODY_INSET_X = 3;
  const BODY_INSET_TOP = 3;
  const PICKUP_REACH_X = 10;
  const PICKUP_REACH_TOP = 46;
  const PICKUP_REACH_BOTTOM = 16;
  const MOVE_SUBSTEP = 14;
  const COYOTE_TIME = 0.12;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function moveToward(value, target, amount) {
    if (value < target) return Math.min(target, value + amount);
    if (value > target) return Math.max(target, value - amount);
    return value;
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /** The combat and platform body: the sprite box inset on both sides and the top. */
  function bodyRect(entity, out = {}) {
    out.x = entity.x + BODY_INSET_X;
    out.y = entity.y + BODY_INSET_TOP;
    out.w = entity.w - BODY_INSET_X * 2;
    out.h = entity.h - BODY_INSET_TOP;
    return out;
  }

  /** `rectsOverlap(bodyRect(entity), rect)` without the intermediate object. */
  function bodyOverlaps(entity, rect) {
    const x = entity.x + BODY_INSET_X;
    const y = entity.y + BODY_INSET_TOP;
    return x < rect.x + rect.w
      && x + entity.w - BODY_INSET_X * 2 > rect.x
      && y < rect.y + rect.h
      && y + entity.h - BODY_INSET_TOP > rect.y;
  }

  /**
   * Pickup reach is deliberately more generous than the body, so a standing
   * player collects food at head height without a jump.
   */
  function pickupRect(entity, out = {}) {
    out.x = entity.x - PICKUP_REACH_X;
    out.y = entity.y - PICKUP_REACH_TOP;
    out.w = entity.w + PICKUP_REACH_X * 2;
    out.h = entity.h + PICKUP_REACH_TOP + PICKUP_REACH_BOTTOM;
    return out;
  }

  function pickupOverlaps(entity, rect) {
    const x = entity.x - PICKUP_REACH_X;
    const y = entity.y - PICKUP_REACH_TOP;
    return x < rect.x + rect.w
      && x + entity.w + PICKUP_REACH_X * 2 > rect.x
      && y < rect.y + rect.h
      && y + entity.h + PICKUP_REACH_TOP + PICKUP_REACH_BOTTOM > rect.y;
  }

  /** The 4 px probe under the feet that decides whether the body is supported. */
  function footOverlaps(entity, rect) {
    const x = entity.x + 5;
    const y = entity.y + entity.h + 2;
    return x < rect.x + rect.w && x + entity.w - 10 > rect.x && y < rect.y + rect.h && y + 4 > rect.y;
  }

  /**
   * Horizontal velocity response. Turning and reversal accelerate harder than a
   * launch so a full-speed reversal completes inside the 190 ms contract, and a
   * neutral grounded stop finishes inside 120 ms.
   */
  function horizontalVelocity(current, target, options = {}, dt = 0) {
    const velocity = Number(current) || 0;
    const desired = Number(target) || 0;
    const intent = clamp(Number(options.intent) || 0, -1, 1);
    const grounded = options.grounded === true;
    const turning = options.turning === true;
    const baseAcceleration = Math.max(0, Number(options.baseAcceleration) || 0);
    const reversing = intent !== 0 && velocity * intent < 0;
    let responseMultiplier = 1;
    if (turning) responseMultiplier = grounded ? 2 : 1.45;
    else if (reversing) responseMultiplier = grounded ? 1.7 : 1.35;
    else if (intent === 0 && desired === 0 && grounded) responseMultiplier = 1.7;
    return moveToward(velocity, desired, baseAcceleration * responseMultiplier * Math.max(0, Number(dt) || 0));
  }

  /**
   * Move a body along one axis against a list of solids. Large moves are split
   * into substeps no longer than 14 px so a fast body cannot tunnel through a
   * one-tile platform. Mutates `body` and returns the platform that grounded it.
   */
  function moveAxis(body, axis, amount, solids, bounds, onGrounded) {
    const steps = Math.max(1, Math.ceil(Math.abs(amount) / MOVE_SUBSTEP));
    const step = amount / steps;
    let grounded = null;
    for (let i = 0; i < steps; i += 1) {
      const result = moveAxisStep(body, axis, step, solids, bounds, onGrounded);
      if (result) grounded = result;
    }
    return grounded;
  }

  function moveAxisStep(body, axis, amount, solids, bounds, onGrounded) {
    body[axis] += amount;
    let groundedByPlatform = null;
    for (let index = 0; index < solids.length; index += 1) {
      const p = solids[index];
      if (!bodyOverlaps(body, p)) continue;
      if (axis === "x") {
        if (amount > 0) body.x = p.x - body.w + BODY_INSET_X;
        if (amount < 0) body.x = p.x + p.w - BODY_INSET_X;
        body.vx = 0;
      } else {
        if (amount > 0) {
          body.y = p.y - body.h;
          body.vy = 0;
          body.onGround = true;
          body.coyote = COYOTE_TIME;
          if (typeof onGrounded === "function") onGrounded(body, p);
          groundedByPlatform = p;
        }
        if (amount < 0) {
          body.y = p.y + p.h - BODY_INSET_TOP;
          body.vy = Math.max(0, body.vy);
        }
      }
    }
    if (axis === "y" && amount >= 0 && !groundedByPlatform) {
      body.onGround = isSupported(body, solids);
    }
    if (groundedByPlatform && "dx" in groundedByPlatform) {
      body.x += groundedByPlatform.dx;
      body.y += groundedByPlatform.dy;
    }
    body.x = clamp(body.x, 0, bounds.width - body.w);
    return groundedByPlatform;
  }

  function isSupported(body, solids) {
    for (let index = 0; index < solids.length; index += 1) {
      if (footOverlaps(body, solids[index])) return true;
    }
    return false;
  }

  function overlapsAnySolid(body, solids) {
    for (let index = 0; index < solids.length; index += 1) {
      if (bodyOverlaps(body, solids[index])) return true;
    }
    return false;
  }

  const api = {
    PLAYER_W,
    PLAYER_H,
    BIG_PLAYER_W,
    BIG_PLAYER_H,
    PICKUP_REACH_X,
    PICKUP_REACH_TOP,
    PICKUP_REACH_BOTTOM,
    MOVE_SUBSTEP,
    COYOTE_TIME,
    clamp,
    lerp,
    moveToward,
    rectsOverlap,
    bodyRect,
    bodyOverlaps,
    pickupRect,
    pickupOverlaps,
    footOverlaps,
    horizontalVelocity,
    moveAxis,
    isSupported,
    overlapsAnySolid,
  };

  root.NiniYuanPhysics = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
