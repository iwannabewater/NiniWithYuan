((root) => {
  "use strict";

  // Each protagonist's instrument identity: the HUD sigil, the artifact name,
  // and the accent palette shared by character-facing UI.

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

  function resolveCharacterInstrument(id) {
    return CHARACTERS[id] || CHARACTERS.nini;
  }

  const api = {
    resolveCharacterInstrument,
  };
  root.NiniYuanCharacterGilding = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
