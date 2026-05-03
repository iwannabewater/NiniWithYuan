((root) => {
  "use strict";

  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","KeyN","KeyY"];
  const KONAMI_SHORT = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","KeyN","KeyY"];
  const NUMBER_CODE = ["Digit5","Digit2","Digit0"];
  const HEART_PATH = "M256 432 L96 272 C32 208 64 112 152 112 C200 112 232 144 256 184 C280 144 312 112 360 112 C448 112 480 208 416 272 Z";
  const QUOTE_LINES = [
    "愿每一次跳跃，都落在你想去的星上。",
    "如果星图里的每颗星都是我想你的瞬间…",
    "源源在风里说，妮妮永远不会一个人闯。",
    "把这一夜的极光，都做成你的回家路。",
    "走完五大章节，就来听我说一句小秘密。",
    "你跳得高，我接你；你掉下来，我也接你。",
    "妮妮，你笑的样子比星露还甜。"
  ];
  const SECRET_LINES = [
    {
      eyebrow: "Yuan to Nini",
      body: "妮妮，把你想去的那颗星指给我看，<br/>这一整张星图都给你重新点亮。",
      sign: "—— 源源 · 写在第 520 颗星里"
    },
    {
      eyebrow: "Y · N",
      body: "如果有一天极光不亮了，<br/>我就把它揉成你最爱的星露糖。",
      sign: "—— 源源"
    },
    {
      eyebrow: "Hidden Atlas",
      body: "我们一共要走五个章节，<br/>但每一个都叫——和你在一起。",
      sign: "—— 源源 · 妮妮的护卫"
    },
    {
      eyebrow: "Constellation Found",
      body: "你把六颗星都点亮了。<br/>原来这一整片夜空，本来就写着你的名字。",
      sign: "—— 源源 · 收藏在星图最深处"
    }
  ];

  const HUNT_WINDOW_MS = 8000;

  function once(fn) {
    let called = false;
    return (...args) => {
      if (called) return;
      called = true;
      return fn(...args);
    };
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function buildLetter() {
    const root = document.createElement("div");
    root.className = "love-letter";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", "隐藏信件");
    const card = document.createElement("div");
    card.className = "love-letter-card";
    const eyebrow = document.createElement("span");
    eyebrow.className = "love-letter-eyebrow";
    const body = document.createElement("p");
    body.className = "love-letter-body";
    const sign = document.createElement("span");
    sign.className = "love-letter-sign";
    const close = document.createElement("button");
    close.className = "love-letter-close";
    close.type = "button";
    close.textContent = "心意收到";
    card.appendChild(eyebrow);
    card.appendChild(body);
    card.appendChild(sign);
    card.appendChild(close);
    root.appendChild(card);
    document.body.appendChild(root);
    const dismiss = () => {
      root.classList.remove("show");
      window.setTimeout(() => root.remove(), 320);
      document.removeEventListener("keydown", onKey);
    };
    function onKey(event) {
      if (event.key === "Escape") dismiss();
    }
    close.addEventListener("click", dismiss);
    root.addEventListener("click", (event) => {
      if (event.target === root) dismiss();
    });
    document.addEventListener("keydown", onKey);
    return {
      show(payload) {
        eyebrow.textContent = payload.eyebrow;
        body.innerHTML = payload.body;
        sign.textContent = payload.sign;
        requestAnimationFrame(() => root.classList.add("show"));
        try { close.focus({ preventScroll: true }); } catch (_) {}
      },
      dismiss
    };
  }

  function buildHeart() {
    const root = document.createElement("div");
    root.className = "love-heart";
    root.setAttribute("aria-hidden", "true");
    root.innerHTML = `
      <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="loveHeartGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffd6e2" />
            <stop offset="50%" stop-color="#ffadc7" />
            <stop offset="100%" stop-color="#f08ab0" />
          </linearGradient>
        </defs>
        <path d="${HEART_PATH}"
              fill="url(#loveHeartGrad)"
              stroke="rgba(255,247,213,0.85)"
              stroke-width="3" />
      </svg>
    `;
    document.body.appendChild(root);
    requestAnimationFrame(() => root.classList.add("show"));
    return root;
  }

  function flashHeart(duration = 3600) {
    const heart = buildHeart();
    window.setTimeout(() => {
      heart.classList.remove("show");
      window.setTimeout(() => heart.remove(), 320);
    }, duration);
  }

  function showToast(message, duration = 2400) {
    const toast = document.createElement("div");
    toast.className = "love-toast";
    const mark = document.createElement("span");
    mark.className = "love-toast-mark";
    mark.textContent = "❦";
    const text = document.createElement("span");
    text.textContent = message;
    toast.appendChild(mark);
    toast.appendChild(text);
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    window.setTimeout(() => {
      toast.classList.remove("show");
      window.setTimeout(() => toast.remove(), 320);
    }, duration);
  }

  function bindKeyboardCodes() {
    let konamiCursor = 0;
    let konamiShortCursor = 0;
    let numberCursor = 0;
    let yyCursor = 0;
    const yyPattern = ["KeyY","KeyN","KeyY","KeyN"];
    const advanceSequence = (code, pattern, cursor) => {
      if (code === pattern[cursor]) {
        const next = cursor + 1;
        return next === pattern.length ? { cursor: 0, matched: true } : { cursor: next, matched: false };
      }
      return { cursor: code === pattern[0] ? 1 : 0, matched: false };
    };
    document.addEventListener("keydown", (event) => {
      if (event.repeat) return;
      const code = event.code;
      const konami = advanceSequence(code, KONAMI, konamiCursor);
      konamiCursor = konami.cursor;
      const shortKonami = advanceSequence(code, KONAMI_SHORT, konamiShortCursor);
      konamiShortCursor = shortKonami.cursor;
      if (konami.matched || shortKonami.matched) {
        konamiCursor = 0;
        konamiShortCursor = 0;
        openLetter(SECRET_LINES[1]);
        flashHeart();
      }
      if (code === NUMBER_CODE[numberCursor]) {
        numberCursor += 1;
        if (numberCursor === NUMBER_CODE.length) {
          numberCursor = 0;
          openLetter(SECRET_LINES[0]);
        }
      } else {
        numberCursor = code === NUMBER_CODE[0] ? 1 : 0;
      }
      if (code === yyPattern[yyCursor]) {
        yyCursor += 1;
        if (yyCursor === yyPattern.length) {
          yyCursor = 0;
          showToast("Y · N · Y · N — 源源在这里", 2200);
        }
      } else {
        yyCursor = code === yyPattern[0] ? 1 : 0;
      }
    });
  }

  function bindBrandTaps() {
    const brand = document.querySelector("#menu .brand h1");
    if (!brand) return;
    let count = 0;
    let resetTimer = 0;
    brand.style.cursor = "default";
    brand.addEventListener("click", () => {
      count += 1;
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => { count = 0; }, 2200);
      if (count >= 7) {
        count = 0;
        openLetter(SECRET_LINES[2]);
        flashHeart(2800);
      } else if (count === 3) {
        showToast(pick(QUOTE_LINES), 1800);
      }
    });
  }

  function bindLongPressBrand() {
    const brand = document.querySelector("#menu .brand");
    if (!brand) return;
    let timer = 0;
    const start = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        flashHeart(3200);
        showToast("Yuan ❤ Nini", 2200);
      }, 1500);
    };
    const cancel = () => { window.clearTimeout(timer); };
    brand.addEventListener("pointerdown", start);
    brand.addEventListener("pointerup", cancel);
    brand.addEventListener("pointercancel", cancel);
    brand.addEventListener("pointerleave", cancel);
  }

  function bindSecretGem() {
    const heroes = document.querySelector(".menu-heroes");
    if (!heroes) return;
    if (heroes.querySelector(".secret-gem")) return;
    const gem = document.createElement("button");
    gem.type = "button";
    gem.className = "secret-gem";
    gem.setAttribute("aria-label", "隐藏的小星");
    gem.setAttribute("title", "");
    gem.tabIndex = -1;
    gem.addEventListener("click", () => {
      flashHeart(2400);
      showToast(pick(QUOTE_LINES), 2000);
    });
    heroes.appendChild(gem);
  }

  function rotateAmbientQuote() {
    const node = document.getElementById("ambientQuote");
    if (!node) return;
    node.textContent = pick(QUOTE_LINES);
  }

  function dateSurprise() {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const isAnniversary = (month === 5 && day === 20) || (month === 12 && day === 12);
    if (!isAnniversary) return;
    showToast("今天的星图，专门为你点亮 ✦", 3600);
    flashHeart(3200);
  }

  function bindConstellationHunt() {
    if (typeof window === "undefined" || !window.matchMedia) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const sparks = document.querySelectorAll(".ambient .ambient-spark");
    if (sparks.length < 6) return;
    document.querySelectorAll(".ambient").forEach((rail) => rail.classList.add("hunt-on"));
    const found = new Set();
    let firstAt = 0;
    let resetTimer = 0;
    const resetHunt = () => {
      found.clear();
      firstAt = 0;
      window.clearTimeout(resetTimer);
      resetTimer = 0;
    };
    sparks.forEach((spark, index) => {
      spark.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        if (found.has(index)) return;
        const now = Date.now();
        if (!firstAt) firstAt = now;
        if (now - firstAt > HUNT_WINDOW_MS) {
          resetHunt();
          firstAt = now;
        }
        found.add(index);
        spark.classList.remove("lit");
        // Force reflow so the animation restarts cleanly when the same spark blooms again later.
        void spark.offsetWidth;
        spark.classList.add("lit");
        window.setTimeout(() => spark.classList.remove("lit"), 1500);
        window.clearTimeout(resetTimer);
        resetTimer = window.setTimeout(resetHunt, HUNT_WINDOW_MS);
        if (found.size >= sparks.length) {
          resetHunt();
          openLetter(SECRET_LINES[3]);
          flashHeart(3200);
        }
      });
    });
  }

  const openLetter = (function makeOpener() {
    let instance = null;
    return function open(payload) {
      if (instance) instance.dismiss();
      instance = buildLetter();
      instance.show(payload);
    };
  })();

  function init() {
    bindKeyboardCodes();
    bindBrandTaps();
    bindLongPressBrand();
    bindSecretGem();
    bindConstellationHunt();
    rotateAmbientQuote();
    dateSurprise();
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", once(init), { once: true });
    } else {
      init();
    }
  }

  const api = { openLetter, flashHeart, showToast, rotateAmbientQuote, bindConstellationHunt };
  root.NiniYuanLove = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
