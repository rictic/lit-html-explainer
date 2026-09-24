// events: addEventListener takes any object with handleEvent as the listener
// (P0a); lit-html's EventPart registers itself and calls whatever function it
// holds, so three renders with three new arrow functions make one
// addEventListener call and a click runs the third (P0b); and lit-html passes
// your listener as the options argument too, so `once: true` on the listener
// object works: two clicks, one call (P1).
//
// Framings:
//   P0a (listener…handle)  an event binding -> the DOM call, centred; the call
//                          moves up; two listeners: a function, an object
//                          with handleEvent
//   P0b (part…free)        under the call, what the EventPart passes; the
//                          example's renders, the <button> and its event
//                          listener list, the EventPart, the calls array
//   P1 (options…props)     the options argument gets newListener; then the
//                          `once` example
//
// Data: truth/platform.json `events` (3 renders with new functions -> 1
// addEventListener call; the click ran "third"; once: 2 clicks -> 1 call).
// The example code is the capture's (truth/platform.js). The EventPart's call
// is cache/lit-html.ts's
//   this.element.addEventListener(this.name, this, newListener as EventListenerWithOptions)
// shown as its three arguments under the DOM call's three parameters.

import { platformTruth } from "../timing.js";
import { B, C, DOMC, SYN, rgba } from "../kit/theme.js";
import { card, cells } from "../kit/objects.js";
import { arrow, check, chip, cross, fillRR, measure, mono, sans, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { Code } from "../kit/code.js";
import { cursor } from "../kit/browser.js";
import { clamp, ease, lerp, prog, pulse, window } from "../util.js";
import { PLAT, at, curve, drawPoly, packet, platCall, platPanel, platformTag, sLink, vLink } from "./clone-kit.js";

export const transition = "fade";

const PINK = B[2];               // the click handler: event binding, EventPart, listener

// ------------------------------------------------------------------ data

// The capture's code (truth/platform.js), line for line.
const VIEW_SRC = `const view = (fn) => html\`<button @click=\${fn}>go</button>\`;
render(view(() => calls.push("first")), box);
render(view(() => calls.push("second")), box);
render(view(() => calls.push("third")), box);
box.querySelector("button").click();`;
// The capture's once example: one statement, broken across lines.
const ONCE_SRC = `render(html\`<button @click=\${{
  handleEvent: () => onceCalls++,
  once: true
}}>go</button>\`, once);`;
const CS = 28;                   // code size

let D = null;
function data() {
  if (D) return D;
  const E = platformTruth().events;
  const view = new Code(VIEW_SRC, { size: CS });
  const fns = [1, 2, 3].map((line) => {
    const s = view.lines[line];
    const a = s.indexOf("() =>"), b = s.lastIndexOf("), box");
    return { line, col: a, len: b - a, text: s.slice(a, b) };
  });
  D = {
    E,
    view,
    once: new Code(ONCE_SRC, { size: CS }),
    fns,                                               // the three arrow functions, as written
    fnCode: fns.map((f) => new Code(f.text, { size: CS })),
    fnObj: new Code("{ handleEvent: …, once: true }", { size: CS }),
    binding: new Code(VIEW_SRC.split("\n")[0].slice(VIEW_SRC.indexOf("html`"), -1), { size: 44 }),
    listenerFn: new Code("(event) => { … }", { size: 42 }),
    listenerObj: new Code("{ handleEvent(event) { … } }", { size: 42 }),
    browserCalls: new Code("listener.handleEvent(event)", { size: 34 }),
  };
  return D;
}

// ------------------------------------------------------------------ timing

let TT = null;
function times(S) {
  if (TT && TT.start === S.start) return TT;
  const T = {
    start: S.start, end: S.end,
    listener: S.m("listener"), feature: S.word(0, "feature"), easy: S.word(0, "easy"),
    object: S.m("object"), doesnt: S.word(0, "doesn't"), handle: S.m("handle"), handleW: S.word(0, "handle"),
    part: S.m("part"), registers: S.word(0, "registers"), itself: S.word(0, "itself"),
    calls: S.m("calls"), whichever: S.word(0, "whichever"),
    free: S.m("free"), newW: S.word(0, "new"), never: S.word(0, "never"),
    options: S.m("options"), pass: S.m("pass"), your: S.word(1, "your"),
    props: S.m("props"), capture: S.word(1, "capture"), onceW: S.word(1, "once"), passive: S.word(1, "passive"),
    properties: S.word(1, "properties"),
  };
  T.up = T.object - 0.45;                          // the call moves up to the top
  // the example: three renders, then the click. Render 1: the part calls
  // addEventListener, then stores the function (_$setValue's order).
  T.reg = T.registers - 0.25;                      // the part registers itself (render 1)
  T.r = [T.reg - 0.1, T.itself + 0.35, T.calls + 0.3];
  T.click = T.whichever + 0.15;                    // the click; "third" lands on "right now"
  // the once example
  T.reset = T.props - 0.35;
  T.clicks = [T.properties - 0.35, T.properties + 0.75];
  TT = T;
  return T;
}

// ------------------------------------------------------------------ layout

const SIG = { x: 960, y0: 430, y: 40, k0: 1.25, size: 44 };
const ARGS_Y = 196;                       // the args row (centre)
const CODEP = { x: 60, y: 334, w: 1090 };
const BTN = { x: 60, y: 676, w: 590, h: 346 };
const PART = { x: 706, y: 694, w: 860, size: CS };
const RES = { x: 1628, y: 750 };

// ------------------------------------------------------------------ draw

export function draw(F, S) {
  const { ctx, t } = F;
  const d = data();
  const T = times(S);
  const enter = prog(t, T.start - 0.35, 0.6, ease.outCubic);

  // ---------------------------------------------------------- the DOM call
  const m = prog(t, T.up, 0.8);
  const sy = lerp(SIG.y0, SIG.y, m), k = lerp(SIG.k0, 1, m);
  const chipH = SIG.size * 2;                     // (the shared chip: code height + 0.55 size)
  const cy = sy + chipH / 2;
  let sig = null;
  withScale(ctx, k, SIG.x, cy, () => {
    sig = platCall(ctx, {
      x: SIG.x, y: sy, size: SIG.size, align: "center", alpha: enter, reveal: prog(t, T.listener - 0.05, 0.8, ease.linear),
      glow: Math.max(0.5 * pulse(t, T.listener + 0.5, 1.2), 0.8 * pulse(t, T.reg + 0.1, 1.1), 0.6 * pulse(t, T.reset + 0.35, 1.0)),
      code: "addEventListener(type, listener, options)",
      marks: { fn: "addEventListener", type: "type", listener: "listener", options: "options" },
      ring: {
        fn: window(t, T.feature - 0.2, T.up, 0.3, 0.4),
        listener: window(t, T.object - 0.15, T.part - 0.3, 0.3, 0.4),
        options: window(t, T.options - 0.15, T.props + 0.5, 0.3, 0.4),
      },
      hl: {
        listener: window(t, T.registers - 0.35, T.options - 0.2, 0.4, 0.4) * 0.8,
        options: window(t, T.pass - 0.1, T.end + 1, 0.4, 0.4) * 0.8,
      },
      hlColor: { listener: PINK, options: PINK },
      ringColor: { fn: PLAT, listener: PLAT, options: PLAT },
    });
  });
  // the chip's pieces on screen (scaled about its centre)
  const tf = (r) => ({ x: SIG.x + (r.x - SIG.x) * k, y: cy + (r.y - cy) * k, w: r.w * k, h: r.h * k, cx: SIG.x + (r.cx - SIG.x) * k, cy: cy + (r.cy - cy) * k });
  const keys = Object.fromEntries(Object.entries(sig.keys).map(([key, r]) => [key, tf(r)]));
  const bottom = cy + (chipH / 2) * k;

  drawBinding(ctx, t, d, T, keys, sy + (1 - k) * chipH / 2);
  drawListeners(ctx, t, d, T, keys, bottom);
  drawArgs(ctx, t, d, T, keys, bottom);
  drawExample(ctx, t, d, T, keys);
}

// ------------------------------------------------ P0a: the binding, the call

function drawBinding(ctx, t, d, T, keys, chipTop) {
  const u = prog(t, T.start - 0.2, 0.5) * (1 - prog(t, T.up - 0.2, 0.4));
  if (u <= 0.001) return;
  const c = d.binding;
  const w = c.width(ctx);
  const x = 960 - w / 2, y = 196;
  const b = c.bindings[0];
  const r0 = c.rect(ctx, x, y, b.start.line, b.start.col, b.end.col - b.start.col);
  // the @click attribute and its binding
  const at0 = c.find("@click");
  const ra = c.rect(ctx, x, y, at0.line, at0.col, b.end.col - at0.col);
  withAlpha(ctx, u, () => {
    text(ctx, "an event binding", 960, y - 40, { font: sans(28, 600), color: C.text3, align: "center", baseline: "middle" });
    fillRR(ctx, ra.x - 8, ra.y - 2, ra.w + 16, ra.h + 4, 9, rgba(PINK, 0.14));
    c.draw(ctx, x, y, { style: (tok) => (tok.bind || (tok.line === at0.line && tok.col >= at0.col && tok.col < b.start.col) ? { color: PINK } : null) });
    const au = prog(t, T.listener + 0.35, 0.6);
    arrow(ctx, { x: ra.x + ra.w / 2, y: ra.y + ra.h + 12 }, { x: keys.fn.cx, y: chipTop - 14 }, { color: PINK, width: 3, bend: -30, progress: au, head: 13 });
    void r0;
  });
}

// ------------------------------------------------ P0a: function or object

function drawListeners(ctx, t, d, T, keys, bottom) {
  const out = 1 - prog(t, T.part - 0.4, 0.45);
  if (out <= 0.001) return;
  const L = keys.listener;
  const top = { x: L.cx, y: bottom + 6 };
  const y = 470;
  const items = [
    { code: d.listenerFn, label: "a function", cx: 500, u: prog(t, T.object + 0.1, 0.45, ease.outBack), dim: prog(t, T.handle - 0.35, 0.5), t0: T.object + 0.1 },
    { code: d.listenerObj, label: "any object with handleEvent", cx: 1310, u: prog(t, T.handle - 0.1, 0.45, ease.outBack), dim: 0, t0: T.handle - 0.1 },
  ];
  withAlpha(ctx, out, () => {
    items.forEach((it, i) => {
      if (it.u <= 0) return;
      const c = it.code;
      const w = c.width(ctx) + 84, h = c.height + 50;
      const x = it.cx - w / 2;
      const a = clamp(it.u) * lerp(1, 0.38, it.dim);
      const Pl = vLink(top, { x: it.cx, y: y - 70 });
      drawPoly(ctx, Pl, { color: i === 1 ? PLAT : C.text3, width: 3, to: prog(t, it.t0, 0.5), head: 12, alpha: a });
      withAlpha(ctx, a, () => {
        text(ctx, it.label, it.cx, y - 40, { font: sans(30, 600), color: i === 1 ? C.text : C.text2, align: "center", baseline: "middle" });
        withScale(ctx, lerp(0.85, 1, clamp(it.u)), it.cx, y + h / 2, () => {
          fillRR(ctx, x, y, w, h, 16, C.panel2);
          strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 16, i === 1 ? rgba(PLAT, 0.55) : C.border2, 1.5);
          if (i === 1) {
            const f = c.find("handleEvent");
            const r = c.rect(ctx, x + 42, y + 25, f.line, f.col, f.len);
            const hu = window(t, T.handleW - 0.25, T.part - 0.3, 0.3, 0.4);
            if (hu > 0) withAlpha(ctx, hu, () => withGlow(ctx, rgba(PLAT, 0.8), 14, () => fillRR(ctx, r.x - 6, r.y - 2, r.w + 12, r.h + 4, 8, rgba(PLAT, 0.3))));
          }
          c.draw(ctx, x + 42, y + 25);
        });
      });
    });
    // how the browser calls an object listener
    const cu = prog(t, T.handleW + 0.45, 0.45);
    if (cu > 0) {
      const yy = y + 214;
      withAlpha(ctx, cu, () => {
        platformTag(ctx, { x: 1310, y: yy - 22, h: 44, text: "the browser calls", align: "center" });
        const cc = d.browserCalls;
        const cx = 1310 - cc.width(ctx) / 2;
        const f = cc.find("handleEvent");
        const r = cc.rect(ctx, cx, yy + 44, f.line, f.col, f.len);
        fillRR(ctx, r.x - 5, r.y - 2, r.w + 10, r.h + 4, 8, rgba(PLAT, 0.16));
        cc.draw(ctx, cx, yy + 44);
      });
    }
  });
}

// ------------------------------------------------ what the EventPart passes

function drawArgs(ctx, t, d, T, keys, bottom) {
  const inA = prog(t, T.part - 0.1, 0.45);
  if (inA <= 0.001) return;
  const args = [
    { key: "type", s: "this.name", color: C.text, u: inA, sub: "'click'", t0: T.part - 0.1 },
    { key: "listener", s: "this", color: PINK, u: prog(t, T.registers - 0.35, 0.45), sub: "the EventPart", t0: T.registers - 0.35 },
    { key: "options", s: "newListener", color: PINK, u: prog(t, T.pass - 0.15, 0.45), sub: "your listener", t0: T.pass - 0.15 },
  ];
  const f = mono(34, 600);
  text(ctx, "EventPart passes", keys.type.x - 150, ARGS_Y + 1, { font: sans(27, 650), color: PINK, align: "right", baseline: "middle", alpha: inA * 0.95 });
  for (const a of args) {
    if (a.u <= 0) continue;
    const p = keys[a.key];
    const w = measure(ctx, a.s, f) + 34, h = 58;
    const x = p.cx - w / 2, y = ARGS_Y - h / 2;
    withAlpha(ctx, clamp(a.u), () => {
      ctx.save();
      ctx.strokeStyle = rgba(a.color, 0.6);
      ctx.lineWidth = 2.5;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(p.cx, bottom + 4);
      ctx.lineTo(p.cx, y - 4);
      ctx.stroke();
      ctx.restore();
      const g = a.key === "listener" ? pulse(t, T.itself - 0.2, 1.2) : a.key === "options" ? pulse(t, T.your - 0.2, 1.2) : 0;
      withScale(ctx, lerp(0.85, 1, ease.outBack(clamp(a.u))), p.cx, ARGS_Y, () => {
        fillRR(ctx, x, y, w, h, 12, a.color === PINK ? rgba(PINK, 0.12) : C.panel2);
        strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 12, a.color === PINK ? rgba(PINK, 0.6) : C.border2, 1.5);
        if (g > 0) withAlpha(ctx, g, () => withGlow(ctx, rgba(a.color, 0.9), 18, () => strokeRR(ctx, x, y, w, h, 12, a.color, 2.5)));
        text(ctx, a.s, p.cx, ARGS_Y + 1, { font: f, color: a.color, align: "center", baseline: "middle" });
      });
      const str = a.sub.startsWith("'");
      text(ctx, a.sub, p.cx, y + h + 22, { font: str ? mono(25, 500) : sans(24, 550), color: str ? SYN.string : C.text2, align: "center", baseline: "middle" });
    });
  }
}

// ------------------------------------------------ P0b and P1: the example

function drawExample(ctx, t, d, T, keys) {
  const inU = prog(t, T.part - 0.25, 0.5, ease.outCubic);
  if (inU <= 0.001) return;
  const E = d.E;
  const reset = prog(t, T.reset, 0.5);            // the once example replaces the first
  const firstA = 1 - reset;
  const onceA = prog(t, T.reset + 0.3, 0.45);

  // ------------------------------------------------ the code
  const codeX = CODEP.x + 40, codeY = CODEP.y + 56 + 14;
  const codeDim = 1 - 0.6 * prog(t, T.options - 0.2, 0.5);
  const panelH = (c) => 56 + 14 + c.height + 18;
  withAlpha(ctx, inU, () => {
    const h = lerp(panelH(d.view), panelH(d.once), reset);
    codePanel(ctx, CODEP.x, CODEP.y, CODEP.w, h, "example", lerp(codeDim, 1, onceA));
    const cur = currentLine(t, T);
    withAlpha(ctx, firstA * codeDim, () => {
      if (cur >= 0) {
        const r = d.view.rect(ctx, codeX, codeY, cur, 0, d.view.lines[cur].length);
        fillRR(ctx, r.x - 10, r.y, r.w + 20, r.h, 8, rgba(C.accent, 0.13));
        fillRR(ctx, r.x - 10, r.y, 4, r.h, 2, C.accent);
      }
      d.view.draw(ctx, codeX, codeY, { style: (tok) => (tok.bind || isFnTok(d, tok) ? { color: PINK } : null) });
    });
    withAlpha(ctx, onceA, () => {
      const f = d.once.find("once: true");
      const hu = window(t, T.onceW - 0.25, T.end + 1, 0.3, 0.4);
      if (hu > 0) {
        const r = d.once.rect(ctx, codeX, codeY, f.line, f.col, f.len);
        withAlpha(ctx, hu, () => fillRR(ctx, r.x - 6, r.y, r.w + 12, r.h, 8, rgba(PINK, 0.22)));
      }
      d.once.draw(ctx, codeX, codeY, { style: (tok) => (tok.bind ? { color: PINK } : null) });
    });
  });

  // ------------------------------------------------ the button and its listener list
  const listGlow = window(t, T.never - 0.15, T.options - 0.2, 0.35, 0.5);
  withAlpha(ctx, inU, () => platPanel(ctx, { x: BTN.x, y: BTN.y, w: BTN.w, h: BTN.h, title: "<button>", titleFont: mono(26, 600), sub: "EventTarget", glow: listGlow }));
  const bt = { x: BTN.x + 44, y: BTN.y + 82, w: 150, h: 64 };
  const clickTs = [T.click, ...T.clicks];
  const press = Math.max(...clickTs.map((c) => pulse(t, c - 0.1, 0.3)));
  withAlpha(ctx, inU, () => {
    goButton(ctx, bt, press);
    text(ctx, "event listener list", BTN.x + 30, BTN.y + 192, { font: sans(24, 600), color: C.text3, baseline: "middle" });
  });
  // the entry: added by render 1; a new part's entry for the once example,
  // which the browser removes when it dispatches the first click
  const entryR = { x: BTN.x + 26, y: BTN.y + 222, w: BTN.w - 52, h: 66 };
  const e1 = prog(t, T.reg + 0.35, 0.35) * firstA;
  const e2 = prog(t, T.reset + 0.45, 0.35);
  const removed = prog(t, T.clicks[0] + 0.28, 0.4);
  const entryA = Math.max(e1, e2 * (1 - removed));
  withAlpha(ctx, inU, () => {
    const emptyA = 1 - clamp(entryA * 4);
    if (emptyA > 0) text(ctx, "(empty)", entryR.x + entryR.w / 2, entryR.y + entryR.h / 2 + 1, { font: sans(24, 450, "italic"), color: C.text4, align: "center", baseline: "middle", alpha: emptyA });
    if (entryA > 0.001) {
      withAlpha(ctx, entryA, () => {
        const g = Math.max(listGlow, pulse(t, T.reg + 0.5, 1.0), 0.8 * pulse(t, T.reset + 0.6, 1.0));
        fillRR(ctx, entryR.x, entryR.y, entryR.w, entryR.h, 12, rgba(PINK, 0.08 + 0.08 * g));
        strokeRR(ctx, entryR.x + 0.5, entryR.y + 0.5, entryR.w - 1, entryR.h - 1, 12, rgba(PINK, 0.4 + 0.5 * g), 1.5);
        const my = entryR.y + entryR.h / 2 + 1;
        let x = entryR.x + 20;
        x += text(ctx, "'click'", x, my, { font: mono(28, 500), color: SYN.string, baseline: "middle" });
        x += text(ctx, "  →  ", x, my, { font: sans(26, 500), color: C.text3, baseline: "middle" });
        text(ctx, "EventPart", x, my, { font: mono(28, 650), color: PINK, baseline: "middle" });
        if (reset > 0.5) text(ctx, "once", entryR.x + entryR.w - 20, my, { font: mono(26, 650), color: C.text, baseline: "middle", align: "right" });
      });
    }
    // clicks (once example)
    const ku = prog(t, T.clicks[0] - 0.1, 0.3);
    if (ku > 0) {
      const n = clickTs.slice(1).filter((c) => t >= c).length;
      withAlpha(ctx, ku, () => {
        const w = text(ctx, "clicks: ", BTN.x + 30, BTN.y + BTN.h - 34, { font: mono(26, 500), color: C.text2, baseline: "middle" });
        text(ctx, String(Math.min(n, E.onceOption.clicks)), BTN.x + 30 + w, BTN.y + BTN.h - 34, { font: mono(30, 750), color: C.white, baseline: "middle" });
      });
    }
  });

  // ------------------------------------------------ the EventPart
  const partGlow = Math.max(pulse(t, T.reg, 1.2), pulse(t, T.click + 0.55, 1.0), pulse(t, T.clicks[0] + 0.5, 1.0));
  const keyW = measure(ctx, "_$committedValue:", mono(PART.size, 450));
  const passHl = window(t, T.pass, T.props - 0.4, 0.4, 0.4);
  let kc = null;
  withAlpha(ctx, inU, () => {
    const rows = (hl) => [
      { k: "element", v: "<button>", vColor: DOMC.tag },
      { k: "name", v: "'click'", vColor: SYN.string },
      { k: "_$committedValue", v: "", vColor: PINK, hl },
    ];
    kc = card(ctx, { x: PART.x, y: PART.y, w: PART.w, title: "EventPart", color: PINK, size: PART.size, keyW, glow: partGlow * firstA, alpha: firstA, rows: rows(Math.max(pulse(t, T.click + 0.6, 0.9), passHl)) });
    if (onceA > 0) kc = card(ctx, { x: PART.x, y: PART.y, w: PART.w, title: "EventPart", color: PINK, size: PART.size, keyW, glow: Math.max(partGlow, 0.7 * pulse(t, T.reset + 0.4, 1.0)), alpha: onceA, rows: rows(pulse(t, T.clicks[0] + 0.6, 0.9)) });
  });
  const vr = kc.row(2);
  const valX = PART.x + 20 + keyW + 14, valY = vr.y + vr.h / 2;
  withAlpha(ctx, inU, () => {
    withAlpha(ctx, firstA, () => {
      // the old value clears as the new one arrives (the flight lands at r + 0.55)
      const nothingA = 1 - prog(t, T.r[0] + 0.3, 0.2);
      if (nothingA > 0) text(ctx, "nothing", valX, valY + 1, { font: mono(PART.size, 500), color: C.text3, baseline: "middle", alpha: nothingA });
      d.fnCode.forEach((c, i) => {
        const a = (t >= T.r[i] + 0.55 ? 1 : 0) * (1 - (i < 2 ? prog(t, T.r[i + 1] + 0.3, 0.2) : 0));
        if (a > 0) c.draw(ctx, valX, valY - c.lh / 2, { alpha: a, style: () => ({ color: PINK }) });
      });
    });
    withAlpha(ctx, onceA, () => d.fnObj.draw(ctx, valX, valY - d.fnObj.lh / 2, { style: () => ({ color: PINK }) }));
  });

  // renders: each new function travels from its line into _$committedValue
  d.fns.forEach((fn, i) => {
    const u = prog(t, T.r[i], 0.55, ease.inOutCubic);
    if (u <= 0 || u >= 1) return;
    const r = d.view.rect(ctx, codeX, codeY, fn.line, fn.col, fn.len);
    const a = { x: r.x, y: r.y + r.h / 2 };
    const b = { x: valX, y: valY };
    const Pl = curve(a, { x: a.x + 260, y: a.y + 60 }, { x: b.x - 60, y: b.y - 170 }, b);
    const p = at(Pl, u);
    withAlpha(ctx, clamp(u * 5), () => d.fnCode[i].draw(ctx, p.x, p.y - d.fnCode[i].lh / 2, { style: () => ({ color: PINK }) }));
  });

  // registration: the part adds itself to the button's list
  const regLink = () => {
    const a = { x: PART.x - 8, y: PART.y + 23 };
    const b = { x: entryR.x + entryR.w + 8, y: entryR.y + entryR.h / 2 };
    return curve(a, { x: a.x - 40, y: a.y }, { x: b.x + 70, y: b.y }, b);
  };
  const regU = prog(t, T.reg, 0.55);
  if (regU > 0 && firstA > 0.001) {
    const Pl = regLink();
    const la = firstA * (1 - prog(t, T.click - 0.3, 0.4)) * inU;
    drawPoly(ctx, Pl, { color: PINK, width: 3.5, to: regU, head: 13, alpha: la, glow: 0.5 });
  }
  if (onceA > 0.001) {
    const Pl = regLink();
    drawPoly(ctx, Pl, { color: PINK, width: 3.5, to: prog(t, T.reset + 0.25, 0.5), head: 13, alpha: onceA * (1 - prog(t, T.clicks[0] - 0.4, 0.4)), glow: 0.5 });
  }

  // clicks: the dispatch reaches the listener, then the part, then the function
  const btnC = { x: bt.x + bt.w / 2, y: bt.y + bt.h };
  const toEntry = vLink(btnC, { x: btnC.x, y: entryR.y });
  const toPart = sLink({ x: entryR.x + entryR.w, y: entryR.y + entryR.h / 2 + 10 }, { x: PART.x - 6, y: valY }, 0.5);
  const toRes = sLink({ x: PART.x + PART.w + 6, y: valY }, { x: RES.x - 16, y: RES.y + 32 }, 0.5);
  const flow = (tc, blocked = false) => {
    packet(ctx, toEntry, prog(t, tc, 0.25, ease.linear), PINK);
    if (blocked) return;
    packet(ctx, toPart, prog(t, tc + 0.25, 0.35, ease.linear), PINK);
    packet(ctx, toRes, prog(t, tc + 0.65, 0.35, ease.linear), PINK);
  };
  flow(T.click);
  flow(T.clicks[0]);
  flow(T.clicks[1], true);
  // the second once-click finds no listener
  const miss = pulse(t, T.clicks[1] + 0.2, 0.8);
  if (miss > 0) cross(ctx, btnC.x, entryR.y + entryR.h / 2, 30, C.text3, clamp(miss * 2));
  // where the dispatch lands: the part's handleEvent
  const hu = Math.max(window(t, T.click + 0.2, T.click + 1.6, 0.25, 0.4), window(t, T.clicks[0] + 0.2, T.clicks[0] + 1.4, 0.25, 0.4));
  if (hu > 0) chip(ctx, { x: PART.x + 18, y: PART.y + kc.h + 16, h: 44, text: "part.handleEvent(event)", font: mono(26, 600), color: PINK, bg: rgba(PINK, 0.12), border: rgba(PINK, 0.6), alpha: hu });

  // cursor
  const curA = Math.max(window(t, T.click - 0.8, T.click + 0.7, 0.3, 0.4), window(t, T.clicks[0] - 0.8, T.clicks[1] + 0.6, 0.3, 0.4));
  if (curA > 0) cursor(ctx, bt.x + bt.w * 0.62, bt.y + bt.h * 0.55, { press, alpha: curA, ripple: Math.max(...clickTs.map((c) => (t < c + 0.45 ? prog(t, c - 0.05, 0.5, ease.linear) : 0))) });

  // ------------------------------------------------ results
  withAlpha(ctx, inU, () => {
    withAlpha(ctx, firstA, () => {
      text(ctx, "calls", RES.x, RES.y - 38, { font: mono(28, 550), color: C.text2, baseline: "middle" });
      const got = prog(t, T.click + 0.95, 0.35);
      if (got > 0) cells(ctx, { x: RES.x, y: RES.y, items: E.calledOnClick.map((s) => ({ text: JSON.stringify(s), color: SYN.string, hl: pulse(t, T.click + 0.95, 1.0) })), size: 28, alpha: got });
      else text(ctx, "[]", RES.x, RES.y + 28, { font: mono(34, 400), color: C.text3, baseline: "middle" });
    });
    withAlpha(ctx, onceA, () => {
      text(ctx, "onceCalls", RES.x, RES.y - 38, { font: mono(28, 550), color: C.text2, baseline: "middle" });
      const n = t >= T.clicks[0] + 1.0 ? E.onceOption.calls : 0;
      const g = pulse(t, T.clicks[0] + 1.0, 1.0);
      withScale(ctx, 1 + 0.2 * g, RES.x + 30, RES.y + 30, () => text(ctx, String(n), RES.x + 4, RES.y + 30, { font: mono(56, 700), color: n ? C.white : C.text3, baseline: "middle" }));
      const doneU = prog(t, T.clicks[1] + 0.55, 0.4);
      if (doneU > 0) withAlpha(ctx, doneU, () => {
        text(ctx, `${E.onceOption.clicks} clicks,`, RES.x, RES.y + 116, { font: sans(32, 650), color: C.text, baseline: "middle" });
        text(ctx, `${E.onceOption.calls} call`, RES.x, RES.y + 160, { font: sans(32, 650), color: PINK, baseline: "middle" });
      });
    });
  });

  // ------------------------------------------------ free: 3 renders, 1 registration
  const fu = window(t, T.free - 0.1, T.options - 0.1, 0.4, 0.4);
  if (fu > 0) {
    const x = CODEP.x + CODEP.w + 56, y = CODEP.y + 64;
    withAlpha(ctx, fu, () => {
      const f = sans(34, 650);
      text(ctx, `${E.rendersWithNewFunctions} renders,`, x, y, { font: f, color: C.text, baseline: "middle" });
      text(ctx, `${E.rendersWithNewFunctions} new functions`, x, y + 50, { font: f, color: PINK, baseline: "middle", alpha: prog(t, T.newW - 0.1, 0.4) });
      const u2 = prog(t, T.never - 0.15, 0.4);
      const s = `${E.addEventListenerCalls} addEventListener call`;
      text(ctx, s, x, y + 124, { font: f, color: C.text, baseline: "middle", alpha: u2 });
      check(ctx, x + measure(ctx, s, f) + 36, y + 124, 32, C.ok, prog(t, T.never + 0.2, 0.4));
    });
  }

  // ------------------------------------------------ pass: your listener is newListener
  const pu = prog(t, T.pass + 0.2, 0.6) * inU;
  if (pu > 0) {
    const p = keys.options;
    const a = { x: p.cx + 118, y: ARGS_Y };
    const b = { x: PART.x + PART.w + 6, y: valY - 8 };
    const Pl = curve(a, { x: a.x + 120, y: a.y + 40 }, { x: b.x + 150, y: b.y - 260 }, b);
    drawPoly(ctx, Pl, { color: PINK, width: 3, to: pu, head: 12, alpha: 0.75 * (1 - prog(t, T.clicks[0] - 0.5, 0.4)), dash: [8, 7] });
  }

  // ------------------------------------------------ props: capture, once, passive
  drawOptionProps(ctx, t, T, keys);
}

// capture / once / passive, the options the browser reads, under `newListener`.
function drawOptionProps(ctx, t, T, keys) {
  const u = prog(t, T.capture - 0.2, 0.4);
  if (u <= 0) return;
  const p = keys.options;
  const names = [["capture", T.capture], ["once", T.onceW], ["passive", T.passive]];
  const f = mono(26, 600);
  const ws = names.map(([n]) => measure(ctx, n, f) + 28);
  const total = ws.reduce((a, b) => a + b, 0) + 14 * (names.length - 1);
  let x = Math.min(p.cx - total / 2, 1860 - total);
  const y = ARGS_Y + 78;
  names.forEach(([n, tn], i) => {
    const a = prog(t, tn - 0.2, 0.35, ease.outBack);
    const lit = n === "once" ? window(t, tn - 0.2, T.end + 1, 0.3, 0.4) : window(t, tn - 0.2, tn + 0.9, 0.3, 0.4);
    if (a > 0) {
      withScale(ctx, lerp(0.8, 1, clamp(a)), x + ws[i] / 2, y + 21, () =>
        chip(ctx, { x, y, h: 42, text: n, font: f, color: lit > 0.5 ? C.white : C.text2, bg: rgba(PLAT, 0.06 + 0.16 * lit), border: rgba(PLAT, 0.35 + 0.55 * lit), glow: lit * 0.6, alpha: clamp(a) }));
    }
    x += ws[i] + 14;
  });
}

// ------------------------------------------------------------------ pieces

// A code panel (Lit / user code): the kit panel look with a title.
function codePanel(ctx, x, y, w, h, title, dim = 1) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  fillRR(ctx, x, y, w, h, 16, C.panel);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 16);
  ctx.clip();
  ctx.fillStyle = C.panel2;
  ctx.fillRect(x, y, w, 56);
  ctx.fillStyle = C.border;
  ctx.fillRect(x, y + 55, w, 1);
  ctx.restore();
  fillRR(ctx, x + 20, y + 22, 12, 12, 6, SYN.fn);
  text(ctx, title, x + 44, y + 29, { font: sans(26, 650), color: C.text2, baseline: "middle", alpha: dim });
  strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 16, C.border, 1.5);
}

// A page button, like the kit's counter app's.
function goButton(ctx, r, press) {
  const k = 1 - 0.05 * press;
  withScale(ctx, k, r.x + r.w / 2, r.y + r.h / 2, () => {
    fillRR(ctx, r.x, r.y, r.w, r.h, 12, press > 0.5 ? "#d9dde8" : "#e8ebf3");
    strokeRR(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 12, "#aab2c8", 2);
    text(ctx, "go", r.x + r.w / 2, r.y + r.h / 2 + 2, { font: sans(30, 600), color: "#1c2233", align: "center", baseline: "middle" });
  });
}

// Which line of the example is running: -1 none, 1..3 the renders, 4 the click.
function currentLine(t, T) {
  if (t < T.part - 0.1) return -1;
  if (t < T.r[1] - 0.2) return 1;
  if (t < T.r[2] - 0.2) return 2;
  if (t < T.click - 0.25) return 3;
  if (t < T.free) return 4;
  return -1;
}
function isFnTok(d, tok) {
  const f = d.fns.find((x) => x.line === tok.line);
  return !!f && tok.col >= f.col && tok.col < f.col + f.len;
}
