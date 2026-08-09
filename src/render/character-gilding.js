((root) => {
  "use strict";

  const CHARACTERS = Object.freeze({
    nini: Object.freeze({
      mark: "璇",
      title: "星轨校正",
      artifact: "璇玑星盘",
      accent: "#b87b86",
      accentDeep: "#6f3d4b",
      gold: "#c3a468",
      silk: "#32253c",
    }),
    yuan: Object.freeze({
      mark: "青",
      title: "风衡引路",
      artifact: "青玉圭剑",
      accent: "#6da895",
      accentDeep: "#2b4f45",
      gold: "#c3a468",
      silk: "#20323d",
    }),
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function resolveCharacterInstrument(id) {
    return CHARACTERS[id] || CHARACTERS.nini;
  }

  function resolveCharacterRhythm(input = {}, options = {}) {
    const id = input.id;
    const time = Math.max(0, Number(input.time) || 0);
    const stride = clamp(input.stride, 0, 1.35);
    const reducedMotion = options.reducedMotion === true;
    const off = id === "yuan" ? Math.PI * 0.42 : 0;
    const breath = reducedMotion ? 0 : Math.sin(time * 2.05 + off) * 0.55;
    const cloth = reducedMotion ? 0 : Math.sin(time * 1.7 + off * 0.6) * 0.5 + 0.5;
    const focusPulse = reducedMotion ? 0 : Math.sin(time * 5.3 + off) * 0.18;
    const draft = reducedMotion ? 0 : Math.max(0, stride - 0.24) * (id === "yuan" ? 0.9 : 0.7);
    return {
      breath,
      cloth,
      focusPulse,
      draft,
    };
  }

  function radialX(direction, width, phase) {
    return direction * width * phase;
  }

  function radialY(start, end, rhythm) {
    return start + (end - start) * (0.5 + rhythm.breath * 0.4);
  }

  /**
   * Presentation-only gilding around the sprite bitmap. It never reads
   * gameplay entities, viewport size, or device pixel ratio.
   */
  function drawCharacterVignette(ctx, options = {}) {
    const id = options.id;
    const character = resolveCharacterInstrument(id);
    const width = Math.max(1, Number(options.width) || 1);
    const height = Math.max(1, Number(options.height) || 1);
    const time = Math.max(0, Number(options.time) || 0);
    const direction = options.direction < 0 ? -1 : 1;
    const reducedMotion = options.reducedMotion === true;
    const rhythm = options.rhythm || resolveCharacterRhythm({ id, time, stride: options.stride }, { reducedMotion });
    const px = Math.max(1, Number(options.px) || 1);
    ctx.save();
    ctx.lineCap = "round";
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;

    const backX = direction * width * 0.34;
    const shoulderY = -height * 0.72;
    const hipY = -height * 0.28;
    const clothSway = rhythm.cloth * 2.2 * px;
    const openArc = 0.10 + rhythm.focusPulse * 0.12;
    ctx.globalAlpha = openArc;
    ctx.strokeStyle = character.gold;
    ctx.lineWidth = Math.max(1, 1.1 * px);
    ctx.beginPath();
    ctx.moveTo(-width * 0.44, -height * 0.93 + clothSway * 0.2);
    ctx.quadraticCurveTo(0, -height * 1.05 + rhythm.breath * 1.8 * px, width * 0.44, -height * 0.93 + clothSway * 0.2);
    ctx.stroke();

    ctx.globalAlpha = 0.14 + rhythm.breath * 0.08;
    ctx.strokeStyle = character.accent;
    ctx.lineWidth = Math.max(1, 1.2 * px);
    ctx.beginPath();
    ctx.moveTo(backX * 0.5, radialY(-height, -height * 0.92, rhythm));
    ctx.quadraticCurveTo(radialX(direction, width, 0.42), -height * 0.58, backX, -height * 0.16 - clothSway);
    ctx.stroke();

    ctx.globalAlpha = 0.16 + rhythm.cloth * 0.12;
    ctx.strokeStyle = character.accentDeep;
    ctx.lineWidth = Math.max(1, 1.4 * px);
    ctx.beginPath();
    ctx.moveTo(-width * 0.26, radialY(-height, -height * 0.8, rhythm));
    ctx.quadraticCurveTo(width * 0.02, -height * 0.57 + rhythm.breath * 1.8 * px, width * 0.20, hipY - clothSway * 0.7);
    ctx.stroke();

    if (!reducedMotion && rhythm.draft > 0.001) {
      ctx.globalAlpha = 0.08 + rhythm.draft * 0.1;
      ctx.strokeStyle = character.accent;
      ctx.lineWidth = Math.max(1, px);
      for (let line = 0; line < 3; line += 1) {
        const y = -height * (0.12 + line * 0.16);
        const length = width * (0.18 + rhythm.draft * 0.1 + line * 0.04);
        ctx.beginPath();
        ctx.moveTo(-width * 0.18 * direction, y);
        ctx.quadraticCurveTo(-length * 0.55, y + line * 1.6, -length * direction, y + line * 2.4);
        ctx.stroke();
      }
    } else if (reducedMotion && rhythm.cloth > 0.3) {
      ctx.globalAlpha = 0.10;
      ctx.strokeStyle = character.gold;
      ctx.beginPath();
      ctx.moveTo(-width * 0.22, -height * 0.48);
      ctx.lineTo(width * 0.22, -height * 0.42);
      ctx.stroke();
    }

    ctx.restore();
  }

  const api = {
    resolveCharacterInstrument,
    resolveCharacterRhythm,
    drawCharacterVignette,
  };
  root.NiniYuanCharacterGilding = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
