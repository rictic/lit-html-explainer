// The phase bar: which render call is running, and which of its three phases
// (prepare, create, update) are idle, active, done or skipped. Drawn over
// every scene by the renderer, from one table of events keyed to narration
// marks, so it stays continuous across scene cuts.
//
// Scenes must keep the top 100 px clear while it's visible
// (hudVisible(t) > 0).

import { mark } from "../timing.js";
import { C, rgba } from "./theme.js";
import { check, fillRR, mono, sans, strokeRR, text, withAlpha, withGlow } from "./draw.js";
import { clamp } from "../util.js";

const PHASES = ["prepare", "create", "update"];

// [time, what, value]: what is "show" (0/1), "label" (string), or a phase
// name (idle | active | done | skipped).
function events() {
  const m = mark;
  return [
    [m("code.phases") - 0.3, "show", 1],
    [m("code.phases") - 0.3, "label", null],
    [m("code.prepare"), "prepare", "active"],
    [m("code.create"), "create", "active"],
    [m("code.update"), "update", "active"],
    [m("code.skip"), "prepare", "idle"],
    [m("code.skip"), "create", "idle"],
    [m("code.skip"), "update", "idle"],
    [m("literal.tag") - 1.2, "show", 0],
    // the first render
    [m("root.render"), "show", 1],
    [m("root.render"), "label", "render(counter(0), document.body)"],
    [m("lookup.prepare"), "prepare", "active"],
    [m("cache.once"), "prepare", "done"],
    [m("create.phase"), "create", "active"],
    [m("update.update"), "create", "done"],
    [m("update.update"), "update", "active"],
    [m("update.remember"), "update", "done"],
    // the second
    [m("rerender.click"), "label", "render(counter(1), document.body)"],
    [m("rerender.click"), "prepare", "idle"],
    [m("rerender.click"), "create", "idle"],
    [m("rerender.click"), "update", "idle"],
    [m("rerender.skip"), "prepare", "skipped"],
    [m("rerender.skip") + 0.25, "create", "skipped"],
    [m("rerender.straight"), "update", "active"],
    [m("rerender.two"), "update", "done"],
    [m("nesting.nested") - 1.0, "show", 0],
  ].sort((a, b) => a[0] - b[0]);
}

let EV = null;
const FADE = 0.35;

// The value of `what` at t, the previous value, and progress of the change.
function at(t, what, initial) {
  EV ??= events();
  let cur = initial, prev = initial, since = -Infinity;
  for (const [time, w, v] of EV) {
    if (w !== what || time > t) continue;
    prev = cur;
    cur = v;
    since = time;
  }
  return { cur, prev, u: clamp((t - since) / FADE) };
}

export function hudVisible(t) {
  const s = at(t, "show", 0);
  return s.prev === s.cur ? s.cur : s.prev + (s.cur - s.prev) * s.u;
}

const STYLE = {
  idle: { fill: "rgba(0,0,0,0)", border: C.border2, text: C.text3 },
  active: { fill: rgba(C.accent, 0.26), border: C.accent, text: C.white },
  done: { fill: rgba(C.ok, 0.12), border: rgba(C.ok, 0.7), text: C.text2 },
  skipped: { fill: "rgba(0,0,0,0)", border: C.text4, text: C.text4 },
};

export function drawHud({ t, ctx }) {
  const vis = hudVisible(t);
  if (vis <= 0.001) return;
  const label = at(t, "label", null);
  const pillW = 176, pillH = 42, gap = 44, y = 30;
  const labelF = mono(21, 500);
  // centre the whole group
  ctx.save();
  ctx.font = labelF;
  const lw = label.cur ? ctx.measureText(label.cur).width + 60 : 0;
  ctx.restore();
  const total = lw + PHASES.length * pillW + (PHASES.length - 1) * gap;
  let x = 960 - total / 2;
  withAlpha(ctx, vis, () => {
    // backdrop so the bar reads over busy scenes
    withAlpha(ctx, 0.85, () => fillRR(ctx, x - 22, y - 12, total + 44, pillH + 24, 16, rgba(C.bg, 0.8)));
    if (label.cur) {
      withAlpha(ctx, label.u, () => text(ctx, label.cur, x, y + pillH / 2 + 1, { font: labelF, color: C.text2, baseline: "middle" }));
      text(ctx, "›", x + lw - 34, y + pillH / 2 - 1, { font: sans(30, 400), color: C.text3, baseline: "middle", alpha: label.u });
      x += lw;
    }
    PHASES.forEach((ph, i) => {
      const s = at(t, ph, "idle");
      const a = STYLE[s.prev], b = STYLE[s.cur];
      const px = x + i * (pillW + gap);
      const draw = (st, alpha, state) => withAlpha(ctx, alpha, () => {
        if (state === "active") {
          const breathe = 0.6 + 0.4 * Math.sin(t * 3.2);
          withGlow(ctx, rgba(C.accent, 0.7 * breathe), 18, () => fillRR(ctx, px, y, pillW, pillH, pillH / 2, st.fill));
        } else fillRR(ctx, px, y, pillW, pillH, pillH / 2, st.fill);
        ctx.save();
        if (state === "skipped") ctx.setLineDash([6, 6]);
        strokeRR(ctx, px + 1, y + 1, pillW - 2, pillH - 2, pillH / 2, st.border, 2);
        ctx.restore();
        const label = ph.toUpperCase();
        const tw = text(ctx, label, px + pillW / 2 + (state === "done" ? 12 : 0), y + pillH / 2 + 1,
          { font: sans(19, 650), color: st.text, align: "center", baseline: "middle" });
        if (state === "done") check(ctx, px + pillW / 2 - tw / 2 - 8, y + pillH / 2, 20, C.ok, 1);
        if (state === "skipped") {
          ctx.fillStyle = C.text4;
          ctx.fillRect(px + pillW / 2 - tw / 2 - 6, y + pillH / 2, tw + 12, 2);
        }
      });
      if (s.u < 1 && s.prev !== s.cur) draw(a, 1 - s.u, s.prev);
      draw(b, s.prev !== s.cur ? s.u : 1, s.cur);
      if (i < PHASES.length - 1) {
        text(ctx, "→", px + pillW + gap / 2, y + pillH / 2, { font: sans(24, 400), color: C.text4, align: "center", baseline: "middle" });
      }
    });
  });
}

