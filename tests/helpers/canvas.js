"use strict";

// Recording stand-ins for the Canvas 2D API, for render tests under Node.
//
// `recordingContext()` accepts any drawing call and logs it with the state
// that matters for assertions (fill/stroke style and global alpha at the time
// of a fill, stroke, or drawImage). `RecordingPath` mirrors Path2D so code
// that prepares geometry ahead of time can be inspected op by op.

class RecordingPath {
  constructor() {
    this.ops = [];
  }
}

for (const name of ["moveTo", "lineTo", "quadraticCurveTo", "bezierCurveTo", "arc", "arcTo", "ellipse", "rect", "roundRect", "closePath", "addPath"]) {
  RecordingPath.prototype[name] = function record(...args) {
    this.ops.push([name, ...args]);
  };
}

function gradient() {
  const stops = [];
  return { stops, addColorStop(offset, color) { stops.push([offset, color]); } };
}

function identity() {
  return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
}

/**
 * A context that records every call. Unknown methods are accepted and logged,
 * so painters can use any part of the API without the mock falling behind.
 */
function recordingContext(canvas = null) {
  const calls = [];
  const state = {
    fillStyle: "#000000",
    strokeStyle: "#000000",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    lineDashOffset: 0,
    font: "10px sans-serif",
    textAlign: "start",
    imageSmoothingEnabled: true,
    imageSmoothingQuality: "low",
    filter: "none",
  };
  const stack = [];
  let transform = identity();
  const special = {
    calls,
    canvas,
    save() {
      stack.push({ ...state, transform: { ...transform } });
      calls.push(["save"]);
    },
    restore() {
      const top = stack.pop();
      if (top) {
        transform = top.transform;
        delete top.transform;
        Object.assign(state, top);
      }
      calls.push(["restore"]);
    },
    getTransform() {
      return { ...transform };
    },
    setTransform(...args) {
      transform = args.length === 1 ? { ...identity(), ...args[0] } : { a: args[0], b: args[1], c: args[2], d: args[3], e: args[4], f: args[5] };
      calls.push(["setTransform", ...args]);
    },
    createLinearGradient: () => gradient(),
    createRadialGradient: () => gradient(),
    createPattern: () => ({}),
    measureText: (text) => ({ width: String(text).length * 8 }),
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)) }),
  };
  const logged = new Set(["fill", "stroke", "fillRect", "strokeRect", "drawImage", "fillText", "strokeText"]);
  return new Proxy(special, {
    get(target, key) {
      if (key in target) return target[key];
      if (typeof key === "string" && key in state) return state[key];
      if (typeof key !== "string") return undefined;
      return (...args) => {
        if (logged.has(key)) {
          calls.push([key, ...args, { fillStyle: state.fillStyle, strokeStyle: state.strokeStyle, globalAlpha: state.globalAlpha, composite: state.globalCompositeOperation }]);
        } else {
          calls.push([key, ...args]);
        }
      };
    },
    set(target, key, value) {
      if (typeof key === "string" && key in state) {
        state[key] = value;
        calls.push(["set", key, value]);
        return true;
      }
      target[key] = value;
      return true;
    },
  });
}

/** A minimal canvas whose context records calls; for Art.setCanvasFactory. */
function recordingCanvas(width, height) {
  const canvas = { width, height, contexts: [] };
  canvas.getContext = () => {
    const ctx = recordingContext(canvas);
    canvas.contexts.push(ctx);
    return ctx;
  };
  return canvas;
}

function callsNamed(ctx, name) {
  return ctx.calls.filter((call) => call[0] === name);
}

module.exports = { RecordingPath, recordingContext, recordingCanvas, callsNamed };
