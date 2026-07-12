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
    const unlocked = Math.min(save.unlocked, levels.length);
    const current = levels[Math.max(0, unlocked - 1)];
    const progress = levels.length ? Math.round((unlocked / levels.length) * 100) : 0;
    const currentBlock = document.createElement("div");
    currentBlock.className = "journey-current";
    appendText(currentBlock, "span", "当前星路", "journey-kicker");
    appendText(currentBlock, "strong", current?.name || "第一章", "journey-title");

    const route = document.createElement("div");
    route.className = "journey-route";
    route.setAttribute("role", "progressbar");
    route.setAttribute("aria-label", "章节解锁进度");
    route.setAttribute("aria-valuemin", "0");
    route.setAttribute("aria-valuemax", String(levels.length));
    route.setAttribute("aria-valuenow", String(unlocked));
    const routeFill = document.createElement("span");
    routeFill.style.setProperty("--journey-progress", `${progress}%`);
    route.appendChild(routeFill);

    const stats = document.createElement("div");
    stats.className = "journey-stats";
    for (const [label, value] of [
      ["章节", `${unlocked} / ${levels.length}`],
      ["同行", selected.name],
      ["星露", String(save.totalCoins)],
    ]) {
      const stat = document.createElement("span");
      appendText(stat, "small", label);
      appendText(stat, "strong", value);
      stats.appendChild(stat);
    }
    container.append(currentBlock, route, stats);
  }

  function renderChapterIntroMeta(container, items) {
    clear(container);
    for (const item of items) appendText(container, "span", item);
  }

  function renderLevelList(container, options) {
    clear(container);
    const { levels, save, startLevel, formatTime } = options;
    const featuredIndex = Math.max(0, Math.min(levels.length - 1, save.unlocked - 1));
    let lastWorldId = "";
    let worldTrack = null;
    levels.forEach((level, i) => {
      const world = typeof level.world === "object" && level.world ? level.world : { id: "world1", name: "第一星域 破碎星图", subtitle: "" };
      if (world.id !== lastWorldId) {
        lastWorldId = world.id;
        const group = document.createElement("section");
        group.className = "level-world-group";
        group.dataset.world = world.id;
        const heading = document.createElement("header");
        heading.className = "level-world";
        heading.dataset.world = world.id;
        const headingId = `level-world-${world.id}`;
        const worldName = appendText(heading, "h3", world.name, "level-world-name");
        worldName.id = headingId;
        if (world.subtitle) appendText(heading, "strong", world.subtitle, "level-world-subtitle");
        worldTrack = document.createElement("div");
        worldTrack.className = "level-world-track";
        group.setAttribute("aria-labelledby", headingId);
        group.append(heading, worldTrack);
        container.appendChild(group);
      }
      const locked = i >= save.unlocked;
      const button = document.createElement("button");
      button.className = `level-item${i === featuredIndex ? " featured" : ""}${locked ? " locked" : ""}`;
      button.disabled = locked;
      button.dataset.world = world.id;
      button.style.setProperty("--level-banner", levelBanner(level.palette));

      const intro = document.createElement("span");
      intro.className = "level-copy";
      appendText(intro, "span", String(i + 1).padStart(2, "0"), "level-index");
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
      const state = document.createElement("span");
      state.className = "level-state";
      state.textContent = locked ? "锁定 · 完成上一章后解锁" : i === featuredIndex ? "当前星路" : stars > 0 ? `已录 · ${stars} 星` : "可挑战";
      if (locked) button.setAttribute("aria-label", `${level.name}，锁定，完成上一章后解锁`);
      if (i === featuredIndex && !locked) button.setAttribute("aria-current", "step");
      button.appendChild(meta);
      button.appendChild(state);

      button.insertBefore(intro, button.firstChild);
      button.addEventListener("click", () => startLevel(i));
      worldTrack?.appendChild(button);
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
