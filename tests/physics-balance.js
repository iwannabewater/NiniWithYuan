const fs = require("node:fs");

const source = fs.readFileSync("src/game.js", "utf8");

function extractCharacterBlock(id) {
  const match = source.match(new RegExp(`${id}: \\{([\\s\\S]*?)\\n    \\}`, "m"));
  if (!match) throw new Error(`Missing character block: ${id}`);
  return match[1];
}

function stat(block, name) {
  const match = block.match(new RegExp(`${name}:\\s*([0-9.]+)`));
  if (!match) throw new Error(`Missing ${name}`);
  return Number(match[1]);
}

const tile = 48;
const requiredFourTileRise = tile * 4 + 4;
const characters = ["nini", "yuan"].map((id) => {
  const block = extractCharacterBlock(id);
  const jump = stat(block, "jump");
  const gravity = stat(block, "gravity");
  return { id, jump, gravity, apex: (jump * jump) / (2 * gravity) };
});

for (const character of characters) {
  if (character.apex < requiredFourTileRise) {
    throw new Error(
      `${character.id} jump apex ${character.apex.toFixed(1)}px is below the ${requiredFourTileRise}px minimum needed for four-tile platform gaps`
    );
  }
}

const nini = characters.find((character) => character.id === "nini");
const yuan = characters.find((character) => character.id === "yuan");
if (nini.apex <= yuan.apex) {
  throw new Error("Nini should keep a higher vertical jump than Yuan because her role is precision platforming");
}

console.log(
  `physics-balance: ${characters.map((character) => `${character.id} ${character.apex.toFixed(1)}px`).join(", ")}`
);
