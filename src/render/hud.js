((root) => {
  "use strict";

  function clear(el) {
    if (typeof el.replaceChildren === "function") el.replaceChildren();
    else el.textContent = "";
  }

  function appendText(parent, tagName, text, className) {
    const el = document.createElement(tagName);
    if (className) el.className = className;
    el.textContent = text;
    parent.appendChild(el);
    return el;
  }

  function renderSaveStrip(container, save, characters, levels) {
    clear(container);
    const selected = characters[save.selected] || characters.nini;
    const items = [
      ["已解锁章节", `${Math.min(save.unlocked, levels.length)} / ${levels.length}`],
      ["当前角色", selected.name],
      ["累计星露", String(save.totalCoins)],
    ];
    for (const [label, value] of items) {
      const chip = document.createElement("div");
      chip.className = "save-chip";
      chip.append(document.createTextNode(label));
      chip.append(document.createElement("br"));
      appendText(chip, "strong", value);
      container.appendChild(chip);
    }
  }

  function renderChapterIntroMeta(container, items) {
    clear(container);
    for (const item of items) appendText(container, "span", item);
  }

  function renderLevelList(container, options) {
    clear(container);
    const { levels, save, startLevel, formatTime } = options;
    const featuredIndex = Math.max(0, Math.min(levels.length - 1, save.unlocked - 1));
    levels.forEach((level, i) => {
      const locked = i >= save.unlocked;
      const button = document.createElement("button");
      button.className = `level-item${i === featuredIndex ? " featured" : ""}${locked ? " locked" : ""}`;
      button.disabled = locked;
      button.style.setProperty("--level-banner", levelBanner(level.palette));

      const intro = document.createElement("span");
      intro.className = "level-copy";
      appendText(intro, "strong", level.name);
      appendText(intro, "span", level.vibe, "level-vibe");
      appendText(intro, "span", level.hint, "level-hint");

      const stars = save.levelStars[level.id] || 0;
      const best = save.bestTimes[level.id] ? formatTime(save.bestTimes[level.id]) : "--:--";
      appendText(button, "span", `${"★".repeat(stars)}${"☆".repeat(3 - stars)} · 最佳 ${best}`, "level-meta");

      button.insertBefore(intro, button.firstChild);
      button.addEventListener("click", () => startLevel(i));
      container.appendChild(button);
    });
  }

  function levelBanner(palette) {
    const [top, mid, accent, glow] = palette;
    return [
      `radial-gradient(circle at 72% 18%, ${glow}66 0 12%, transparent 13%)`,
      `linear-gradient(135deg, ${top}, ${mid} 54%, ${accent}99)`,
    ].join(", ");
  }

  const api = { renderSaveStrip, renderChapterIntroMeta, renderLevelList };
  root.NiniYuanHud = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
