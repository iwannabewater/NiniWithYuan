((root) => {
  "use strict";

  function createAudioBus(options = {}) {
    let audioCtx = null;
    let bgm = null;
    let bgmSource = "";
    let bgmRequested = false;

    function getVolume() {
      const n = Number(typeof options.getVolume === "function" ? options.getVolume() : 70);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 70;
    }

    function getBgmVolume() {
      const n = Number(typeof options.getBgmVolume === "function" ? options.getBgmVolume() : 60);
      return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 60;
    }

    function ensureContext() {
      const AudioContextCtor = root.AudioContext || root.webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioCtx ||= new AudioContextCtor();
      return audioCtx;
    }

    function bgmGain() {
      return (getVolume() / 100) * (getBgmVolume() / 100) * 0.48;
    }

    function ensureBgm() {
      if (!bgmSource || typeof root.Audio !== "function") return null;
      if (bgm) return bgm;
      bgm = new root.Audio(bgmSource);
      bgm.loop = true;
      bgm.preload = "auto";
      return bgm;
    }

    function syncBgmVolume() {
      if (!bgm) return;
      const volume = Math.max(0, Math.min(1, bgmGain()));
      bgm.volume = volume;
      bgm.muted = volume <= 0;
      if (bgmRequested && !bgm.muted && bgm.paused && root.document?.hidden !== true) {
        bgm.play()?.catch?.(() => {});
      }
      if (bgm.muted && !bgm.paused) bgm.pause();
    }

    function setBgmSource(src) {
      bgmSource = src;
      if (!bgm) return;
      bgm.pause();
      bgm.removeAttribute?.("src");
      bgm.load?.();
      bgm = null;
    }

    function playBgm() {
      bgmRequested = true;
      const audio = ensureBgm();
      if (!audio) return;
      syncBgmVolume();
      if (audio.muted || root.document?.hidden === true) return;
      audio.play()?.catch?.(() => {
        // Mobile browsers may require a later user gesture.
      });
    }

    function pauseBgm() {
      bgmRequested = false;
      if (bgm) bgm.pause();
    }

    function beep(freq, duration) {
      const volume = getVolume();
      if (!volume) return;
      try {
        const ctx = ensureContext();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        osc.type = "triangle";
        gain.gain.value = volume / 1000;
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
      } catch {
        // Audio is optional and may be blocked before a user gesture.
      }
    }

    function suspend() {
      if (audioCtx && audioCtx.state === "running") audioCtx.suspend().catch(() => {});
      if (bgm && !bgm.paused) bgm.pause();
    }

    function resume() {
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
      if (bgmRequested) playBgm();
    }

    function dispose() {
      if (audioCtx) audioCtx.close?.().catch(() => {});
      audioCtx = null;
      pauseBgm();
      bgm = null;
    }

    return { beep, setBgmSource, playBgm, pauseBgm, syncBgmVolume, suspend, resume, dispose };
  }

  const api = { createAudioBus };
  root.NiniYuanAudio = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
