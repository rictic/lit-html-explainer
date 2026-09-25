// components: Lit adds components, and they're the platform too.
//
//   lit … platform      lit-html and Lit's ReactiveElement, each standing on
//                       platform features. The component layer's four (custom
//                       elements, shadow DOM, constructable stylesheets,
//                       microtasks) fly up to become the scene's topic row,
//                       which batching carries on.
//   custom … reactive   XCounter (the class truth/platform.js ran) and
//                       customElements.define; the browser's lifecycle
//                       callbacks, one lane each; ReactiveElement's
//                       observedAttributes (truth) and what it does in each callback.
//   shadow … norewrite  a page with <my-element>: its shadow root (open,
//                       truth), styles scoped both ways, a slot, no class-name
//                       rewriting, no global stylesheet.
//   sheets … cachekey   XCounter's css`` -> CSSResult -> one CSSStyleSheet;
//                       two instances adopt the same sheet (truth), then a
//                       thousand; cssTagCache (truth cssCache), keyed by the
//                       strings array, in episode 1's cache-table look.

import { platformTruth } from "../timing.js";
import { C, DOMC, SYN, blend, rgba } from "../kit/theme.js";
import { arrow, check, cross, fillRR, measure, mono, panel, ring, sans, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { browserWindow } from "../kit/browser.js";
import { card } from "../kit/objects.js";
import { OBJ, cacheTable } from "../kit/lit.js";
import { clamp, ease, lerp, mix, prog, pulse, window } from "../util.js";
import {
  LITC, PLAT, TOPICS, TOPIC_FONT, TOPIC_H, apiChip, browserGlyph, code, codePanel, cssLines, drawCode, flowChips, htmlOf,
  htmlSegs, platBox, platChip, sheetIcon, strikeThrough, stringsGlyph, tag, topicSlots,
} from "./components-kit.js";

export const transition = "fade";

export function draw(F, S) {
  const { ctx, t } = F;
  const P = platformTruth().components;
  const T = {};
  for (const k of ["lit", "adds", "platform", "custom", "define", "callbacks", "reactive", "shadow", "root", "scoped", "slots",
    "norewrite", "sheets", "css", "adopted", "thousand", "sametrick", "cachekey"]) T[k] = S.m(k);

  drawIntro(ctx, t, S, T);
  drawTopics(ctx, t, T);
  const aCustom = window(t, T.custom - 0.25, T.shadow - 0.45, 0.45, 0.4);
  if (aCustom > 0) drawCustom(ctx, t, S, T, P, aCustom);
  const aShadow = window(t, T.shadow - 0.1, T.sheets - 0.45, 0.45, 0.4);
  if (aShadow > 0) drawShadow(ctx, t, S, T, P, aShadow);
  const aSheets = prog(t, T.sheets - 0.1, 0.45);
  if (aSheets > 0) drawSheets(ctx, t, S, T, P, aSheets);
}

// ================================================================== intro

const LE = { x: 660, y: 92, w: 600, h: 84 };
const RE = { x: 80, y: 262, w: 820, h: 176 };
const LH = { x: 1020, y: 262, w: 820, h: 176 };
const RULE_Y = 520;
// What the episode has shown lit-html getting from the browser so far.
const LH_ITEMS = [
  { label: "Tagged templates", font: sans(28, 650) },
  { label: "HTML parser", font: sans(28, 650) },
  { label: "<template>", font: mono(27, 550) },
  { label: "importNode", font: mono(27, 550) },
  { label: "TreeWalker", font: mono(27, 550) },
  { label: "Comments", font: sans(28, 650) },
  { label: "Listener objects", font: sans(28, 650) },
];

let INTRO = null;
function introLayout(ctx) {
  if (INTRO) return INTRO;
  INTRO = {
    re: flowChips(ctx, TOPICS.map((label) => ({ label, font: TOPIC_FONT })), RE.x + 16, RULE_Y + 50, RE.w - 32, { h: TOPIC_H }),
    lh: flowChips(ctx, LH_ITEMS, LH.x + 16, RULE_Y + 50, LH.w - 32, { h: TOPIC_H }),
  };
  return INTRO;
}

function layerBlock(ctx, r, title, sub, { alpha = 1, glow = 0, titleFont = sans(46, 700) } = {}) {
  withAlpha(ctx, alpha, () => {
    panel(ctx, { ...r, accent: LITC, glow, r: 18 });
    fillRR(ctx, r.x, r.y, r.w, r.h, 18, rgba(LITC, 0.07));
    strokeRR(ctx, r.x + 0.75, r.y + 0.75, r.w - 1.5, r.h - 1.5, 18, rgba(LITC, 0.6), 1.5);
    text(ctx, title, r.x + r.w / 2, r.y + r.h / 2 - (sub ? 18 : 0), { font: titleFont, color: C.text, align: "center", baseline: "middle" });
    if (sub) text(ctx, sub, r.x + r.w / 2, r.y + r.h / 2 + 36, { font: sans(28, 500), color: C.text2, align: "center", baseline: "middle" });
  });
}

function drawIntro(ctx, t, S, T) {
  const out = prog(t, T.custom - 0.55, 0.45);
  if (out >= 1) return;
  const L = introLayout(ctx);
  withAlpha(ctx, 1 - out, () => {
    // lit-html, and what it gets from the browser (everything so far): centred,
    // then moving over when ReactiveElement arrives
    const lhIn = prog(t, S.start - 0.2, 0.5, ease.outCubic);
    const dim = lerp(1, 0.45, prog(t, T.platform - 0.1, 0.5));
    const dx = lerp(960 - LH.w / 2 - LH.x, 0, prog(t, T.adds - 0.35, 0.75));
    withAlpha(ctx, dim, () => {
      layerBlock(ctx, { ...LH, x: LH.x + dx }, "lit-html", "templates", { alpha: lhIn, glow: 0.7 * pulse(t, T.lit + 1.3, 1.3) });
      LH_ITEMS.forEach((it, i) => {
        const u = prog(t, T.lit + 0.2 + 0.08 * i, 0.4, ease.outBack);
        if (u <= 0) return;
        const r = L.lh[i];
        platChip(ctx, { x: r.x + dx, y: r.y, label: it.label, font: it.font, h: TOPIC_H, active: 0.8, alpha: clamp(u), scale: lerp(0.75, 1, u) });
      });
    });

    // the browser: a rule under both columns
    const ru = prog(t, T.lit, 0.7);
    if (ru > 0) {
      ctx.save();
      ctx.fillStyle = rgba(PLAT, 0.45);
      const w = 1760 * ru;
      ctx.fillRect(960 - w / 2, RULE_Y, w, 2);
      ctx.restore();
      platChip(ctx, { x: 960, y: RULE_Y - 20, label: "the browser", font: sans(22, 650), h: 40, align: "center", active: 1, alpha: prog(t, T.lit + 0.2, 0.4) });
    }

    // Lit adds ReactiveElement, and LitElement on top of both
    const reU = prog(t, T.adds - 0.2, 0.45, ease.outBack);
    if (reU > 0) {
      withScale(ctx, lerp(0.85, 1, reU), RE.x + RE.w / 2, RE.y + RE.h / 2, () =>
        layerBlock(ctx, RE, "ReactiveElement", "components", { alpha: clamp(reU), glow: 0.8 * pulse(t, T.adds + 0.25, 1.3) }));
    }
    const leU = prog(t, T.adds + 0.45, 0.45, ease.outBack);
    if (leU > 0) {
      withScale(ctx, lerp(0.85, 1, leU), LE.x + LE.w / 2, LE.y + LE.h / 2, () =>
        layerBlock(ctx, LE, "LitElement", null, { alpha: clamp(leU), titleFont: sans(40, 700) }));
      const cu = prog(t, T.adds + 0.7, 0.5);
      const f = mono(24, 500);
      const a0 = { x: LE.x + 150, y: LE.y + LE.h + 4 }, a1 = { x: RE.x + RE.w / 2 + 120, y: RE.y - 8 };
      const b0 = { x: LE.x + LE.w - 150, y: LE.y + LE.h + 4 }, b1 = { x: LH.x + LH.w / 2 - 120, y: LH.y - 8 };
      arrow(ctx, a0, a1, { color: rgba(LITC, 0.8), width: 2.5, progress: cu, head: 11 });
      arrow(ctx, b0, b1, { color: rgba(LITC, 0.8), width: 2.5, progress: cu, head: 11 });
      text(ctx, "extends", (a0.x + a1.x) / 2 - 20, (a0.y + a1.y) / 2, { font: f, color: C.text2, align: "right", baseline: "middle", alpha: cu });
      text(ctx, "render()", (b0.x + b1.x) / 2 + 20, (b0.y + b1.y) / 2, { font: f, color: C.text2, baseline: "middle", alpha: cu });
    }
  });
}

// The four platform chips: under ReactiveElement in the intro, then flying up
// to the top as the scene's topic row.
function drawTopics(ctx, t, T) {
  const L = introLayout(ctx);
  const slots = topicSlots(ctx);
  const w = [
    1 - prog(t, T.shadow - 0.3, 0.45),
    Math.min(prog(t, T.shadow - 0.3, 0.45), 1 - prog(t, T.sheets - 0.3, 0.45)),
    prog(t, T.sheets - 0.3, 0.45),
    0,
  ];
  TOPICS.forEach((label, i) => {
    const appear = prog(t, T.platform - 0.15 + 0.13 * i, 0.45, ease.outBack);
    if (appear <= 0) return;
    const fly = prog(t, T.custom - 0.6 + 0.1 * i, 0.75);
    const p = mix(L.re[i], slots[i], fly);
    const active = lerp(1, w[i], fly);
    const glow = lerp(0.3 + 0.6 * pulse(t, T.platform + 0.13 * i, 1.1), 0.55 * w[i], fly);
    platChip(ctx, { x: p.x, y: p.y, label, font: TOPIC_FONT, h: TOPIC_H, active, glow, alpha: clamp(appear), scale: lerp(0.7, 1, appear) });
  });
}

// ========================================================= custom elements

// XCounter as truth/platform.js defined it (minus its render counter; styles
// listed first here, so the arrows from `properties` have a clear path).
const XC_SRC = `class XCounter extends LitElement {
  static styles = css\`:host { display: block; color: rebeccapurple; }\`;
  static properties = { a: {}, b: {}, c: {} };
  render() {
    return html\`\${this.a} \${this.b} \${this.c}\`;
  }
}
customElements.define('x-counter', XCounter);`;

const XC = { x: 80, y: 132, size: 28, lh: 1.45 };
const REG = { x: 1390, y: 206, w: 450, h: 282 };
const LANE_Y = [676, 786, 896];
const COL_B = 740, COL_C = 1540;
const LANES = [
  { trigger: "document.createElement('x-counter')", callback: "constructor()", lit: "requestUpdate()" },
  { trigger: "document.body.append(el)", callback: "connectedCallback()", lit: "createRenderRoot()" },
  { trigger: "el.setAttribute('a', '1')", callback: "attributeChangedCallback('a', null, '1')", lit: "this.a = '1'" },
];

function drawCustom(ctx, t, S, T, P, a) {
  withAlpha(ctx, a, () => {
    // ---- the class and its definition
    const inU = prog(t, T.custom + 0.05, 0.5, ease.outCubic);
    const defU = window(t, T.define - 0.15, T.callbacks + 0.8, 0.35, 0.5);
    const propU = window(t, T.reactive - 0.15, T.shadow, 0.4, 0.4);
    const tagU = pulse(t, S.word(1, "tag") - 0.15, 1.1), classU = pulse(t, S.word(1, "class") - 0.15, 1.1);
    const cp = codePanel(ctx, {
      x: XC.x, y: XC.y + 14 * (1 - inU), src: XC_SRC, size: XC.size, lineHeight: XC.lh, title: "x-counter.js", alpha: inU,
      hl: [{ line: 7, u: defU, color: PLAT }, { line: 2, u: propU, color: LITC }],
    });
    const c = cp.code;
    // "a class for a tag name": the two halves of define()
    const tagR = c.rect(ctx, cp.cx, cp.cy, 7, c.lines[7].indexOf("'x-counter'"), 11);
    const clsR = c.rect(ctx, cp.cx, cp.cy, 7, c.lines[7].indexOf("XCounter"), 8);
    ring(ctx, { ...tagR, color: SYN.string, u: tagU, pad: 4, r: 6, width: 2.5 });
    ring(ctx, { ...clsR, color: C.text, u: classU, pad: 4, r: 6, width: 2.5 });

    // ---- the registry: the browser's record of the definition
    const regU = prog(t, T.define + 0.45, 0.45, ease.outBack);
    const r1y = REG.y + 48 + 46, r2y = REG.y + 48 + 128;
    if (regU > 0) {
      const defLine = cp.lineRect(7);
      arrow(ctx, { x: defLine.x + defLine.w + 16, y: defLine.y + defLine.h / 2 }, { x: REG.x - 12, y: r1y },
        { color: PLAT, width: 2.5, bend: 70, progress: prog(t, T.define + 0.2, 0.55) });
      withScale(ctx, lerp(0.9, 1, regU), REG.x + REG.w / 2, REG.y + 60, () => {
        platBox(ctx, { ...REG, title: "customElements", alpha: clamp(regU) });
        withAlpha(ctx, clamp(regU), () => {
          const f = mono(30, 550);
          let x = REG.x + 28;
          x += text(ctx, "'x-counter'", x, r1y, { font: f, color: SYN.string, baseline: "middle" });
          x += text(ctx, " → ", x, r1y, { font: sans(30, 500), color: C.text3, baseline: "middle" });
          text(ctx, "XCounter", x, r1y, { font: f, color: C.text, baseline: "middle" });
        });
      });
    }
    // observedAttributes: derived by ReactiveElement from `static properties` (truth)
    const obsA = prog(t, T.reactive + 0.35, 0.5);
    if (obsA > 0) {
      const pl = cp.lineRect(2);
      arrow(ctx, { x: pl.x + pl.w + 16, y: pl.y + pl.h / 2 }, { x: REG.x - 12, y: r2y + 22 },
        { color: LITC, width: 2.5, bend: -40, progress: prog(t, T.reactive + 0.1, 0.55) });
      text(ctx, "observedAttributes", REG.x + 28, r2y, { font: mono(23, 500), color: C.text3, baseline: "middle", alpha: obsA });
      const v = `[${P.observedAttributes.map((s) => `'${s}'`).join(", ")}]`;
      const vu = prog(t, T.reactive + 0.7, 0.4);
      withGlow(ctx, rgba(LITC, 0.6 * pulse(t, T.reactive + 0.7, 1.2)), 16, () =>
        text(ctx, v, REG.x + 28, r2y + 48, { font: mono(30, 550), color: C.text, baseline: "middle", alpha: vu }));
    }

    // ---- the browser calls back: one lane per callback
    const headU = prog(t, T.callbacks - 0.1, 0.4);
    const hy = 612;
    text(ctx, "the page", 80, hy, { font: sans(24, 600), color: C.text3, baseline: "middle", alpha: headU });
    withAlpha(ctx, headU, () => {
      browserGlyph(ctx, COL_B, hy - 10, 26, PLAT);
      text(ctx, "the browser calls", COL_B + 38, hy, { font: sans(24, 600), color: PLAT, baseline: "middle" });
    });
    const litHead = prog(t, T.reactive + 1.0, 0.4);
    text(ctx, "ReactiveElement", COL_C, hy, { font: sans(24, 650), color: LITC, baseline: "middle", alpha: litHead });

    const times = [
      { trig: S.word(1, "when") - 0.2, call: S.word(1, "created") - 0.15 },
      { trig: S.word(1, "created") + 0.4, call: S.word(1, "connected") - 0.1 },
      { trig: S.word(1, "attribute") - 0.45, call: S.word(1, "changes") - 0.15 },
    ];
    const litT = [T.reactive + 1.25, T.reactive + 1.6, S.word(1, "callbacks") - 0.1];
    LANES.forEach((ln, k) => {
      const y = LANE_Y[k];
      const tu = prog(t, times[k].trig, 0.4);
      if (tu <= 0) return;
      const tc = drawCode(ctx, ln.trigger, 80 + 10 * (1 - tu), y - code(ln.trigger, 28, 1.3).lh / 2, { size: 28, lineHeight: 1.3, alpha: tu });
      const tw = tc.width(ctx);
      const au = prog(t, times[k].trig + 0.3, times[k].call - times[k].trig - 0.2);
      arrow(ctx, { x: 80 + tw + 14, y }, { x: COL_B - 10, y }, { color: PLAT, width: 2.5, progress: au, head: 10 });
      const cu = prog(t, times[k].call, 0.4, ease.outBack);
      if (cu <= 0) return;
      const chipH = 54;
      const lit = pulse(t, times[k].call + 0.1, 1.2);
      const ch = apiChip(ctx, { x: COL_B, y: y - chipH / 2, src: ln.callback, size: 28, h: chipH, alpha: clamp(cu), glow: 0.9 * lit });
      // what ReactiveElement does in it
      const lu = prog(t, litT[k], 0.45);
      if (lu > 0) {
        arrow(ctx, { x: ch.x + ch.w + 10, y }, { x: COL_C - 10, y }, { color: rgba(LITC, 0.9), width: 2.5, progress: prog(t, litT[k] - 0.15, 0.35), head: 10 });
        const lc = code(ln.lit, 26, 1.3);
        drawCode(ctx, ln.lit, COL_C + 12 * (1 - lu), y - lc.lh / 2, { size: 26, lineHeight: 1.3, alpha: lu });
      }
    });
    // the attribute became a property, and setting a property requests an update
    const ru = prog(t, S.word(1, "reactive", 1) - 0.2, 0.45);
    if (ru > 0) {
      const y = LANE_Y[2] + 44;
      text(ctx, "→ requestUpdate()", COL_C + 12 * (1 - ru), y, { font: mono(24, 500), color: LITC, baseline: "middle", alpha: ru });
    }
  });
}

// ============================================================== shadow DOM

const DOC = { x: 80, y: 136, w: 1170 };
const SHB = { x: 166, w: 1044, h: 290 };
const PREVIEW = { x: 1300, y: 136, w: 550, h: 430 };
const ROW = 32; // DOM rows' font size
const TOMATO = "#ff6347", REBECCA = "#663399";

// A CSS rule as a small stylesheet chip: sheet glyph, rule text, colour swatch.
function ruleChip(ctx, { x, y, sel, prop, value, swatch, alpha = 1, glow = 0, size = 26, dashed = false, dim = false }) {
  const f = mono(size, 500);
  const segs = [
    { text: sel, color: SYN.tag }, { text: " { ", color: SYN.punct }, { text: prop, color: DOMC.attr }, { text: ": ", color: SYN.punct },
    { text: value, color: DOMC.value }, { text: "; }", color: SYN.punct },
  ];
  const str = segs.map((s) => s.text).join("");
  const h = Math.round(size * 1.85);
  const w = 18 + 20 + 14 + measure(ctx, str, f) + 16 + 22 + 16;
  withAlpha(ctx, alpha, () => {
    if (glow > 0) withGlow(ctx, rgba(PLAT, 0.8 * glow), 24 * glow, () => fillRR(ctx, x, y, w, h, 10, C.panel2));
    else fillRR(ctx, x, y, w, h, 10, dashed ? "rgba(0,0,0,0)" : C.panel2);
    ctx.save();
    if (dashed) ctx.setLineDash([7, 6]);
    strokeRR(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 10, rgba(PLAT, dashed ? 0.4 : 0.5 + 0.4 * glow), 1.5);
    ctx.restore();
    miniSheet(ctx, x + 18, y + h / 2 - 12, 20, 24, dim ? C.text3 : PLAT);
    let cx = x + 18 + 20 + 14;
    for (const s of segs) cx += text(ctx, s.text, cx, y + h / 2 + 1, { font: f, color: dim ? C.text3 : s.color, baseline: "middle" });
    fillRR(ctx, cx + 16, y + h / 2 - 11, 22, 22, 5, swatch);
    strokeRR(ctx, cx + 16, y + h / 2 - 11, 22, 22, 5, "rgba(255,255,255,0.5)", 1.2);
  });
  return { x, y, w, h };
}

function miniSheet(ctx, x, y, w, h, color) {
  const f = w * 0.35;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - f, y);
  ctx.lineTo(x + w, y + f);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = color;
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 4, y + h * 0.45 + i * 4.5, w - 8, 1.6);
  ctx.restore();
}

function drawShadow(ctx, t, S, T, P, a) {
  withAlpha(ctx, a, () => {
    const inU = prog(t, T.shadow + 0.05, 0.5, ease.outCubic);
    const open = prog(t, T.root - 0.05, 0.75);
    const shh = SHB.h * open;
    const y0 = DOC.y + 48;
    const Y = { styles: y0 + 50, h1: y0 + 146, host: y0 + 226 };
    const shY = Y.host + 42;
    Y.hello = shY + shh + (open > 0 ? 64 : 20);
    Y.close = Y.hello + 80;
    const docH = Y.close + 52 - DOC.y;
    const rowX = DOC.x + 44, kidX = SHB.x + 4;

    // ---- the page's DOM, as a scope diagram
    platBox(ctx, { x: DOC.x, y: DOC.y + 12 * (1 - inU), w: DOC.w, h: docH, title: "document", titleFont: sans(24, 600), alpha: inU });
    const pageRule = ruleChip(ctx, { x: rowX - 4, y: Y.styles - 26, sel: ".title", prop: "color", value: "tomato", swatch: TOMATO, alpha: inU, size: 28 });
    const h1Segs = htmlOf('<h1 class="title">Welcome</h1>');
    const h1 = htmlSegs(ctx, h1Segs, rowX, Y.h1, { size: ROW, alpha: inU });
    htmlSegs(ctx, htmlOf("<my-element>"), rowX, Y.host, { size: ROW, alpha: inU });
    const helloSeg = htmlSegs(ctx, [{ text: '"Hello"', role: "text" }], kidX, Y.hello, { size: ROW, alpha: inU })[0];
    htmlSegs(ctx, htmlOf("</my-element>"), rowX, Y.close, { size: ROW, alpha: inU });

    // ---- its shadow root: createRenderRoot() -> attachShadow({mode: 'open'})
    let pRow = null, elRule = null;
    const pSegs = htmlOf('<p class="title"><slot></slot></p>');
    if (open > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(SHB.x - 30, shY - 30, SHB.w + 60, shh + 40);
      ctx.clip();
      platBox(ctx, { x: SHB.x, y: shY, w: SHB.w, h: Math.max(48, shh), title: `#shadow-root (${P.shadowMode})`, titleFont: mono(26, 550),
        glow: 0.8 * pulse(t, T.root + 0.5, 1.4), dashed: true });
      elRule = ruleChip(ctx, { x: SHB.x + 30, y: shY + 48 + 30, sel: ".title", prop: "color", value: "rebeccapurple", swatch: REBECCA, size: 28,
        glow: window(t, S.word(2, "global") - 0.1, T.sheets, 0.3, 0.3) });
      // render() put the root part's marker first (renderBefore is null: no <style> elements)
      htmlSegs(ctx, [{ text: "<!---->", role: "comment" }], SHB.x + 34, shY + 48 + 118, { size: ROW, alpha: 0.7 });
      pRow = htmlSegs(ctx, pSegs, SHB.x + 34, shY + 48 + 172, { size: ROW });
      ctx.restore();
    }

    // ---- the page, rendered
    const pv = browserWindow(ctx, { ...PREVIEW, y: PREVIEW.y + 12 * (1 - inU), alpha: inU, url: "localhost:8000" });
    const helloF = sans(44, 500);
    withAlpha(ctx, inU, () => {
      text(ctx, "Welcome", pv.x + 40, pv.y + 100, { font: sans(60, 700), color: TOMATO });
      text(ctx, "Hello", pv.x + 40, pv.y + 210, { font: helloF, color: open > 0.5 ? REBECCA : "#1c2233" });
    });
    const helloR = { x: pv.x + 40, y: pv.y + 172, w: measure(ctx, "Hello", helloF), h: 50 };
    ring(ctx, { ...helloR, color: C.accent, u: window(t, T.slots + 0.4, T.norewrite, 0.3, 0.4), pad: 9, r: 9 });

    // createRenderRoot() calls attachShadow with shadowRootOptions: {mode: 'open'} (truth: open)
    const au = prog(t, T.root + 0.2, 0.45);
    if (au > 0) {
      const ay = PREVIEW.y + PREVIEW.h + 70;
      text(ctx, "createRenderRoot()", PREVIEW.x, ay, { font: mono(26, 500), color: LITC, baseline: "middle", alpha: au });
      apiChip(ctx, { x: PREVIEW.x, y: ay + 26, src: `attachShadow({mode: '${P.shadowMode}'})`, size: 28, alpha: au, glow: 0.8 * pulse(t, T.root + 0.3, 1.2) });
      const ru = prog(t, S.word(2, "root,") - 0.1, 0.4);
      const ry = ay + 26 + 56 + 58;
      check(ctx, PREVIEW.x + 14, ry, 28, C.ok, ru);
      text(ctx, P.renderRootIsShadowRoot ? "renderRoot === shadowRoot" : "renderRoot !== shadowRoot", PREVIEW.x + 42, ry + 1,
        { font: mono(28, 500), color: C.text, baseline: "middle", alpha: ru });
    }

    if (!pRow || !elRule) return;
    const h1Attr = attrRectOf(h1Segs, h1, "class"), pAttr = attrRectOf(pSegs, pRow, "class");
    const h1End = h1.at(-1).x + h1.at(-1).w, pEnd = pRow.at(-1).x + pRow.at(-1).w;

    // ---- scoped: each rule reaches its own tree, and stops at the boundary
    const sc = [0.35, 0.95, 1.5, 2.1].map((d) => prog(t, T.scoped + d, 0.45));
    const scA = (1 - 0.55 * prog(t, T.slots - 0.1, 0.4)) * (1 - prog(t, T.norewrite - 0.25, 0.4));
    withAlpha(ctx, scA, () => {
      // page rule -> <h1 class="title">: applies
      arrow(ctx, { x: pageRule.x + 150, y: pageRule.y + pageRule.h + 4 }, { x: h1Attr.x + h1Attr.w / 2, y: h1Attr.y - 4 },
        { color: C.text2, width: 2.5, progress: sc[0], bend: -24, head: 10 });
      check(ctx, h1End + 36, Y.h1, 30, C.ok, prog(t, T.scoped + 0.7, 0.4));
      // page rule -> into the shadow tree: stopped at its boundary
      const bx0 = SHB.x + SHB.w - 330, bx1 = SHB.x + SHB.w - 120;
      arrow(ctx, { x: pageRule.x + pageRule.w + 10, y: pageRule.y + pageRule.h / 2 }, { x: bx0, y: shY - 9 },
        { color: C.text2, width: 2.5, progress: sc[1], bend: -70, head: 10 });
      blocked(ctx, bx0, shY, -1, prog(t, T.scoped + 1.35, 0.35));
      // element rule -> <p class="title">: applies
      arrow(ctx, { x: elRule.x + 330, y: elRule.y + elRule.h + 4 }, { x: pAttr.x + pAttr.w / 2 + 40, y: pAttr.y - 4 },
        { color: C.text2, width: 2.5, progress: sc[2], bend: -16, head: 10 });
      check(ctx, pEnd + 36, pAttr.y + pAttr.h / 2, 30, C.ok, prog(t, T.scoped + 1.85, 0.4));
      // element rule -> out to the page: stopped at the same boundary
      arrow(ctx, { x: elRule.x + elRule.w + 10, y: elRule.y + elRule.h / 2 }, { x: bx1, y: shY + 9 },
        { color: C.text2, width: 2.5, progress: sc[3], bend: 40, head: 10 });
      blocked(ctx, bx1, shY, 1, prog(t, T.scoped + 2.45, 0.35));
    });

    // ---- slots: the child the page passed in renders at the <slot>
    const si = pSegs.findIndex((sg, i) => sg.text === "slot" && pSegs[i - 1]?.text === "<");
    const slotSeg = pRow[si - 1];
    const slotR = { x: slotSeg.x, y: slotSeg.y, w: measure(ctx, "<slot></slot>", mono(ROW, 450)), h: slotSeg.h };
    const su = prog(t, T.slots - 0.1, 0.6) * (1 - prog(t, T.norewrite - 0.25, 0.4));
    if (su > 0) {
      const s0 = { x: helloSeg.x + helloSeg.w + 12, y: Y.hello - 6 }, s1 = { x: slotR.x + slotR.w / 2, y: slotR.y + slotR.h + 6 };
      arrow(ctx, s0, s1, { color: C.accent, width: 3, progress: prog(t, T.slots - 0.1, 0.6), bend: 50, head: 12, glow: 0.6, alpha: su > 0 ? clamp(su * 3) * (1 - prog(t, T.norewrite - 0.25, 0.4)) : 0 });
      ring(ctx, { ...slotR, color: C.accent, u: window(t, T.slots + 0.4, T.norewrite, 0.3, 0.4), pad: 4, r: 6, width: 2.5 });
      ring(ctx, { ...helloSeg, color: C.accent, u: window(t, T.slots + 0.1, T.norewrite, 0.3, 0.4), pad: 4, r: 6, width: 2.5 });
    }

    // ---- no class-name rewriting: the same `title`, twice, as written
    const nr = window(t, T.norewrite + 0.05, T.sheets, 0.35, 0.3);
    ring(ctx, { ...h1Attr, color: C.accent, u: nr, pad: 4, r: 6, width: 2.5 });
    ring(ctx, { ...pAttr, color: C.accent, u: nr, pad: 4, r: 6, width: 2.5 });
    const gu = prog(t, S.word(2, "name") - 0.1, 0.4);
    if (gu > 0) {
      const gf = mono(24, 500), gs = 'class="title_x7f3a"';
      const gx = pEnd + 40, gy = pAttr.y + pAttr.h / 2, g = measure(ctx, gs, gf);
      withAlpha(ctx, gu, () => {
        ctx.save();
        ctx.setLineDash([6, 6]);
        strokeRR(ctx, gx - 12, gy - 21, g + 24, 42, 8, rgba(C.text3, 0.8), 1.5);
        ctx.restore();
        text(ctx, gs, gx, gy + 1, { font: gf, color: C.text3, baseline: "middle" });
      });
      strikeThrough(ctx, { x: gx, y: gy - 14, w: g, h: 28 }, prog(t, S.word(2, "rewriting,") - 0.05, 0.4), C.bad, 3);
    }
    // ...and no global stylesheet: the element's rule needn't go in the page's
    const glU = prog(t, S.word(2, "global") - 0.2, 0.4);
    if (glU > 0) {
      const gr = ruleChip(ctx, { x: pageRule.x + pageRule.w + 24, y: pageRule.y + 4, sel: ".title", prop: "color", value: "rebeccapurple", swatch: REBECCA,
        alpha: glU, dashed: true, dim: true, size: 24 });
      strikeThrough(ctx, { x: gr.x + 8, y: gr.y + 2, w: gr.w - 16, h: gr.h - 4 }, prog(t, S.word(2, "stylesheet") - 0.05, 0.45), C.bad, 3);
    }
  });
}

// The rect of attribute `name` (name through closing quote): htmlOf segments + their htmlSegs rects.
function attrRectOf(segs, rects, name) {
  const idx = segs.map((s, i) => (s.attr === name ? i : -1)).filter((i) => i >= 0);
  const r0 = rects[idx[0]], r1 = rects[idx.at(-1)];
  return { x: r0.x, y: r0.y, w: r1.x + r1.w - r0.x, h: r0.h };
}

// A "stopped here" mark: a red bar on the boundary at (x, y), and a cross on
// the side the arrow came from (side -1: above, 1: below).
function blocked(ctx, x, y, side, u) {
  if (u <= 0) return;
  withAlpha(ctx, u, () => {
    ctx.save();
    ctx.fillStyle = C.bad;
    ctx.fillRect(x - 22, y - 2.5, 44, 5);
    ctx.restore();
  });
  cross(ctx, x + 40, y + side * 22, 24, C.bad, u);
}

// ================================================== constructable stylesheets

const STYLES_SRC = "static styles = css`:host { display: block; color: rebeccapurple; }`;";
const GETTER_SRC = `get styleSheet() {
  …
  (this._styleSheet = styleSheet = new CSSStyleSheet())
      .replaceSync(this.cssText);
  …
}`;
const ADOPT_SRC = `renderRoot.adoptedStyleSheets = styles.map((s) =>
    s instanceof CSSStyleSheet ? s : s.styleSheet);`;
const SHEET = { x: 1300, y: 250, w: 480, h: 320 };
const INST = [{ x: 80, y: 244 }, { x: 80, y: 480 }];
const INST_W = 700, INST_H = 200;
const GRID = { x: 80, y: 136, w: 1100, h: 880, cols: 40, rows: 25 };

const SHEETOF_SRC = "const sheetOf = () => css`p { margin: 0; }`;";
const CACHE_SRC = `const cacheable = strings !== undefined && strings.length === 1;
if (cacheable) {
  styleSheet = cssTagCache.get(strings);
}`;

function drawSheets(ctx, t, S, T, P, a) {
  withAlpha(ctx, a, () => {
    const outCrowd = prog(t, T.sametrick - 0.35, 0.4);
    const d123 = 1 - outCrowd;
    if (d123 > 0) withAlpha(ctx, d123, () => drawSheetsMain(ctx, t, S, T, P));
    const d4 = prog(t, T.sametrick - 0.1, 0.45);
    if (d4 > 0) drawCssCache(ctx, t, S, T, P, d4);
  });
}

function sheetPort() {
  return { x: SHEET.x - 6, y: SHEET.y + SHEET.h / 2 };
}

function drawSheetsMain(ctx, t, S, T, P) {
  const cssWord = S.word(3, "css"), become = S.word(3, "become"), one = S.word(3, "one");
  // ---- XCounter's styles: css`...` -> a CSSResult
  const lineU = prog(t, T.sheets + 0.25, 0.5) * (1 - prog(t, T.thousand - 0.35, 0.4));
  const lineDim = lerp(1, 0.5, prog(t, T.adopted - 0.2, 0.5));
  const sc = code(STYLES_SRC, 30, 1.3);
  const sx = 80, sy = 136;
  withAlpha(ctx, lineU * lineDim, () => {
    const cssCol = STYLES_SRC.indexOf("css`");
    const r = sc.rect(ctx, sx, sy, 0, cssCol, 3);
    fillRR(ctx, r.x - 4, r.y - 2, r.w + 8, r.h + 4, 6, rgba(OBJ.result, 0.25 * window(t, cssWord - 0.15, T.adopted, 0.3, 0.4)));
    drawCode(ctx, STYLES_SRC, sx, sy, { size: 30, lineHeight: 1.3 });
  });

  const d1 = 1 - prog(t, T.adopted - 0.3, 0.4);
  if (d1 > 0) {
    withAlpha(ctx, d1, () => {
      const cu = prog(t, cssWord + 0.15, 0.45, ease.outBack);
      let cardG = null;
      if (cu > 0) {
        withScale(ctx, lerp(0.9, 1, cu), 80, 250, () => {
          cardG = card(ctx, {
            x: 80, y: 240, title: "CSSResult", color: OBJ.result, size: 26, alpha: clamp(cu),
            rows: [
              { k: "cssText", v: "':host { display: block; color: rebeccapurple; }'", vColor: SYN.string },
              { k: "styleSheet", v: "(a getter)", vColor: C.text3, port: true },
            ],
          });
        });
        const cssCol = STYLES_SRC.indexOf("css`");
        const r = sc.rect(ctx, sx, sy, 0, cssCol, 3);
        arrow(ctx, { x: r.x + r.w / 2, y: r.y + r.h + 4 }, { x: r.x + r.w / 2, y: 232 }, { color: rgba(OBJ.result, 0.9), width: 2.5, progress: prog(t, cssWord, 0.3), head: 10 });
      }
      // its styleSheet getter: one new CSSStyleSheet, parsed with replaceSync
      const gu = prog(t, become - 0.15, 0.45);
      if (gu > 0) {
        const gp = codePanel(ctx, {
          x: 80, y: 456 + 12 * (1 - gu), src: GETTER_SRC, size: 30, lineHeight: 1.45, title: "css-tag.js · CSSResult", alpha: gu,
          hl: [{ line: 2, u: prog(t, one - 0.2, 0.4), color: PLAT }, { line: 3, u: prog(t, one + 0.3, 0.4), color: PLAT }],
        });
        if (cardG) {
          const p = cardG.ports.styleSheet;
          arrow(ctx, { x: p.x + 12, y: p.y }, { x: gp.x + gp.w - 40, y: gp.y - 6 }, { color: rgba(OBJ.result, 0.8), width: 2.5, progress: prog(t, become, 0.4), bend: -30, head: 10 });
        }
        const nc = gp.code.lines[2].indexOf("new CSSStyleSheet()");
        const nr = gp.code.rect(ctx, gp.cx, gp.cy, 2, nc, 19);
        arrow(ctx, { x: nr.x + nr.w + 14, y: nr.y + nr.h / 2 }, sheetPort(), { color: PLAT, width: 2.5, progress: prog(t, one - 0.1, 0.5), bend: -40, head: 11 });
      }
    });
  }

  // ---- the CSSStyleSheet: one object
  const shU = prog(t, one - 0.05, 0.5, ease.outBack);
  const glow = Math.max(pulse(t, one + 0.1, 1.4), 0.9 * window(t, T.thousand + 1.4, T.sametrick, 0.5, 0.4));
  if (shU > 0) {
    withScale(ctx, lerp(0.85, 1, shU), SHEET.x + SHEET.w / 2, SHEET.y + SHEET.h / 2, () => {
      withAlpha(ctx, clamp(shU), () => {
        browserGlyph(ctx, SHEET.x, SHEET.y - 42, 28, PLAT);
        text(ctx, "CSSStyleSheet", SHEET.x + 40, SHEET.y - 30, { font: mono(30, 600), color: PLAT, baseline: "middle" });
        sheetIcon(ctx, { ...SHEET, glow, size: 30, lines: cssLines(":host", [["display", "block"], ["color", "rebeccapurple"]]) });
      });
    });
  }

  // ---- adoptedStyleSheets: every instance's shadow root holds the same sheet
  const toCrowd = prog(t, T.thousand - 0.45, 0.7);
  const boxOut = prog(t, T.thousand + 0.05, 0.2);
  const every = S.word(3, "every");
  const ports = [];
  INST.forEach((p, k) => {
    const u = prog(t, T.adopted + 0.05 + 0.2 * k, 0.45, ease.outBack);
    if (u <= 0) return;
    const cell = gridCell(k);
    const r = mix({ x: p.x, y: p.y, w: INST_W, h: INST_H }, cell, toCrowd);
    if (boxOut < 1) {
      withAlpha(ctx, clamp(u) * (1 - boxOut), () => {
        const port = instanceBox(ctx, r, P, glowOf(t, T, k));
        ports.push(port);
      });
    }
    if (boxOut > 0) crowdGlyph(ctx, cell, boxOut);
  });
  const arrowsU = [0, 1].map((k) => prog(t, every - 0.1 + 0.15 * k, 0.5));
  ports.forEach((port, k) => {
    arrow(ctx, port, sheetPort(), { color: PLAT, width: 2.5, progress: arrowsU[k], bend: k === 0 ? -20 : 70, head: 11, alpha: 1 - boxOut });
  });
  // truth: the same object; no <style> elements
  const tu = prog(t, S.word(3, "adopted") + 0.2, 0.4) * (1 - prog(t, T.thousand - 0.35, 0.4));
  if (tu > 0) {
    const ty = SHEET.y + SHEET.h + 52;
    check(ctx, SHEET.x + 14, ty, 26, C.ok, tu);
    text(ctx, P.sharedSheet ? "same object in both" : "different objects", SHEET.x + 42, ty + 1, { font: sans(28, 600), color: C.text, baseline: "middle", alpha: tu });
    const tu2 = prog(t, S.word(3, "sheets.", 0) - 0.1, 0.4) * (1 - prog(t, T.thousand - 0.35, 0.4));
    text(ctx, `<style> elements: ${P.styleElements}`, SHEET.x + 42, ty + 52, { font: mono(26, 500), color: C.text2, baseline: "middle", alpha: tu2 });
  }
  // adoptStyles(), where Lit hands the sheets over
  const adU = prog(t, S.word(3, "through") - 0.15, 0.45) * (1 - prog(t, T.thousand - 0.35, 0.4));
  if (adU > 0) {
    codePanel(ctx, { x: 80, y: 760 + 12 * (1 - adU), src: ADOPT_SRC, size: 28, lineHeight: 1.45, title: "css-tag.js · adoptStyles()", alpha: adU,
      hl: [{ line: 0, u: prog(t, S.word(3, "adopted") - 0.1, 0.4), color: PLAT, col: 0, len: "renderRoot.adoptedStyleSheets".length }] });
  }

  // ---- a thousand instances, one parsed stylesheet
  const crowdU = prog(t, T.thousand - 0.1, 0.01);
  if (crowdU > 0) drawCrowd(ctx, t, S, T);
}

function glowOf(t, T, k) {
  return pulse(t, T.adopted + 0.2 * k, 1.0);
}

// An XCounter instance: the host, its shadow root, and adoptedStyleSheets.
// Returns the port (the sheet reference) for arrows.
function instanceBox(ctx, r, P, glow) {
  const k = r.w / INST_W;
  ctx.save();
  ctx.translate(r.x, r.y);
  ctx.scale(k, r.h / INST_H);
  panel(ctx, { x: 0, y: 0, w: INST_W, h: INST_H, accent: DOMC.tag, glow: 0 });
  htmlSegs(ctx, htmlOf("<x-counter>"), 22, 34, { size: 28 });
  platBox(ctx, { x: 22, y: 64, w: INST_W - 44, h: INST_H - 84, title: `#shadow-root (${P.shadowMode})`, titleFont: mono(22, 550), head: 42, glow, dashed: true });
  const f = mono(26, 500);
  const ry = 64 + 42 + 38;
  let x = 44;
  x += text(ctx, "adoptedStyleSheets: [", x, ry, { font: f, color: SYN.prop, baseline: "middle" });
  const px = x + 16;
  ctx.beginPath();
  ctx.arc(px, ry, 8, 0, Math.PI * 2);
  ctx.fillStyle = PLAT;
  ctx.fill();
  text(ctx, "]", px + 16, ry, { font: f, color: SYN.prop, baseline: "middle" });
  ctx.restore();
  return { x: r.x + px * k, y: r.y + ry * (r.h / INST_H) };
}

function gridCell(i) {
  const cw = GRID.w / GRID.cols, ch = GRID.h / GRID.rows;
  const c = i % GRID.cols, r = Math.floor(i / GRID.cols);
  return { x: GRID.x + c * cw + (cw - 20) / 2, y: GRID.y + r * ch + (ch - 24) / 2, w: 20, h: 24 };
}

function crowdGlyph(ctx, g, u, alpha = 1) {
  if (u <= 0) return;
  withAlpha(ctx, clamp(u) * alpha, () => {
    fillRR(ctx, g.x, g.y, g.w, g.h, 4, rgba(DOMC.tag, 0.22));
    strokeRR(ctx, g.x + 0.5, g.y + 0.5, g.w - 1, g.h - 1, 4, rgba(DOMC.tag, 0.8), 1.2);
    fillRR(ctx, g.x + 4, g.y + 9, g.w - 8, g.h - 13, 2, rgba(PLAT, 0.55));
  });
}

function drawCrowd(ctx, t, S, T) {
  const t0 = T.thousand + 0.05;
  const N = GRID.cols * GRID.rows;
  const port = sheetPort();
  const maxD = Math.hypot(GRID.cols, GRID.rows);
  // the lines first, under the glyphs
  ctx.save();
  ctx.lineWidth = 1.2;
  for (let i = 2; i < N; i++) {
    const c = i % GRID.cols, r = Math.floor(i / GRID.cols);
    const d = Math.hypot(c, r) / maxD;
    const u = prog(t, t0 + 0.15 + 1.1 * d, 0.35);
    if (u <= 0) continue;
    const g = gridCell(i);
    ctx.globalAlpha = 0.07 * u;
    ctx.strokeStyle = PLAT;
    ctx.beginPath();
    const x0 = g.x + g.w, y0 = g.y + g.h / 2;
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + port.x) / 2 + 60, (y0 + port.y) / 2, port.x, port.y);
    ctx.stroke();
  }
  ctx.restore();
  for (let i = 2; i < N; i++) {
    const c = i % GRID.cols, r = Math.floor(i / GRID.cols);
    const d = Math.hypot(c, r) / maxD;
    crowdGlyph(ctx, gridCell(i), prog(t, t0 + 0.15 + 1.1 * d, 0.3));
  }
  // the two from before are in the crowd too: their lines
  ctx.save();
  for (let i = 0; i < 2; i++) {
    const g = gridCell(i);
    ctx.globalAlpha = 0.5 * prog(t, t0 + 0.3, 0.4);
    ctx.strokeStyle = PLAT;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const x0 = g.x + g.w, y0 = g.y + g.h / 2;
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + port.x) / 2 + 60, (y0 + port.y) / 2, port.x, port.y);
    ctx.stroke();
  }
  ctx.restore();
  // 1000 : 1
  const x = SHEET.x, y = SHEET.y + SHEET.h + 80;
  const n1 = prog(t, S.word(3, "thousand") + 0.4, 0.4), n2 = prog(t, S.word(3, "one", 1) - 0.1, 0.4), n3 = prog(t, S.word(3, "parsed") - 0.05, 0.4);
  text(ctx, N.toLocaleString("en-US"), x + 190, y, { font: sans(64, 750), color: C.text, align: "right", baseline: "middle", alpha: n1 });
  text(ctx, "instances", x + 216, y + 4, { font: sans(32, 600), color: C.text2, baseline: "middle", alpha: n1 });
  text(ctx, "1", x + 190, y + 84, { font: sans(64, 750), color: PLAT, align: "right", baseline: "middle", alpha: n2 });
  text(ctx, "CSSStyleSheet", x + 216, y + 88, { font: mono(32, 600), color: PLAT, baseline: "middle", alpha: n2 });
  text(ctx, "parsed once", x + 216, y + 140, { font: sans(30, 500), color: C.text2, baseline: "middle", alpha: n3 });
}

// ---- cssTagCache: a css literal with no expressions shares its sheet

function drawCssCache(ctx, t, S, T, P, a) {
  const litW = S.word(3, "css", 1), exprW = S.word(3, "expressions"), cachesW = S.word(3, "caches"), sameW = S.word(3, "same");
  const keyU = window(t, T.cachekey - 0.15, S.end + 1, 0.35, 0.3);
  withAlpha(ctx, a, () => {
    // the literal: no ${} in it
    const u0 = prog(t, T.sametrick - 0.05, 0.45);
    const sc = code(SHEETOF_SRC, 32, 1.3);
    const sx = 80, sy = 136;
    withAlpha(ctx, u0, () => {
      const col = SHEETOF_SRC.indexOf("css`");
      const r = sc.rect(ctx, sx, sy, 0, col, "css`p { margin: 0; }`".length);
      fillRR(ctx, r.x - 6, r.y - 3, r.w + 12, r.h + 6, 7, rgba(OBJ.cache, 0.2 * window(t, litW - 0.1, S.end + 1, 0.3, 0.3)));
      drawCode(ctx, SHEETOF_SRC, sx, sy, { size: 32, lineHeight: 1.3 });
      tag(ctx, { x: r.x + r.w + 34, y: r.y + r.h / 2 - 21, h: 42, text: "no ${…}", color: OBJ.cache, font: mono(24, 600), alpha: prog(t, exprW - 0.1, 0.4) });
    });

    // css-tag.js: only a literal with one string is cacheable, and its
    // strings array is the key
    const u1 = prog(t, exprW + 0.1, 0.45);
    if (u1 > 0) {
      const l0 = CACHE_SRC.split("\n")[0];
      codePanel(ctx, {
        x: 80, y: 250 + 12 * (1 - u1), src: CACHE_SRC, size: 30, lineHeight: 1.45, title: "css-tag.js · get styleSheet()", alpha: u1,
        hl: [
          { line: 0, u: prog(t, exprW + 0.3, 0.4), color: OBJ.cache, col: l0.indexOf("strings.length"), len: "strings.length === 1".length },
          { line: 2, u: prog(t, cachesW - 0.1, 0.4), color: OBJ.cache },
        ],
        style: (tok) => (tok.text === "cssTagCache" ? { color: OBJ.cache } : tok.text === "strings" && tok.line === 2 && keyU > 0 ? { color: blend(SYN.ident, OBJ.cache, keyU) } : null),
      });
    }

    // two calls: two CSSResults, one sheet (truth cssCache)
    const cu = prog(t, cachesW + 0.15, 0.4), cu2 = prog(t, cachesW + 0.75, 0.4);
    const res = (u, y, src, value, ok, note) => {
      if (u <= 0) return;
      const c = code(src, 30, 1.3);
      withAlpha(ctx, u, () => {
        drawCode(ctx, src, 80, y - c.lh / 2, { size: 30, lineHeight: 1.3 });
        const x = 80 + c.width(ctx) + 26;
        text(ctx, "→", x, y, { font: sans(32, 500), color: C.text3, baseline: "middle" });
        text(ctx, String(value), x + 46, y + 1, { font: mono(32, 600), color: SYN.keyword, baseline: "middle" });
        const w = measure(ctx, String(value), mono(32, 600));
        if (ok) check(ctx, x + 46 + w + 32, y, 30, C.ok, u);
        text(ctx, note, x + 46 + w + (ok ? 64 : 24), y + 1, { font: sans(26, 600), color: C.text3, baseline: "middle" });
      });
    };
    res(cu, 588, "sheetOf() === sheetOf()", P.cssCache.sameResultObject, P.cssCache.sameResultObject, "two CSSResults");
    res(cu2, 660, "sheetOf().styleSheet === sheetOf().styleSheet", P.cssCache.sameSheet, P.cssCache.sameSheet, "one sheet");

    // the same trick as html: episode 1's templateCache beside cssTagCache
    const tu = prog(t, sameW - 0.3, 0.45, ease.outBack), hu = prog(t, S.word(3, "html") - 0.3, 0.45, ease.outBack);
    const K = 1.2, ty = 748;
    if (hu > 0) {
      withAlpha(ctx, 0.75, () => withScale(ctx, lerp(0.92, 1, hu) * K, 80, ty, () => {
        const g = cacheTable(ctx, { x: 80, y: ty, w: 640, entries: [{ key: "counter strings", u: 1, hl: keyU }], alpha: clamp(hu) });
        void g;
      }));
    }
    if (tu > 0) {
      withScale(ctx, lerp(0.92, 1, tu) * K, 900, ty, () =>
        cssCacheTable(ctx, { x: 900, y: ty, w: 760, alpha: clamp(tu), glow: pulse(t, sameW, 1.2), keyRing: keyU }));
    }
  });
}


// Episode 1's cache table (kit cacheTable), for cssTagCache: key = the
// literal's strings array (one string), value = the CSSStyleSheet.
function cssCacheTable(ctx, { x, y, w, alpha = 1, glow = 0, keyRing = 0 }) {
  const head = 52, rh = 62;
  const h = head + 16 + rh + 10;
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, x, y, w, h, 14, C.panel);
    ctx.restore();
    if (glow > 0) withGlow(ctx, rgba(OBJ.cache, 0.8 * glow), 28 * glow, () => strokeRR(ctx, x, y, w, h, 14, rgba(OBJ.cache, glow), 2.5));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.clip();
    ctx.fillStyle = rgba(OBJ.cache, 0.13);
    ctx.fillRect(x, y, w, head);
    ctx.restore();
    text(ctx, "cssTagCache", x + 20, y + head / 2 + 1, { font: mono(24, 600), color: OBJ.cache, baseline: "middle" });
    text(ctx, "WeakMap", x + w - 20, y + head / 2 + 1, { font: sans(18, 500), color: C.text3, baseline: "middle", align: "right" });
    text(ctx, "strings array", x + 24, y + head + 20, { font: sans(16, 600), color: C.text3, baseline: "middle" });
    text(ctx, "CSSStyleSheet", x + w * 0.62, y + head + 20, { font: sans(16, 600), color: C.text3, baseline: "middle" });
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 14, rgba(OBJ.cache, 0.5), 1.5);
    const ry = y + head + 34, row = { x: x + 12, y: ry, w: w - 24, h: rh - 10 };
    const cy = ry + (rh - 10) / 2;
    fillRR(ctx, row.x, row.y, row.w, row.h, 10, C.panel2);
    stringsGlyph(ctx, x + 26, cy - 12, 1, C.text2);
    const key = "['p { margin: 0; }']";
    text(ctx, key, x + 50, cy + 1, { font: mono(22, 500), color: C.text, baseline: "middle" });
    text(ctx, "→", x + w * 0.55, cy, { font: sans(24, 500), color: C.text3, baseline: "middle", align: "center" });
    browserGlyph(ctx, x + w * 0.62, cy - 9, 24, PLAT);
    text(ctx, "CSSStyleSheet", x + w * 0.62 + 36, cy + 1, { font: mono(22, 600), color: PLAT, baseline: "middle" });
    if (keyRing > 0) {
      const kw = measure(ctx, key, mono(22, 500));
      withAlpha(ctx, keyRing, () => withGlow(ctx, rgba(OBJ.cache, 0.9), 18, () => strokeRR(ctx, x + 16, ry + 3, kw + 50, rh - 16, 9, OBJ.cache, 2.5)));
    }
  });
}
