// batching: three property sets, one render.
//
//   timing / three / once  el.a = 1; el.b = 2; el.c = 3; -> one render() (truth:
//                          3 sets, 1 render).
//   request … then         the same three lines, stepped through with Lit's code:
//                          the setter calls requestUpdate(), which records the
//                          change in _$changedProperties and, since no update is
//                          pending, starts __enqueueUpdate(); that awaits (the
//                          comment in its source says why) and waits while b and c
//                          are recorded; then one update renders all three.
//   microtask … half       one turn of the event loop: task -> microtasks ->
//                          rendering. The update runs before paint (truth: 0
//                          renders before the microtask, 1 after), so no frame
//                          ever shows a half-updated element.
//   complete               updateComplete is that promise (truth: resolves true).
//
// The code quoted is reactive-element.js from @lit/reactive-element 2.1.2
// (Lit 3.3.3), development build; "…" marks lines left out.

import { platformTruth } from "../timing.js";
import { C, SYN, blend, rgba } from "../kit/theme.js";
import { arrow, check, cross, fillRR, measure, mono, panel, sans, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { clamp, ease, lerp, prog, pulse, window } from "../util.js";
import { LITC, PLAT, code, codePanel, drawCode, platBox, statBox, tag, topicRow } from "./components-kit.js";

export const transition = "fade";

const USER = ["el.a = 1;", "el.b = 2;", "el.c = 3;"];
const NAMES = ["a", "b", "c"];
const UP = { x: 80, y: 150, w: 540, h: 370 };   // your code, later the task
const USER_SIZE = 40;
const lineY = (k) => UP.y + 106 + k * 64;        // centre of user line k
const CODE_X = UP.x + 76;
const RIGHT = { x: 660, y: 150, w: 1180 };       // Lit's code
const ELC = { x: 80, y: 548, w: 540 };           // the element's state
const CHAIN_Y = 740;
const COUNTER = { x: 1480, y: 850, w: 360, h: 96 };

// Excerpts of reactive-element.js ("…": lines left out).
const REQ_SRC = `requestUpdate(name, oldValue, options, …) {
  if (name !== undefined) {
    …
    if (changed) {
      this._$changeProperty(name, oldValue, options);
    } else { … }
  }
  if (this.isUpdatePending === false) {
    this.__updatePromise = this.__enqueueUpdate();
  }
}`;
const ENQ_SRC = `async __enqueueUpdate() {
  this.isUpdatePending = true;
  try {
    // Ensure any previous update has resolved before updating.
    // This \`await\` also ensures that property changes are batched.
    await this.__updatePromise;
  } catch (e) { … }
  const result = this.scheduleUpdate();
  …
  return !this.isUpdatePending;
}`;
// (the two getters, the one that answers first)
const UC_SRC = `getUpdateComplete() {
  return this.__updatePromise;
}
get updateComplete() {
  return this.getUpdateComplete();
}`;
const TEST_SRC = `el.a = 1;
el.b = 2;
el.c = 3;
await el.updateComplete;`;
const CHAIN = ["scheduleUpdate()", "performUpdate()", "update()", "render()"];

// The event loop's three steps.
const BLK = [
  { x: 80, w: 540, title: "task" },
  { x: 700, w: 520, title: "microtasks" },
  { x: 1280, w: 560, title: "rendering" },
];
const BLK_Y = 150, BLK_H = 370;
const REBECCA = "#663399";

export function draw(F, S) {
  const { ctx, t } = F;
  const P = platformTruth().components;
  const B = P.batching;
  const T = {};
  for (const k of ["timing", "three", "once", "request", "record", "pending", "await", "rest", "then", "microtask", "paint", "half", "complete"]) T[k] = S.m(k);
  const W = (i, w, n = 0) => S.word(i, w, n);

  // ---- the topic row: from the components scene, now on microtasks
  const sw = prog(t, T.timing - 0.3, 0.45);
  topicRow(ctx, { weights: [0, 0, 1 - sw, sw] });

  // ---- phases
  const p0 = window(t, T.once - 0.25, T.request - 0.25, 0.4, 0.4);
  const p1 = window(t, T.request - 0.15, T.microtask - 0.3, 0.45, 0.45);
  const p2 = prog(t, T.microtask - 0.25, 0.5);

  // when each user line runs (the program counter), and when each change is recorded
  const runT = [T.request - 0.1, T.rest + 0.1, T.rest + 1.1];
  const recT = [T.record + 0.45, T.rest + 0.5, T.rest + 1.5];
  const pcEnd = T.rest + 1.9;

  // the opening is drawn larger, in the middle, and settles top-left as the step-through starts
  const z = 1 - prog(t, T.request - 0.35, 0.8);
  ctx.save();
  if (z > 0) {
    const cx = 643, cy = 335, k = lerp(1, 1.25, z);
    ctx.translate(cx + 317 * z, cy + 215 * z);
    ctx.scale(k, k);
    ctx.translate(-cx, -cy);
  }
  drawUserCode(ctx, t, S, T, { p1, p2, runT, pcEnd });
  if (p0 > 0) drawOnce(ctx, t, S, T, B, p0);
  ctx.restore();
  if (p1 > 0) drawWalk(ctx, t, S, T, B, p1, { runT, recT, W });
  if (p2 > 0) drawLoop(ctx, t, S, T, B, p2, { W });
}

// ------------------------------------------------------------- your code

function drawUserCode(ctx, t, S, T, { p1, p2, runT, pcEnd }) {
  const inU = prog(t, T.timing + 0.2, 0.5, ease.outCubic);
  if (inU <= 0) return;
  // the frame: "your code", which becomes the event loop's task
  withAlpha(ctx, inU * (1 - p2), () => panel(ctx, { ...UP, title: "your code", titleFont: sans(22, 600) }));
  if (p2 > 0) {
    const hot = window(t, T.microtask - 0.1, S.word(2, "in") - 0.1, 0.3, 0.4);
    platBox(ctx, { ...UP, title: BLK[0].title, titleFont: sans(28, 700), alpha: p2, glow: hot });
  }
  // the lines, typed one after another
  const lineAt = [T.three - 0.1, S.word(0, "properties") - 0.15, S.word(0, "on") - 0.1];
  const again = [S.word(0, "one") - 0.05, S.word(0, "after") - 0.05, S.word(0, "another,") - 0.05];
  USER.forEach((src, k) => {
    const u = prog(t, lineAt[k], 0.35);
    if (u <= 0) return;
    const c = code(src, USER_SIZE, 1.3);
    const y = lineY(k);
    const blip = pulse(t, again[k], 0.5);
    // the line that's running now
    const on = p1 > 0 ? window(t, runT[k], k < 2 ? runT[k + 1] : pcEnd, 0.2, 0.25) * p1 : 0;
    if (on > 0 || blip > 0) {
      const r = c.rect(ctx, CODE_X, y - c.lh / 2, 0, 0, src.length);
      fillRR(ctx, r.x - 10, r.y - 2, r.w + 20, r.h + 4, 8, rgba(C.accent, 0.2 * Math.max(on, blip)));
    }
    drawCode(ctx, src, CODE_X + 10 * (1 - u), y - c.lh / 2, { size: USER_SIZE, lineHeight: 1.3, alpha: u });
  });
  // the program counter (while stepping through)
  if (p1 > 0) {
    const k = t < runT[1] ? 0 : t < runT[2] ? 1 : 2;
    const mv = k === 0 ? 0 : prog(t, runT[k] - 0.05, 0.3);
    const y = lerp(lineY(Math.max(0, k - 1)), lineY(k), mv);
    const a = p1 * prog(t, runT[0], 0.3) * (1 - prog(t, pcEnd - 0.1, 0.35));
    if (a > 0) withAlpha(ctx, a, () => {
      ctx.save();
      ctx.fillStyle = C.accent;
      ctx.beginPath();
      ctx.moveTo(UP.x + 26, y - 13);
      ctx.lineTo(UP.x + 48, y);
      ctx.lineTo(UP.x + 26, y + 13);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });
  }
}

// ------------------------------------------------- three sets, one render

function drawOnce(ctx, t, S, T, B, a) {
  withAlpha(ctx, a, () => {
    const u = prog(t, T.once - 0.2, 0.5);
    const chip = { x: 900, y: lineY(1) - 34, h: 68 };
    const f = mono(34, 600);
    const w = measure(ctx, "render()", f) + 48;
    USER.forEach((src, k) => {
      const c = code(src, USER_SIZE, 1.3);
      const x0 = CODE_X + c.width(ctx) + 24;
      arrow(ctx, { x: x0, y: lineY(k) }, { x: chip.x - 14, y: lineY(1) }, { color: rgba(LITC, 0.8), width: 2.5, progress: u, bend: (k - 1) * -24, head: k === 1 ? 12 : 0 });
    });
    const cu = prog(t, T.once + 0.05, 0.45, ease.outBack);
    withScale(ctx, lerp(0.8, 1, cu), chip.x + w / 2, lineY(1), () => withAlpha(ctx, clamp(cu), () => {
      withGlow(ctx, rgba(LITC, 0.7 * pulse(t, T.once + 0.2, 1.2)), 24, () => fillRR(ctx, chip.x, chip.y, w, chip.h, 14, C.panel2));
      strokeRR(ctx, chip.x + 0.75, chip.y + 0.75, w - 1.5, chip.h - 1.5, 14, rgba(LITC, 0.8), 2);
      text(ctx, "render()", chip.x + 24, lineY(1) + 1, { font: f, color: SYN.fn, baseline: "middle" });
    }));
    // 3 sets, 1 render (truth)
    const nu = prog(t, S.word(0, "once.") - 0.15, 0.4);
    const x = chip.x + w + 36;
    text(ctx, `× ${B.rendersAfterUpdateComplete}`, x, lineY(1) + 2, { font: sans(56, 750), color: C.text, baseline: "middle", alpha: nu });
    text(ctx, `${B.propertySets} property sets, ${B.rendersAfterUpdateComplete} render`, chip.x, lineY(1) + 88, { font: sans(28, 600), color: C.text2, baseline: "middle", alpha: nu });
  });
}

// ------------------------------------------ stepping through Lit's code

function drawWalk(ctx, t, S, T, B, a, { runT, recT, W }) {
  withAlpha(ctx, a, () => {
    const swap = prog(t, T.await - 0.35, 0.45);       // requestUpdate -> __enqueueUpdate
    const flagT = W(1, "begins") - 0.2;                 // isUpdatePending = true runs
    const resumeT = T.then - 0.05;

    // ---- requestUpdate(name, oldValue, options)
    if (swap < 1) {
      const hl = [
        { line: 0, u: window(t, W(1, "request") - 0.2, T.record - 0.1, 0.3, 0.3) },
        { line: 4, u: window(t, T.record - 0.05, T.pending - 0.1, 0.3, 0.3) },
        { line: 7, u: window(t, T.pending - 0.05, W(1, "starts") - 0.1, 0.3, 0.3) },
        { line: 8, u: window(t, W(1, "starts") - 0.15, T.await, 0.3, 0.3) },
      ];
      const cp = codePanel(ctx, { ...RIGHT, src: REQ_SRC, size: 28, lineHeight: 1.45, title: "reactive-element.js · ReactiveElement", alpha: 1 - swap, hl });
      // the setter's call: requestUpdate('a', undefined, …)
      const cu = prog(t, runT[0] + 0.5, 0.45) * (1 - swap);
      if (cu > 0) {
        const y0 = lineY(0);
        const from = { x: CODE_X + code(USER[0], USER_SIZE, 1.3).width(ctx) + 18, y: y0 };
        const r0 = cp.lineRect(0);
        arrow(ctx, from, { x: RIGHT.x - 8, y: r0.y + r0.h / 2 }, { color: rgba(LITC, 0.9), width: 2.5, progress: cu, bend: -30, head: 11 });
        // name / oldValue for this call
        const au = prog(t, W(1, "update,") - 0.1, 0.4) * (1 - swap);
        const args = "name: 'a'   oldValue: undefined";
        text(ctx, args, RIGHT.x + RIGHT.w - 24, RIGHT.y + 22, { font: mono(22, 500), color: C.text2, align: "right", baseline: "middle", alpha: au });
      }
      // is an update pending? no
      const qu = window(t, W(1, "pending,") - 0.1, T.await - 0.2, 0.3, 0.3);
      if (qu > 0) {
        const r = cp.lineRect(7);
        withAlpha(ctx, qu, () => {
          check(ctx, r.x + r.w + 36, r.y + r.h / 2, 28, C.ok, qu);
          text(ctx, "nothing pending", r.x + r.w + 64, r.y + r.h / 2 + 1, { font: sans(24, 600), color: C.ok, baseline: "middle" });
        });
      }
    }

    // ---- __enqueueUpdate(): the await that batches
    if (swap > 0) {
      const awaitU = prog(t, W(1, "awaiting") - 0.2, 0.35);
      const commentU = prog(t, W(1, "awaiting") + 0.3, 0.4);
      const hl = [
        { line: 1, u: window(t, T.await - 0.1, W(1, "awaiting") - 0.3, 0.3, 0.3) },
        { line: 5, u: awaitU * (1 - prog(t, resumeT, 0.3)) },
        { line: 4, u: 0.75 * commentU * (1 - prog(t, resumeT, 0.3)), color: C.text2 },
        { line: 7, u: window(t, resumeT, T.microtask, 0.3, 0.3) },
      ];
      const cp = codePanel(ctx, {
        ...RIGHT, src: ENQ_SRC, size: 28, lineHeight: 1.45, title: "reactive-element.js · ReactiveElement", alpha: swap, hl,
        style: (tok) => (tok.kind === "comment" && tok.line === 4 && commentU > 0 ? { color: blend(SYN.comment, C.text, commentU) } : null),
      });
      // waiting at the await while the rest of the code runs
      const wu = prog(t, W(1, "promise,") - 0.1, 0.4) * (1 - prog(t, resumeT, 0.3));
      if (wu > 0) {
        const r = cp.lineRect(5);
        const x = r.x + r.w + 40, y = r.y + r.h / 2;
        const breathe = 0.75 + 0.25 * Math.sin((t - W(1, "promise,")) * 3);
        withAlpha(ctx, wu, () => {
          ctx.save();
          ctx.fillStyle = rgba(C.accent, breathe);
          ctx.fillRect(x, y - 13, 7, 26);
          ctx.fillRect(x + 13, y - 13, 7, 26);
          ctx.restore();
          text(ctx, "waiting", x + 34, y + 1, { font: sans(26, 650), color: C.accent, baseline: "middle" });
        });
      }
      const ru = window(t, resumeT + 0.1, T.microtask, 0.3, 0.3);
      if (ru > 0) {
        const r = cp.lineRect(7);
        text(ctx, "resumes", r.x + r.w + 40, r.y + r.h / 2 + 1, { font: sans(26, 650), color: C.accent, baseline: "middle", alpha: ru });
      }
    }

    // ---- the element's state
    const pending = t >= flagT ? (t >= T.then + 2.7 ? false : true) : false;
    const flip = Math.max(pulse(t, flagT, 0.8), pulse(t, T.then + 2.7, 0.8));
    const cleared = prog(t, T.then + 2.7, 0.35);
    const rowsU = NAMES.map((_, k) => prog(t, recT[k], 0.4) * (1 - cleared));
    const n = t >= T.then + 2.7 ? 0 : recT.filter((x) => t >= x).length;
    const lx = ELC.x + 24;
    const f = mono(27, 500);
    const h = 46 + 44 + 44 + 3 * 42 + 22;
    withAlpha(ctx, prog(t, T.request, 0.45), () => {
      panel(ctx, { ...ELC, h, accent: LITC });
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(ELC.x, ELC.y, ELC.w, h, 16);
      ctx.clip();
      ctx.fillStyle = rgba(LITC, 0.14);
      ctx.fillRect(ELC.x, ELC.y, ELC.w, 46);
      ctx.restore();
      text(ctx, "el", lx, ELC.y + 24, { font: mono(26, 650), color: LITC, baseline: "middle" });
      text(ctx, "an XCounter", ELC.x + ELC.w - 20, ELC.y + 24, { font: sans(20, 500), color: C.text3, baseline: "middle", align: "right" });
      const y1 = ELC.y + 46 + 30, y2 = y1 + 46;
      let x = lx + text(ctx, "isUpdatePending: ", lx, y1, { font: f, color: C.text3, baseline: "middle" });
      withGlow(ctx, rgba(C.accent, 0.9 * flip), 18 * flip, () =>
        text(ctx, String(pending), x, y1, { font: mono(27, 650), color: SYN.keyword, baseline: "middle" }));
      x = lx + text(ctx, "_$changedProperties: ", lx, y2, { font: f, color: C.text3, baseline: "middle" });
      text(ctx, `Map(${n})`, x, y2, { font: f, color: C.text2, baseline: "middle" });
      const three = window(t, W(1, "all") - 0.1, T.then + 2.7, 0.3, 0.3);
      NAMES.forEach((nm, k) => {
        if (rowsU[k] <= 0) return;
        const y = y2 + 44 + k * 42;
        withAlpha(ctx, rowsU[k], () => {
          if (three > 0) fillRR(ctx, lx + 20, y - 18, 330, 36, 8, rgba(C.accent, 0.2 * three));
          let xx = lx + 32 + 14 * (1 - rowsU[k]);
          xx += text(ctx, `'${nm}'`, xx, y, { font: f, color: SYN.string, baseline: "middle" });
          xx += text(ctx, " => ", xx, y, { font: f, color: SYN.punct, baseline: "middle" });
          text(ctx, "undefined", xx, y, { font: f, color: SYN.keyword, baseline: "middle" });
        });
      });
      // "the old value": a hint on the first entry
      const ou = window(t, recT[0] + 0.4, T.pending + 0.6, 0.3, 0.4);
      text(ctx, "← old value", lx + 340, y2 + 44, { font: sans(22, 600), color: C.text3, baseline: "middle", alpha: ou });
    });
    // each recorded change flies from its line into the map
    NAMES.forEach((nm, k) => {
      const u = prog(t, recT[k] - 0.35, 0.4);
      if (u <= 0 || u >= 1) return;
      const from = { x: CODE_X + 60, y: lineY(k) + 24 };
      const to = { x: lx + 60, y: ELC.y + 46 + 30 + 46 + 44 + k * 42 };
      const p = { x: lerp(from.x, to.x, ease.inOutCubic(u)), y: lerp(from.y, to.y, ease.inOutCubic(u)) };
      text(ctx, `'${nm}'`, p.x, p.y, { font: mono(27, 600), color: SYN.string, baseline: "middle", alpha: 1 - 0.3 * u });
    });
    // b and c: an update is already pending, so no second one starts
    const skipU = [1, 2].map((k) => window(t, recT[k] + 0.1, resumeT, 0.3, 0.3));
    skipU.forEach((u, i) => {
      if (u <= 0) return;
      const k = i + 1;
      const c = code(USER[k], USER_SIZE, 1.3);
      tag(ctx, { x: CODE_X + c.width(ctx) + 26, y: lineY(k) - 18, h: 36, text: "already pending", color: C.text2, font: sans(21, 650), alpha: u, dashed: true });
    });

    // ---- then: one update, one render, all three changes
    const chainX = [];
    let cx = RIGHT.x;
    CHAIN.forEach((src) => {
      chainX.push(cx);
      cx += measure(ctx, src, mono(27, 550)) + 36 + 54;
    });
    CHAIN.forEach((src, k) => {
      const u = prog(t, resumeT + 0.2 + 0.28 * k, 0.35, ease.outBack);
      if (u <= 0) return;
      const w = measure(ctx, src, mono(27, 550)) + 36;
      withAlpha(ctx, clamp(u), () => {
        fillRR(ctx, chainX[k], CHAIN_Y - 27, w, 54, 12, C.panel2);
        strokeRR(ctx, chainX[k] + 0.75, CHAIN_Y - 26.25, w - 1.5, 52.5, 12, rgba(LITC, 0.7), 1.5);
        text(ctx, src, chainX[k] + 18, CHAIN_Y + 1, { font: mono(27, 550), color: SYN.fn, baseline: "middle" });
      });
      if (k > 0) arrow(ctx, { x: chainX[k] - 50, y: CHAIN_Y }, { x: chainX[k] - 8, y: CHAIN_Y }, { color: rgba(LITC, 0.8), width: 2.5, progress: u, head: 10 });
    });
    // the changes go into update(changedProperties)
    const mu = window(t, W(1, "all") - 0.2, T.microtask, 0.4, 0.3);
    if (mu > 0) {
      const to = { x: chainX[2] + 20, y: CHAIN_Y + 30 };
      arrow(ctx, { x: ELC.x + ELC.w + 8, y: ELC.y + 46 + 30 + 46 + 44 + 42 }, to, { color: rgba(C.accent, 0.9), width: 2.5, progress: mu, bend: 70, head: 11 });
    }
    // render() calls: 0 until now (truth), then 1
    const done = prog(t, W(1, "once,") - 0.15, 0.2);
    const cu = prog(t, T.request + 0.3, 0.45);
    statBox(ctx, { ...COUNTER, label: "render() calls", value: String(done > 0.5 ? B.rendersAfterUpdateComplete : B.rendersBeforeMicrotask), alpha: cu,
      bump: pulse(t, W(1, "once,") - 0.1, 0.6), glow: pulse(t, W(1, "once,") - 0.1, 1.4) });
  });
}


// --------------------------------------------------------- the event loop

function drawLoop(ctx, t, S, T, B, a, { W }) {
  const microT = W(2, "in") - 0.1, renderT = W(2, "before") - 0.1, paintT = W(2, "paint.") - 0.15;
  const hot = [
    0,
    window(t, microT, renderT, 0.3, 0.4),
    prog(t, renderT, 0.4),
  ];
  withAlpha(ctx, a, () => {
    // the other two steps (the task is the "your code" frame)
    BLK.forEach((b, i) => {
      if (i === 0) return;
      const u = prog(t, T.microtask + 0.1 + 0.3 * i, 0.45);
      platBox(ctx, { x: b.x, y: BLK_Y, w: b.w, h: BLK_H, title: b.title, titleFont: sans(28, 700), alpha: u, glow: 0.9 * hot[i] });
    });
    // arrows between the steps
    const au = [prog(t, T.microtask + 0.5, 0.4), prog(t, T.microtask + 0.8, 0.4)];
    const my = BLK_Y + BLK_H / 2;
    arrow(ctx, { x: BLK[0].x + BLK[0].w + 8, y: my }, { x: BLK[1].x - 8, y: my }, { color: PLAT, width: 3, progress: au[0], head: 12 });
    arrow(ctx, { x: BLK[1].x + BLK[1].w + 8, y: my }, { x: BLK[2].x - 8, y: my }, { color: PLAT, width: 3, progress: au[1], head: 12 });
    // ...and round again
    const lu = prog(t, T.microtask + 1.1, 0.8);
    const l0 = { x: BLK[2].x + 220, y: BLK_Y + BLK_H + 8 }, l1 = { x: BLK[0].x + BLK[0].w - 70, y: BLK_Y + BLK_H + 8 };
    arrow(ctx, l0, l1, { color: rgba(PLAT, 0.55), width: 2.5, progress: lu, bend: -100, head: 11, dash: [10, 8] });
    text(ctx, "the event loop: the next task", 960, BLK_Y + BLK_H + 86, { font: sans(24, 600), color: rgba(PLAT, 0.9), align: "center", baseline: "middle", alpha: prog(t, T.microtask + 1.5, 0.4) });

    // task: after the three sets, nothing rendered yet, an update pending (truth)
    const tu = prog(t, T.microtask + 0.4, 0.4);
    const ty = BLK_Y + BLK_H - 38;
    text(ctx, `render() calls: ${B.rendersBeforeMicrotask}`, BLK[0].x + 30, ty, { font: mono(24, 500), color: C.text2, baseline: "middle", alpha: tu });
    text(ctx, `isUpdatePending: ${B.pendingAfterSets}`, BLK[0].x + 30, ty - 36, { font: mono(24, 500), color: C.text2, baseline: "middle", alpha: tu });

    // microtasks: the code after the await
    const mx = BLK[1].x + 30;
    const m1 = prog(t, W(2, "after") - 0.1, 0.4), m2 = prog(t, microT + 0.2, 0.4), m3 = prog(t, microT + 0.7, 0.4);
    text(ctx, "__enqueueUpdate()", mx, BLK_Y + 104, { font: mono(28, 550), color: SYN.fn, baseline: "middle", alpha: m1 });
    text(ctx, "after its await:", mx, BLK_Y + 146, { font: sans(24, 600), color: C.text3, baseline: "middle", alpha: m1 });
    text(ctx, "update() → render()", mx + 20, BLK_Y + 194, { font: mono(28, 550), color: C.text, baseline: "middle", alpha: m2 });
    text(ctx, `render() calls: ${B.rendersAfterUpdateComplete}`, mx, ty, { font: mono(24, 500), color: C.text, baseline: "middle", alpha: m3 });

    // rendering: style, layout, paint -- the element, all three values at once
    const rx = BLK[2].x + 30;
    const r1 = prog(t, renderT, 0.4);
    text(ctx, "style · layout · paint", rx, BLK_Y + 96, { font: sans(26, 600), color: C.text2, baseline: "middle", alpha: r1 });
    const pg = { x: rx, y: BLK_Y + 132, w: BLK[2].w - 60, h: 150 };
    withAlpha(ctx, r1, () => {
      fillRR(ctx, pg.x, pg.y, pg.w, pg.h, 10, "#f6f7fb");
      strokeRR(ctx, pg.x + 0.5, pg.y + 0.5, pg.w - 1, pg.h - 1, 10, "#3a4466", 1.5);
      const pu = prog(t, paintT, 0.35);
      text(ctx, "1 2 3", pg.x + 40, pg.y + pg.h / 2 + 2, { font: sans(60, 600), color: REBECCA, baseline: "middle", alpha: pu });
      text(ctx, "<x-counter>", pg.x + pg.w - 16, pg.y + 22, { font: mono(18, 500), color: "#8a93ab", align: "right", baseline: "middle" });
    });

    // ---- half: no frame ever shows a half-updated element
    const hu = window(t, T.half - 0.15, T.complete - 0.2, 0.4, 0.4);
    if (hu > 0) {
      withAlpha(ctx, hu, () => {
        const y = 668, w = 400, h = 150;
        const gx = 960 - w - 60, okx = 960 + 60;
        // what a half-updated element would look like: only a
        fillRR(ctx, gx, y, w, h, 10, "rgba(246,247,251,0.55)");
        ctx.save();
        ctx.setLineDash([8, 7]);
        strokeRR(ctx, gx + 0.5, y + 0.5, w - 1, h - 1, 10, rgba(C.text3, 0.9), 1.5);
        ctx.restore();
        text(ctx, "1", gx + 40, y + h / 2 + 2, { font: sans(60, 600), color: rgba(REBECCA, 0.7), baseline: "middle" });
        cross(ctx, gx + w - 50, y + h / 2, 46, C.bad, prog(t, S.word(2, "nobody") - 0.1, 0.45));
        text(ctx, "half-updated: never painted", gx + w / 2, y + h + 34, { font: sans(24, 600), color: C.text3, align: "center", baseline: "middle", alpha: prog(t, S.word(2, "half-updated") - 0.2, 0.4) });
        // what every paint shows
        fillRR(ctx, okx, y, w, h, 10, "#f6f7fb");
        strokeRR(ctx, okx + 0.5, y + 0.5, w - 1, h - 1, 10, "#3a4466", 1.5);
        text(ctx, "1 2 3", okx + 40, y + h / 2 + 2, { font: sans(60, 600), color: REBECCA, baseline: "middle" });
        check(ctx, okx + w - 50, y + h / 2, 46, C.ok, prog(t, S.word(2, "sees") - 0.1, 0.45));
        text(ctx, "what the paint shows", okx + w / 2, y + h + 34, { font: sans(24, 600), color: C.text3, align: "center", baseline: "middle", alpha: prog(t, S.word(2, "sees") - 0.1, 0.4) });
      });
    }

    // ---- complete: updateComplete is __updatePromise; a test awaits it
    const cu = prog(t, T.complete - 0.1, 0.45);
    if (cu > 0) {
      const tp = codePanel(ctx, { x: 80, y: 660 + 12 * (1 - cu), src: TEST_SRC, size: 30, lineHeight: 1.4, title: "a test", alpha: cu,
        hl: [{ line: 3, u: prog(t, W(2, "update") - 0.1, 0.4) }] });
      const r3 = tp.lineRect(3);
      const vu = prog(t, W(2, "tests") - 0.1, 0.4);
      text(ctx, "→", r3.x + r3.w + 28, r3.y + r3.h / 2, { font: sans(32, 500), color: C.text3, baseline: "middle", alpha: vu });
      text(ctx, String(B.updateCompleteResolvedTo), r3.x + r3.w + 74, r3.y + r3.h / 2 + 1, { font: mono(32, 650), color: SYN.keyword, baseline: "middle", alpha: vu });
      const ux = 900;
      const uu = prog(t, W(2, "is") - 0.3, 0.45);
      const up = codePanel(ctx, { x: ux, y: 660 + 12 * (1 - uu), src: UC_SRC, size: 30, lineHeight: 1.4, title: "reactive-element.js", alpha: uu,
        hl: [{ line: 1, u: prog(t, W(2, "that") - 0.2, 0.4), color: C.accent }] });
      // this.__updatePromise: the promise __enqueueUpdate() returned, settled when the update finishes
      const pu = prog(t, W(2, "same") - 0.1, 0.5);
      if (pu > 0) {
        const c = up.code;
        void c;
        const r = up.lineRect(1);
        arrow(ctx, { x: r.x + r.w + 18, y: r.y + r.h / 2 - 4 }, { x: BLK[1].x + BLK[1].w - 50, y: BLK_Y + BLK_H + 6 },
          { color: C.accent, width: 3, progress: pu, bend: -30, head: 12, glow: 0.5 });
      }
    }
  });
}
