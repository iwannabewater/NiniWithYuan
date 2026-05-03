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
      const meta = document.createElement("span");
      meta.className = "level-meta";
      const starGroup = document.createElement("span");
      starGroup.className = "level-stars";
      starGroup.setAttribute("aria-label", `星级 ${stars} / 3`);
      for (let s = 0; s < 3; s += 1) {
        const star = document.createElement("span");
        star.className = `star ${s < stars ? "filled" : "empty"}`;
        star.textContent = s < stars ? "★" : "☆";
        starGroup.appendChild(star);
      }
      meta.appendChild(starGroup);
      const sep = document.createElement("span");
      sep.className = "level-sep";
      sep.textContent = "·";
      meta.appendChild(sep);
      const bestGroup = document.createElement("span");
      bestGroup.className = "level-best";
      const bestLabel = document.createElement("span");
      bestLabel.className = "level-best-label";
      bestLabel.textContent = "最佳";
      const bestValue = document.createElement("strong");
      bestValue.className = "level-best-value";
      bestValue.textContent = best;
      bestGroup.appendChild(bestLabel);
      bestGroup.appendChild(bestValue);
      meta.appendChild(bestGroup);
      button.appendChild(meta);

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

  function pulseHudPill(el) {
    if (!el) return;
    el.classList.remove("pulse");
    // Force reflow so the keyframe restarts cleanly when called twice in quick succession.
    void el.offsetWidth;
    el.classList.add("pulse");
    el.addEventListener(
      "animationend",
      () => el.classList.remove("pulse"),
      { once: true }
    );
  }

  const api = { renderSaveStrip, renderChapterIntroMeta, renderLevelList, pulseHudPill };
  root.NiniYuanHud = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
