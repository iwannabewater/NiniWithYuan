((root) => {
  "use strict";

  const CUE_TABLE = {
    jump: { wave: "triangle", freq: [480, 560], attack: 6, release: 80, gain: 0.82 },
    dash: { wave: "square", freq: [280, 160], attack: 4, release: 140, gain: 0.68, lowpass: 1200 },
    skill_ready: { wave: "sine", freq: [640, 820], attack: 10, release: 140, gain: 0.48 },
    shoot_nini: { wave: "triangle", freq: [860, 920], attack: 4, release: 50, gain: 0.54 },
    shoot_yuan: { wave: "square", freq: [520, 440], attack: 4, release: 60, gain: 0.5, lowpass: 2200 },
    stomp: { wave: "square", freq: [680, 360], attack: 2, release: 80, gain: 0.64, lowpass: 1400 },
    hit_take: { wave: "triangle", freq: [180, 140], attack: 2, release: 160, gain: 0.68 },
    hit_super: { wave: "sine", freq: [920, 660], attack: 6, release: 140, gain: 0.52 },
    pickup_coin: { wave: "triangle", freq: [720, 860], attack: 4, release: 55, gain: 0.42 },
    pickup_gem: { wave: "sine", freq: [920, 1280], attack: 6, release: 90, gain: 0.48, osc2: { detune: 1200, mix: 0.35 } },
    pickup_powerup: { wave: "triangle", freq: [640, 980], attack: 8, release: 180, gain: 0.58 },
    spring: { wave: "sine", freq: [520, 820], attack: 6, release: 90, gain: 0.52 },
    portal: { wave: "sine", freq: [520, 720], attack: 8, release: 140, gain: 0.5, osc2: { detune: 700, mix: 0.4 } },
    break_crystal: { wave: "square", freq: [300, 220], attack: 2, release: 90, gain: 0.56, lowpass: 1800 },
    complete: { wave: "triangle", freq: [820, 1240], attack: 10, release: 240, gain: 0.66 },
    fail: { wave: "sine", freq: [220, 160], attack: 8, release: 280, gain: 0.58 },
  };

  function createAudioBus(options = {}) {
    let audioCtx = null;
    let bgm = null;
    let bgmSource = "";
    let bgmRequested = false;
    let retryArmed = false;
    let retryHandler = null;

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

    function syncBgmVolume(options = {}) {
      if (!bgm) return;
      const retryPlayback = options.retryPlayback !== false;
      const volume = Math.max(0, Math.min(1, bgmGain()));
      bgm.volume = volume;
      bgm.muted = volume <= 0;
      if (retryPlayback && bgmRequested && !bgm.muted && bgm.paused && root.document?.hidden !== true) {
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
      if (!audio) return Promise.resolve(false);
      syncBgmVolume({ retryPlayback: false });
      if (audio.muted || root.document?.hidden === true) return Promise.resolve(false);
      try {
        const attempt = audio.play?.();
        if (attempt?.then) return attempt.then(() => true).catch(() => false);
        return Promise.resolve(true);
      } catch {
        return Promise.resolve(false);
      }
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

    function scheduleFrequency(osc, freq, now, end) {
      if (Array.isArray(freq)) {
        osc.frequency.setValueAtTime?.(freq[0], now);
        osc.frequency.exponentialRampToValueAtTime?.(Math.max(1, freq[1]), end);
        if (!osc.frequency.setValueAtTime) osc.frequency.value = freq[0];
      } else {
        osc.frequency.value = freq;
      }
    }

    function connectVoice(ctx, spec, destination, now, end, gainScale = 1) {
      const osc = ctx.createOscillator();
      osc.type = spec.wave;
      scheduleFrequency(osc, spec.freq, now, end);
      if (spec.osc2 && gainScale !== 1) osc.detune.value = spec.osc2.detune || 0;
      if (gainScale !== 1) {
        const mix = ctx.createGain();
        mix.gain.value = gainScale;
        osc.connect(mix).connect(destination);
      } else {
        osc.connect(destination);
      }
      osc.start(now);
      osc.stop(end + 0.02);
    }

    function cue(name) {
      const volume = getVolume();
      const spec = CUE_TABLE[name];
      if (!volume || !spec) return;
      try {
        const ctx = ensureContext();
        if (!ctx) return;
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        const now = ctx.currentTime;
        const end = now + (spec.attack + spec.release) / 1000;
        const output = ctx.createGain();
        output.gain.setValueAtTime?.(0.0001, now);
        output.gain.linearRampToValueAtTime?.((volume / 1000) * spec.gain, now + spec.attack / 1000);
        output.gain.exponentialRampToValueAtTime?.(0.0001, end);
        if (!output.gain.setValueAtTime) output.gain.value = (volume / 1000) * spec.gain;
        output.connect(ctx.destination);
        let destination = output;
        if (spec.lowpass) {
          const filter = ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.value = spec.lowpass;
          filter.connect(output);
          destination = filter;
        }
        connectVoice(ctx, spec, destination, now, end);
        if (spec.osc2) connectVoice(ctx, spec, destination, now, end, spec.osc2.mix);
      } catch {
        // SFX are optional and may be blocked before a user gesture.
      }
    }

    function removeAutoplayRetry() {
      if (!retryHandler) return;
      root.removeEventListener?.("pointerdown", retryHandler);
      root.removeEventListener?.("keydown", retryHandler);
      retryHandler = null;
      retryArmed = false;
    }

    function armAutoplayRetry() {
      if (retryArmed || typeof root.addEventListener !== "function") return;
      retryArmed = true;
      retryHandler = () => {
        if (!bgmRequested) return;
        if (root.document?.hidden === true || bgmGain() <= 0 || !bgm?.paused) return;
        playBgm().then((played) => {
          if (played && !bgm?.paused) removeAutoplayRetry();
        });
      };
      root.addEventListener("pointerdown", retryHandler, { passive: true });
      root.addEventListener("keydown", retryHandler, { passive: true });
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
      removeAutoplayRetry();
      if (audioCtx) audioCtx.close?.().catch(() => {});
      audioCtx = null;
      pauseBgm();
      bgm = null;
    }

    return { beep, cue, armAutoplayRetry, setBgmSource, playBgm, pauseBgm, syncBgmVolume, suspend, resume, dispose };
  }

  const api = { createAudioBus, CUE_TABLE };
  root.NiniYuanAudio = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
