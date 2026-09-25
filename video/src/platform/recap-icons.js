// Small pieces for episode 2's recap and outro: one icon per platform
// feature, and the "platform" look: PLAT for things the browser provides
// (the intro's lime, see intro-platform.js), LITC for Lit's own layer.
//
// Icons are drawn centred on (cx, cy); at s = 1 each fits in about 96 x 80 px,
// like episode 1's recap glyphs (scenes/recap-glyphs.js). Inside an icon the
// video's usual colours keep their meaning: DOM blue, comment green, the
// three bindings, the cache's gold key.

import { B, C, DOMC, SYN, rgba } from "../kit/theme.js";
import { fillRR, measure, mono, sans, strokeRR, text, withAlpha } from "../kit/draw.js";
import { OBJ } from "../kit/lit.js";
import { drawKey } from "../scenes/literal-draw.js";

// The platform accent (the same value as intro-platform.js's PLAT; one
// constant here so these scenes follow whatever the kit settles on).
export const PLAT = "#c6e07e";
// Lit's own layer.
export const LITC = C.accent;

// A tiny browser window, the platform's badge (as intro-platform.js draws
// it): 30 x 24 px at k = 1, centred on (cx, cy).
export function browserGlyph(ctx, cx, cy, k = 1, color = PLAT) {
  const w = 30 * k, h = 24 * k, x = cx - w / 2, y = cy - h / 2;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4.5 * k);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = rgba(color, 0.14);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, 7.5 * k);
  ctx.restore();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2 * k;
  ctx.stroke();
  ctx.fillStyle = C.bg;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + (5.5 + i * 4.6) * k, y + 3.9 * k, 1.35 * k, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// A page with a folded corner and three lines: a spec. 22 x 28 px at k = 1.
export function docGlyph(ctx, cx, cy, k = 1, color = PLAT) {
  const w = 22 * k, h = 28 * k, x = cx - w / 2, y = cy - h / 2, f = 7 * k;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = rgba(color, 0.14);
  ctx.lineWidth = 2 * k;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - f, y);
  ctx.lineTo(x + w, y + f);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w - f, y);
  ctx.lineTo(x + w - f, y + f);
  ctx.lineTo(x + w, y + f);
  ctx.stroke();
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 5 * k, y + (12 + i * 5) * k);
    ctx.lineTo(x + w - (i === 2 ? 9 : 5) * k, y + (12 + i * 5) * k);
    ctx.stroke();
  }
  ctx.restore();
}

// A glyph and a label in PLAT: "the browser", "The specs". Returns the width.
export function platLabel(ctx, { x, y, text: str, size = 26, glyph = "browser", color = PLAT, alpha = 1 }) {
  const k = size / 28;
  const gw = 30 * k + 12 * k;
  const f = sans(size, 700);
  withAlpha(ctx, alpha, () => {
    if (glyph === "browser") browserGlyph(ctx, x + 15 * k, y, k, color);
    else docGlyph(ctx, x + 11 * k, y, k, color);
    text(ctx, str, x + gw, y + 1, { font: f, color, baseline: "middle" });
  });
  return gw + measure(ctx, str, f);
}

// ------------------------------------------------------------ API chips

const KEYWORDS = new Set(["await", "this", "true", "false", "new", "const", "null"]);

// A line of code as coloured runs [{text, color}] with the kit's muted
// syntax colours (SYN): calls in fn blue, numbers, strings, keywords.
export function codeRuns(src) {
  const out = [];
  const re = /(\s+)|([A-Za-z_$][\w$]*)|(\d+)|('[^']*')|(…)|(.)/g;
  let m;
  while ((m = re.exec(src))) {
    const [tok, ws, id, num, str, ell] = m;
    if (ws) out.push({ text: ws, color: SYN.punct });
    else if (id) out.push({ text: id, color: KEYWORDS.has(id) ? SYN.keyword : src[re.lastIndex] === "(" ? SYN.fn : SYN.ident });
    else if (num) out.push({ text: num, color: SYN.number });
    else if (str) out.push({ text: str, color: SYN.string });
    else if (ell) out.push({ text: ell, color: C.text3 });
    else out.push({ text: tok, color: SYN.punct });
  }
  return out;
}

// A platform API name as a chip: mono, syntax-coloured, on a plate with a
// PLAT edge (the intro's API chips, without the glyph: rows carry that).
// `color` overrides the syntax colours (e.g. DOMC.comment for "<!---->").
// Returns the chip's width.
export function apiChip(ctx, { x, y, src, size = 22, h = 38, color = null, alpha = 1, padX = 12, edge = 0.5, fill = C.panel2 }) {
  const f = mono(size, 500);
  const pieces = color ? [{ text: src, color }] : codeRuns(src);
  const tw = pieces.reduce((n, p) => n + measure(ctx, p.text, f), 0);
  const w = tw + padX * 2;
  withAlpha(ctx, alpha, () => {
    fillRR(ctx, x, y, w, h, 10, fill);
    fillRR(ctx, x, y, w, h, 10, rgba(PLAT, 0.05));
    strokeRR(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 10, rgba(PLAT, edge), 1.5);
    let cx = x + padX;
    for (const p of pieces) cx += text(ctx, p.text, cx, y + h / 2 + 1, { font: f, color: p.color, baseline: "middle" });
  });
  return w;
}
export function apiChipWidth(ctx, src, size = 22, padX = 12) {
  return measure(ctx, src, mono(size, 500)) + padX * 2;
}

// A row of API chips; returns the total width.
export function apiChips(ctx, { x, y, items, size = 22, h = 38, gap = 12, alpha = 1 }) {
  let cx = x;
  for (const it of items) {
    const spec = typeof it === "string" ? { src: it } : it;
    cx += apiChip(ctx, { x: cx, y, size, h, alpha, ...spec }) + gap;
  }
  return cx - gap - x;
}

// ------------------------------------------------------------ icon bits

function line(ctx, pts, color, width) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

function dashedRR(ctx, x, y, w, h, r, color, width, dash) {
  ctx.save();
  ctx.setLineDash(dash);
  strokeRR(ctx, x, y, w, h, r, color, width);
  ctx.restore();
}

// A little DOM tree as rows of bars, devtools-style: [depth, length, kind]
// with kind "el" (tag blue), "cm" (comment green) or "tx" (text, dim).
const MINI = [[0, 30, "el"], [1, 22, "cm"], [1, 26, "el"], [0, 34, "el"]];
function miniTree(ctx, x, y, s, { rows = MINI, rowH = 12, alpha = 1, walker = -1, walkerColor = PLAT } = {}) {
  withAlpha(ctx, alpha, () => {
    rows.forEach(([d, len, kind], i) => {
      const ry = y + i * rowH * s;
      const color = kind === "cm" ? DOMC.comment : kind === "tx" ? C.text4 : DOMC.tag;
      fillRR(ctx, x + d * 11 * s, ry - 2.5 * s, len * s, 5 * s, 2.5 * s, color);
    });
    if (walker >= 0) {
      const ry = y + walker * rowH * s;
      ctx.beginPath();
      ctx.arc(x - 9 * s, ry, 4.2 * s, 0, Math.PI * 2);
      ctx.fillStyle = walkerColor;
      ctx.fill();
    }
  });
}

// A page with a folded corner (a stylesheet), top-left at (x, y).
function sheet(ctx, x, y, w, h, color, s) {
  const f = 8 * s;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - f, y);
  ctx.lineTo(x + w, y + f);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
  ctx.fillStyle = C.panel;
  ctx.fill();
  ctx.fillStyle = rgba(color, 0.16);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8 * s;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w - f, y);
  ctx.lineTo(x + w - f, y + f);
  ctx.lineTo(x + w, y + f);
  ctx.stroke();
  ctx.restore();
  [0.55, 0.4, 0.5].forEach((k, i) => fillRR(ctx, x + 5 * s, y + (f + 4 * s) + i * 6 * s, w * k, 2.6 * s, 1.3 * s, rgba(color, 0.75)));
}

// ------------------------------------------------------------ the icons

// Tagged templates: the literal split into its fixed strings (white) and
// the three expressions (the counter's binding colours), and the strings
// array, one per literal, handed over as the cache key (gold, as in ep. 1).
export function taggedIcon(ctx, cx, cy, s = 1) {
  const segs = [16, 9, 10, 9, 18, 9, 12]; // string, hole, string, hole, ...
  const gap = 2.5 * s;
  const total = segs.reduce((a, b) => a + b * s, 0) + gap * (segs.length - 1);
  let x = cx - total / 2;
  const y = cy - 14 * s;
  segs.forEach((w, i) => {
    const ww = w * s;
    if (i % 2 === 0) fillRR(ctx, x, y - 8 * s, ww, 16 * s, 3 * s, C.text);
    else fillRR(ctx, x + 0.5 * s, y - 5 * s, ww - s, 10 * s, 3 * s, B[(i - 1) / 2]);
    x += ww + gap;
  });
  drawKey(ctx, cx - 20 * s, cy + 20 * s, 0.72 * s, OBJ.cache);
}

// The HTML parser and <template>: a string becomes a small DOM tree, in
// the template's own (inert) document: dashed frame.
export function parserIcon(ctx, cx, cy, s = 1) {
  const w = 84 * s, h = 70 * s, x = cx - w / 2, y = cy - h / 2;
  fillRR(ctx, x, y, w, h, 10 * s, rgba(OBJ.dom, 0.06));
  dashedRR(ctx, x + 1, y + 1, w - 2, h - 2, 10 * s, rgba(OBJ.dom, 0.9), 2 * s, [6 * s, 4 * s]);
  // "<>" at the top left, the template tag
  line(ctx, [[x + 15 * s, y + 10 * s], [x + 10 * s, y + 14 * s], [x + 15 * s, y + 18 * s]], OBJ.dom, 2 * s);
  line(ctx, [[x + 21 * s, y + 10 * s], [x + 26 * s, y + 14 * s], [x + 21 * s, y + 18 * s]], OBJ.dom, 2 * s);
  miniTree(ctx, x + 22 * s, y + 31 * s, s, { rowH: 11 });
}

// importNode and TreeWalker: the inert original (dashed, behind), its copy
// (solid, in front), and the walker's dot on a comment: a hole found.
export function cloneIcon(ctx, cx, cy, s = 1) {
  const w = 64 * s, h = 58 * s;
  const bx = cx - 44 * s, by = cy - 38 * s;
  fillRR(ctx, bx, by, w, h, 9 * s, rgba(OBJ.dom, 0.05));
  dashedRR(ctx, bx + 1, by + 1, w - 2, h - 2, 9 * s, rgba(OBJ.dom, 0.55), 1.8 * s, [5 * s, 4 * s]);
  const fx = cx - 20 * s, fy = cy - 20 * s;
  fillRR(ctx, fx, fy, w, h, 9 * s, C.panel2);
  strokeRR(ctx, fx + 1, fy + 1, w - 2, h - 2, 9 * s, rgba(OBJ.dom, 0.95), 2 * s);
  miniTree(ctx, fx + 22 * s, fy + 14 * s, s, { rowH: 10, walker: 1 });
}

// Comments: "<!---->" between two elements.
export function commentIcon(ctx, cx, cy, s = 1) {
  fillRR(ctx, cx - 40 * s, cy - 26 * s, 34 * s, 6 * s, 3 * s, rgba(DOMC.tag, 0.55));
  text(ctx, "<!---->", cx, cy + 1 * s, { font: mono(21 * s, 600), color: DOMC.comment, align: "center", baseline: "middle" });
  fillRR(ctx, cx - 40 * s, cy + 21 * s, 28 * s, 6 * s, 3 * s, rgba(DOMC.tag, 0.55));
}

// Listener objects: an object holding a function, "{ƒ}", in the click
// binding's pink (the event part's colour in episode 1).
export function listenerIcon(ctx, cx, cy, s = 1) {
  const c = B[2];
  fillRR(ctx, cx - 20 * s, cy - 22 * s, 40 * s, 44 * s, 9 * s, rgba(c, 0.14));
  const bf = mono(46 * s, 500);
  text(ctx, "{", cx - 31 * s, cy + 1 * s, { font: bf, color: C.text2, align: "center", baseline: "middle" });
  text(ctx, "}", cx + 31 * s, cy + 1 * s, { font: bf, color: C.text2, align: "center", baseline: "middle" });
  text(ctx, "ƒ", cx - 1 * s, cy + 1 * s, { font: sans(38 * s, 700, "italic"), color: c, align: "center", baseline: "middle" });
}

// Custom elements, shadow DOM, adoptedStyleSheets: an element (its tag at
// the top), its shadow root (dashed) holding its own DOM, and one shared
// stylesheet adopted into it.
export function componentIcon(ctx, cx, cy, s = 1) {
  const w = 76 * s, h = 70 * s, x = cx - 44 * s, y = cy - h / 2;
  fillRR(ctx, x, y, w, h, 10 * s, C.panel2);
  strokeRR(ctx, x + 1, y + 1, w - 2, h - 2, 10 * s, rgba(DOMC.tag, 0.95), 2 * s);
  fillRR(ctx, x + 9 * s, y + 8 * s, 36 * s, 6 * s, 3 * s, DOMC.tag);
  const sx = x + 8 * s, sy = y + 21 * s, sw = w - 16 * s, sh = h - 29 * s;
  dashedRR(ctx, sx, sy, sw, sh, 7 * s, rgba(C.text2, 0.8), 1.6 * s, [4 * s, 3 * s]);
  miniTree(ctx, sx + 9 * s, sy + 11 * s, s, { rows: [[0, 22, "el"], [1, 18, "el"]], rowH: 11 });
  sheet(ctx, cx + 20 * s, cy + 2 * s, 26 * s, 32 * s, PLAT, s);
}

// Microtasks: three property sets, batched into one update.
export function microtaskIcon(ctx, cx, cy, s = 1) {
  const x0 = cx - 42 * s, ys = [-22, 0, 22];
  const bx = cx + 18 * s, bw = 26 * s, bh = 44 * s;
  ys.forEach((dy, i) => {
    fillRR(ctx, x0, cy + dy * s - 4 * s, 18 * s, 8 * s, 4 * s, rgba(C.text2, 0.9));
    ctx.save();
    ctx.strokeStyle = rgba(C.text2, 0.55);
    ctx.lineWidth = 2 * s;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0 + 22 * s, cy + dy * s);
    ctx.bezierCurveTo(x0 + 42 * s, cy + dy * s, bx - 22 * s, cy + dy * 0.25 * s, bx - 3 * s, cy + dy * 0.25 * s);
    ctx.stroke();
    ctx.restore();
  });
  fillRR(ctx, bx, cy - bh / 2, bw, bh, 7 * s, rgba(LITC, 0.3));
  strokeRR(ctx, bx + 1, cy - bh / 2 + 1, bw - 2, bh - 2, 7 * s, LITC, 2 * s);
  // a little check: rendered once
  line(ctx, [[bx + 7 * s, cy + 1 * s], [bx + 12 * s, cy + 6 * s], [bx + 20 * s, cy - 5 * s]], C.white, 2.4 * s);
}

export const ICONS = [taggedIcon, parserIcon, cloneIcon, commentIcon, listenerIcon, componentIcon, microtaskIcon];
