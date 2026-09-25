// Drawing helpers for the parser scene: a spec panel in the episode's
// platform look, rows of big character cells, spec sentences with linked
// terms, a DOM tree parsed by the browser itself, the inert-content icons
// (as episode 1's parse scene draws them), and a frosted layer for inert DOM.

import { C, DOMC, rgba } from "../kit/theme.js";
import { PLAT, docGlyph } from "./intro-platform.js";
import { cross, fillRR, measure, mono, monoAdvance, sans, setFont, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { Tree } from "../kit/tree.js";
import { clamp, lerp } from "../util.js";

export const GOLD = "#ffd166";   // the mystery-comment ring (episode 1's `open`)

// ------------------------------------------------------------ the spec panel

// intro-platform.js's specCard frame (lime header with the spec glyph,
// source and title), with a body the caller draws: for a spec excerpt that
// changes as the tokenizer runs. Returns the body's top.
export function specPanel(ctx, { x, y, w, h, source = "HTML Standard", title = null, alpha = 1, glow = 0, head = 62 }) {
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    fillRR(ctx, x, y, w, h, 16, C.panel);
    ctx.restore();
    if (glow > 0) withGlow(ctx, rgba(PLAT, 0.7 * glow), 28 * glow, () => strokeRR(ctx, x, y, w, h, 16, rgba(PLAT, glow), 2.5));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.clip();
    ctx.fillStyle = rgba(PLAT, 0.12);
    ctx.fillRect(x, y, w, head);
    ctx.fillStyle = rgba(PLAT, 0.45);
    ctx.fillRect(x, y + head - 1.5, w, 1.5);
    ctx.restore();
    strokeRR(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 16, rgba(PLAT, 0.5), 1.5);
    docGlyph(ctx, x + 34, y + head / 2, 1, PLAT);
    let hx = x + 62;
    hx += text(ctx, source, hx, y + head / 2 + 1, { font: sans(27, 750), color: PLAT, baseline: "middle" }) + 22;
    if (title) text(ctx, title, hx, y + head / 2 + 1, { font: sans(25, 600), color: C.text, baseline: "middle" });
  });
  return y + head;
}

// The lime rule specCard draws beside a quote.
export function quoteRule(ctx, x, y0, y1, alpha = 1) {
  if (alpha <= 0 || y1 <= y0) return;
  withAlpha(ctx, alpha, () => fillRR(ctx, x, y0, 5, y1 - y0, 2.5, rgba(PLAT, 0.75)));
}

// ------------------------------------------------------------ text pieces

// Monospace pieces [{text, color, alpha}] from (x, y), middle baseline.
// Returns the width.
export function monoPieces(ctx, list, x, y, size, { alpha = 1, weight = 480 } = {}) {
  const adv = monoAdvance(ctx, size, weight);
  let n = 0;
  for (const p of list) {
    if (p.text) text(ctx, p.text, x + n * adv, y, { font: mono(size, weight), color: p.color, baseline: "middle", alpha: alpha * (p.alpha ?? 1) });
    n += p.text.length;
  }
  return n * adv;
}
export const piecesLen = (list) => list.reduce((n, p) => n + p.text.length, 0);

// A sentence as pieces [{text, color, weight}] in one font family, left
// aligned from x (middle baseline). Returns the width.
export function sentence(ctx, list, x, y, size, { alpha = 1, weight = 480, family = sans } = {}) {
  let w = 0;
  for (const p of list) w += text(ctx, p.text, x + w, y, { font: family(size, p.weight ?? weight), color: p.color ?? C.text, baseline: "middle", alpha: alpha * (p.alpha ?? 1) });
  return w;
}
export const sentenceW = (ctx, list, size, weight = 480, family = sans) =>
  list.reduce((w, p) => w + measure(ctx, p.text, family(size, p.weight ?? weight)), 0);

// Splits a spec sentence into pieces, colouring the phrases that are links
// in the spec (state names, parse errors, defined terms).
export function linked(str, links) {
  let out = [{ text: str }];
  for (const [phrase, color] of links) {
    out = out.flatMap((p) => {
      if (p.color || !p.text.includes(phrase)) return [p];
      const [a, ...rest] = p.text.split(phrase);
      const b = rest.join(phrase);
      return [a ? { text: a } : null, { text: phrase, color }, b ? { text: b } : null].filter(Boolean);
    });
  }
  return out;
}

// ------------------------------------------------------------ character cells

// A row of big monospace characters, one per cell.
//   cells: [{ch, alpha, fill, border, color, glow, dy, k}]
// Returns [{x, y, w, h, cx, cy}] for each cell.
export function charCells(ctx, { x, y, cells, size = 76, cw = null, ch = null, gap = 10, weight = 560 }) {
  const adv = monoAdvance(ctx, size, weight);
  const w = cw ?? adv + 22, h = ch ?? size * 1.26;
  const out = [];
  cells.forEach((c, i) => {
    const cx = x + i * (w + gap), cy = y + (c.dy ?? 0);
    out.push({ x: cx, y: cy, w, h, cx: cx + w / 2, cy: cy + h / 2 });
    withAlpha(ctx, c.alpha ?? 1, () => withScale(ctx, c.k ?? 1, cx + w / 2, cy + h / 2, () => {
      const box = () => fillRR(ctx, cx, cy, w, h, 12, c.fill ?? C.panel2);
      if (c.glow > 0) withGlow(ctx, rgba(c.border ?? C.accent, 0.85 * c.glow), 24 * c.glow, box);
      else box();
      strokeRR(ctx, cx + 1, cy + 1, w - 2, h - 2, 11, c.border ?? C.border2, c.bw ?? 1.6);
      if (c.ch !== " ") text(ctx, c.ch, cx + w / 2, cy + h / 2 + size * 0.04, { font: mono(size, weight), color: c.color ?? C.text, align: "center", baseline: "middle", alpha: c.chAlpha ?? 1 });
    }));
  });
  return out;
}

// ------------------------------------------------------------ DOM, parsed live

const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);

// A DOM node as truth.json writes it: {type, name, attrs, children, data}.
function nodeJSON(n) {
  if (n.nodeType === 3) return { type: "text", data: n.data };
  if (n.nodeType === 8) return { type: "comment", data: n.data };
  if (n.nodeType === 7) return { type: "pi", target: n.target, data: n.data };
  if (n.nodeType === 11) return { type: "fragment", children: [...n.childNodes].map(nodeJSON) };
  return { type: "element", name: n.localName, attrs: [...n.attributes].map((a) => [a.name, a.value]), children: [...n.childNodes].map(nodeJSON) };
}

// Parses `src` the way lit-html does (a <template>'s innerHTML), in the
// browser drawing the video, and returns the content as truth-style JSON.
// (Runs once per source; the result is cached.)
const PARSED = new Map();
export function parseTemplate(src) {
  if (!PARSED.has(src)) {
    const t = document.createElement("template");
    t.innerHTML = src;
    PARSED.set(src, nodeJSON(t.content));
  }
  return PARSED.get(src);
}

// A kit Tree, with void elements drawn without an end tag (as devtools does).
export function domTree(node, opts) {
  const tree = new Tree(node, opts);
  for (const row of tree.rows) {
    if (row.kind === "leaf" && row.node.type === "element" && VOID.has(row.node.name)) row.segs = row.segs.slice(0, -3);
  }
  return tree;
}

// ------------------------------------------------------------ inert content

// Icons for what doesn't happen in inert content (episode 1's parse scene).
export function inertIcon(ctx, kind, x, y, s, u, crossU) {
  if (u <= 0) return;
  withScale(ctx, lerp(0.6, 1, u), x + s / 2, y + s / 2, () => withAlpha(ctx, clamp(u), () => {
    fillRR(ctx, x, y, s, s, 16, C.panel2);
    strokeRR(ctx, x + 0.5, y + 0.5, s - 1, s - 1, 16, C.border2, 1.5);
    ctx.save();
    ctx.strokeStyle = C.text2;
    ctx.fillStyle = C.text2;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const cx = x + s / 2, cy = y + s / 2;
    if (kind === "script") {
      setFont(ctx, mono(s * 0.25, 600));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("</>", cx, cy - s * 0.17);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.1, cy + s * 0.07);
      ctx.lineTo(cx + s * 0.14, cy + s * 0.2);
      ctx.lineTo(cx - s * 0.1, cy + s * 0.33);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "image") {
      const fx = x + s * 0.2, fy = y + s * 0.24, fw = s * 0.6, fh = s * 0.52;
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.beginPath();
      ctx.moveTo(fx + 3, fy + fh - 3);
      ctx.lineTo(fx + fw * 0.38, fy + fh * 0.42);
      ctx.lineTo(fx + fw * 0.6, fy + fh * 0.68);
      ctx.lineTo(fx + fw * 0.74, fy + fh * 0.52);
      ctx.lineTo(fx + fw - 3, fy + fh - 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fx + fw * 0.74, fy + fh * 0.26, s * 0.055, 0, Math.PI * 2);
      ctx.fill();
    } else {
      setFont(ctx, mono(s * 0.2, 600));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("<x-a>", cx, cy + s * 0.22);
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.02);
      ctx.lineTo(cx, cy - s * 0.3);
      ctx.moveTo(cx - s * 0.11, cy - s * 0.19);
      ctx.lineTo(cx, cy - s * 0.3);
      ctx.lineTo(cx + s * 0.11, cy - s * 0.19);
      ctx.stroke();
    }
    ctx.restore();
    if (crossU > 0) {
      const bx = x + s - 4, by = y + 4;
      withAlpha(ctx, clamp(crossU * 3), () => {
        fillRR(ctx, bx - 18, by - 18, 36, 36, 18, C.bg);
        strokeRR(ctx, bx - 18, by - 18, 36, 36, 18, rgba(C.bad, 0.9), 2.5);
      });
      cross(ctx, bx, by, 24, C.bad, crossU);
    }
  }));
}

// Draws `fn` (which draws with the given context) frosted: desaturated and
// slightly blurred, as episode 1 draws inert template content. The filter
// runs once on a layer, not per text run (slow on a software canvas).
let FROST = null;
export function frosted(ctx, f, fn) {
  if (f <= 0.001) { fn(ctx); return; }
  const { width, height } = ctx.canvas;
  if (!FROST || FROST.canvas.width !== width || FROST.canvas.height !== height) FROST = new OffscreenCanvas(width, height).getContext("2d");
  const L = FROST;
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.clearRect(0, 0, width, height);
  L.setTransform(ctx.getTransform());
  L.globalAlpha = 1;
  fn(L);
  ctx.save();
  const s = ctx.getTransform().a;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.filter = `saturate(${(1 - 0.9 * f).toFixed(3)}) blur(${(1.1 * f * s).toFixed(2)}px)`;
  ctx.globalAlpha *= lerp(1, 0.7, f);
  ctx.drawImage(L.canvas, 0, 0);
  ctx.restore();
}

// The frost's hatching over a rect (drawn after the content).
export function frostOver(ctx, { x, y, w, h, r = 10 }, f) {
  if (f <= 0.001) return;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.fillStyle = `rgba(200,215,255,${(0.07 * f).toFixed(3)})`;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = `rgba(220,230,255,${(0.05 * f).toFixed(3)})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let d = -h; d < w; d += 16) {
    ctx.moveTo(x + d, y + h);
    ctx.lineTo(x + d + h, y);
  }
  ctx.stroke();
  ctx.restore();
  withAlpha(ctx, f, () => strokeRR(ctx, x, y, w, h, r, "rgba(220,230,255,0.22)", 1.5));
}

// DOM-coloured "<name>" (returns the width).
export function tagText(ctx, name, x, y, size, alpha = 1) {
  const f = mono(size, 500);
  let w = 0;
  w += text(ctx, "<", x + w, y, { font: f, color: DOMC.punct, baseline: "middle", alpha });
  w += text(ctx, name, x + w, y, { font: f, color: DOMC.tag, baseline: "middle", alpha });
  w += text(ctx, ">", x + w, y, { font: f, color: DOMC.punct, baseline: "middle", alpha });
  return w;
}
