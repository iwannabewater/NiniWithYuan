((root) => {
  "use strict";

  // Playable character definitions. Movement values are gameplay contracts:
  // jump apex, launch time, reversal time, and dash distance are all guarded by
  // tests, so presentation must never read or write these records.

  const CHARACTERS = Object.freeze({
    nini: Object.freeze({
      id: "nini",
      name: "妮妮",
      subtitle: "璇玑星旅",
      speed: 445,
      accel: 3450,
      jump: 1040,
      gravity: 2250,
      maxFall: 1360,
      skillName: "璇玑星渡",
      projectileName: "星露弹",
      projectileSpeed: 760,
      projectileDamage: 1,
      projectilePierce: 0,
      airJumps: 1,
      skillCooldown: 0.7,
    }),
    yuan: Object.freeze({
      id: "yuan",
      name: "源源",
      subtitle: "青衡剑心",
      speed: 485,
      accel: 3720,
      jump: 980,
      gravity: 2300,
      maxFall: 1460,
      skillName: "青衡破风",
      projectileName: "青岚弹",
      projectileSpeed: 640,
      projectileDamage: 2,
      projectilePierce: 1,
      airJumps: 0,
      skillCooldown: 0.95,
    }),
  });

  const CHARACTER_IDS = Object.freeze(Object.keys(CHARACTERS));

  function characterById(id) {
    return CHARACTERS[id] || CHARACTERS.nini;
  }

  /** Peak height of a grounded jump, in world pixels. */
  function jumpApex(character) {
    return (character.jump * character.jump) / (2 * character.gravity);
  }

  const api = { CHARACTERS, CHARACTER_IDS, characterById, jumpApex };

  root.NiniYuanCharacters = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
