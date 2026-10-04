((root) => {
  "use strict";

  // Presentation camera.
  //
  // The camera normalizes framing across devices: a phone in landscape and a
  // 1440p monitor both see roughly the same slice of the chapter, scaled to
  // fit, instead of one seeing eight tiles of height and the other thirty.
  // Simulation never reads any of this; it is camera framing and rendering
  // only, which the project rules allow to read the viewport.
  //
  // Vertical follow uses a platform anchor: while grounded the anchor tracks
  // the feet, and an ordinary jump inside the dead zone does not drag the view.
  // Leaving the zone (springs, long falls, tall climbs) follows immediately.

  const DESIGN_HEIGHT_TALL = 640;
  const DESIGN_HEIGHT_SHORT = 560;
  const DESIGN_WIDTH_MIN = 720;
  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 3;
  const FEET_SCREEN_RATIO = 0.68;
  const RISE_DEAD_ZONE = 0.36;
  const FALL_DEAD_ZONE = 0.04;
  const LEAD_RATIO = 0.42;
  const FOLLOW_X = 0.001;
  const FOLLOW_Y = 0.006;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * CSS pixels per world pixel. Short landscape screens frame a little closer
   * so the protagonists stay legible on a phone.
   */
  function resolveZoom(view) {
    const w = Math.max(1, Number(view?.w) || 1);
    const h = Math.max(1, Number(view?.h) || 1);
    const designHeight = lerp(DESIGN_HEIGHT_SHORT, DESIGN_HEIGHT_TALL, clamp((h - 360) / 360, 0, 1));
    const byHeight = h / designHeight;
    const byWidth = w / DESIGN_WIDTH_MIN;
    return clamp(Math.min(byHeight, byWidth), MIN_ZOOM, MAX_ZOOM);
  }

  function create() {
    return {
      x: 0,
      y: 0,
      zoom: 1,
      visibleW: 1280,
      visibleH: 720,
      shake: 0,
      lookX: 0,
      lookY: 0,
      anchorY: 0,
    };
  }

  function configure(camera, view) {
    camera.zoom = resolveZoom(view);
    camera.visibleW = view.w / camera.zoom;
    camera.visibleH = view.h / camera.zoom;
    return camera;
  }

  function resetAnchor(camera, player) {
    if (player) camera.anchorY = player.y + player.h;
  }

  function updateAnchor(camera, player) {
    const feetY = player.y + player.h;
    if (player.onGround) {
      camera.anchorY = feetY;
      return;
    }
    const riseLimit = camera.anchorY - camera.visibleH * RISE_DEAD_ZONE;
    const fallLimit = camera.anchorY + camera.visibleH * FALL_DEAD_ZONE;
    if (feetY < riseLimit) camera.anchorY = feetY + camera.visibleH * RISE_DEAD_ZONE;
    else if (feetY > fallLimit) camera.anchorY = feetY - camera.visibleH * FALL_DEAD_ZONE;
  }

  function clampToLevel(value, visible, extent) {
    if (extent <= visible) return (extent - visible) / 2;
    return clamp(value, 0, extent - visible);
  }

  /** The framing the camera eases toward this step. `lookahead` is in world pixels. */
  function target(camera, player, level, lookahead) {
    const leadX = lookahead?.x || 0;
    const leadY = lookahead?.y || 0;
    return {
      x: clampToLevel(player.x + player.w / 2 + leadX - camera.visibleW * LEAD_RATIO, camera.visibleW, level.width),
      y: clampToLevel(camera.anchorY + leadY - camera.visibleH * FEET_SCREEN_RATIO, camera.visibleH, level.height),
    };
  }

  /** Advance one fixed step. `snap` places the camera on its target immediately. */
  function step(camera, player, level, dt, options = {}) {
    updateAnchor(camera, player);
    const goal = target(camera, player, level, options.lookahead);
    if (options.snap) {
      camera.x = goal.x;
      camera.y = goal.y;
    } else {
      camera.x = lerp(camera.x, goal.x, 1 - Math.pow(FOLLOW_X, dt));
      camera.y = lerp(camera.y, goal.y, 1 - Math.pow(FOLLOW_Y, dt));
    }
    camera.shake = Math.max(0, camera.shake - 35 * dt);
    return camera;
  }

  /** Place the camera on the player before the first rendered step. */
  function frameImmediately(camera, player, level) {
    resetAnchor(camera, player);
    const goal = target(camera, player, level, null);
    camera.x = goal.x;
    camera.y = goal.y;
    return camera;
  }

  /**
   * Device pixels per world pixel, and the world-space quantum that lands a
   * coordinate on the physical pixel grid.
   */
  function renderScale(camera, dpr) {
    const scale = camera.zoom * Math.max(1, Number(dpr) || 1);
    return { scale, quantum: 1 / scale };
  }

  /** The world rectangle on screen, padded by `margin` world pixels for culling. */
  function visibleRect(camX, camY, camera, margin = 0, out = {}) {
    out.x = camX - margin;
    out.y = camY - margin;
    out.w = camera.visibleW + margin * 2;
    out.h = camera.visibleH + margin * 2;
    return out;
  }

  function intersects(rect, x, y, w, h) {
    return x < rect.x + rect.w && x + w > rect.x && y < rect.y + rect.h && y + h > rect.y;
  }

  const api = {
    DESIGN_HEIGHT_TALL,
    DESIGN_HEIGHT_SHORT,
    MIN_ZOOM,
    MAX_ZOOM,
    FEET_SCREEN_RATIO,
    RISE_DEAD_ZONE,
    resolveZoom,
    create,
    configure,
    resetAnchor,
    target,
    step,
    frameImmediately,
    renderScale,
    visibleRect,
    intersects,
  };

  root.NiniYuanCamera = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
