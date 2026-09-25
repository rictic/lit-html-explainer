// The "platform" look for episode 2: things the browser does (the JS engine,
// the HTML parser, DOM APIs, the specs behind them) drawn so a viewer can tell
// "this is the browser" from "this is Lit" at a glance. Lit's objects keep
// episode 1's look (kit/lit.js); platform objects get one calm accent of
// their own, lime, which no Lit object, binding or status colour uses.
//
//   PLAT                              the platform accent. Borders, header tints, glyphs, small labels.
//   browserGlyph(ctx, cx, cy, k)      a tiny browser window: the platform's badge (30 x 24 px at k = 1)
//   docGlyph(ctx, cx, cy, k)          a page with a folded corner: a spec (22 x 28 px at k = 1)
//   platformTag(ctx, {x, y, text})    a pill: glyph + label, e.g. "the browser", "JS engine"
//   apiChip(ctx, {x, y, code})        an API call in mono (syntax-coloured), on a lime-edged plate
//   specCard(ctx, {x, y, w, ...})     a spec excerpt: source, section and title; a quoted note with highlights
//   evalBadge(ctx, {x, y, expr, ...}) "expr → result", as episode 1's `===` badge
//
// Every function returns its geometry and draws nothing at alpha 0, so a
// scene can lay things out with a call at alpha 0 first.

import { C, rgba } from "../kit/theme.js";
import { Code } from "../kit/code.js";
import { fillRR, measure, mono, monoAdvance, sans, setFont, strokeRR, text, withAlpha, withGlow } from "../kit/draw.js";
import { clamp } from "../util.js";

export const PLAT = "#c6e07e";

// A tiny browser window (title bar with three dots), centred on (cx, cy).
export function browserGlyph(ctx, cx, cy, k = 1, color = PLAT) {
  const w = 30 * k, h = 24 * k, x = cx - w / 2, y = cy - h / 2, r = 4.5 * k;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
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

// A page with a folded top-right corner and three lines of text: a spec.
export function docGlyph(ctx, cx, cy, k = 1, color = PLAT) {
  const w = 22 * k, h = 28 * k, x = cx - w / 2, y = cy - h / 2, f = 7 * k;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = rgba(color, 0.14);
  ctx.lineWidth = 2 * k;
  ctx.lineJoin = "round";
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
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 5 * k, y + (12 + i * 5) * k);
    ctx.lineTo(x + w - (i === 2 ? 9 : 5) * k, y + (12 + i * 5) * k);
    ctx.stroke();
  }
  ctx.restore();
}

// A pill with a glyph and a label. glyph: "browser" | "doc" | null.
// align: "left" | "center" | "right" (x is that edge / the centre). Returns {x, y, w, h}.
export function platformTag(ctx, { x, y, text: str, h = 42, font = sans(23, 650), color = PLAT, align = "left", alpha = 1, glyph = "browser", glow = 0 }) {
  const gw = glyph ? 30 * (h / 42) + 10 : 0;
  const padX = 16;
  const w = padX + gw + measure(ctx, str, font) + padX;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  withAlpha(ctx, alpha, () => {
    const body = () => fillRR(ctx, x0, y, w, h, h / 2, rgba(color, 0.13));
    fillRR(ctx, x0, y, w, h, h / 2, C.bg);
    if (glow > 0) withGlow(ctx, rgba(color, 0.8 * glow), 22 * glow, body);
    else body();
    strokeRR(ctx, x0 + 0.75, y + 0.75, w - 1.5, h - 1.5, h / 2, rgba(color, 0.7), 1.5);
    const k = h / 42;
    if (glyph === "browser") browserGlyph(ctx, x0 + padX + 15 * k, y + h / 2, 0.82 * k, color);
    if (glyph === "doc") docGlyph(ctx, x0 + padX + 13 * k, y + h / 2, 0.82 * k, color);
    text(ctx, str, x0 + padX + gw, y + h / 2 + 1, { font, color, baseline: "middle" });
  });
  return { x: x0, y, w, h };
}

// An API call (or any short JS) in mono with the kit's syntax colours, on a
// plate with a lime edge and the browser glyph at its left.
//   apiChip(ctx, { x, y, code: "document.importNode(node, true)", size: 26 })
// style(tok) as in Code.draw. Returns {x, y, w, h, codeX, codeY, code}, so a
// caller can find a token's rect with code.rect(ctx, codeX, codeY, ...).
const CODES = new Map();
function codeOf(src, size) {
  const k = `${size}|${src}`;
  if (!CODES.has(k)) CODES.set(k, new Code(src, { size, lineHeight: 1.45 }));
  return CODES.get(k);
}
export function apiChip(ctx, { x, y, code: src, size = 26, align = "left", alpha = 1, glow = 0, style = null, glyph = true, padX = null, h = null, fill = C.panel }) {
  const code = codeOf(src, size);
  const px = padX ?? size * 0.7;
  const gw = glyph ? size * 1.15 + size * 0.45 : 0;
  const cw = code.width(ctx);
  const hh = h ?? code.height + size * 0.55;
  const w = px + gw + cw + px;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  const codeX = x0 + px + gw, codeY = y + (hh - code.height) / 2;
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 18;
    ctx.shadowOffsetY = 6;
    fillRR(ctx, x0, y, w, hh, 11, fill);
    ctx.restore();
    fillRR(ctx, x0, y, w, hh, 11, rgba(PLAT, 0.06));
    if (glow > 0) withGlow(ctx, rgba(PLAT, 0.8 * glow), 24 * glow, () => strokeRR(ctx, x0, y, w, hh, 11, rgba(PLAT, clamp(0.55 + 0.45 * glow)), 2.5));
    strokeRR(ctx, x0 + 0.75, y + 0.75, w - 1.5, hh - 1.5, 11, rgba(PLAT, 0.6), 1.5);
    if (glyph) browserGlyph(ctx, x0 + px + size * 0.575, y + hh / 2, size / 30, PLAT);
    code.draw(ctx, codeX, codeY, { style });
  });
  return { x: x0, y, w, h: hh, codeX, codeY, code };
}

// A spec excerpt card.
//   specCard(ctx, { x, y, w, source: "ECMA-262", section: "13.2.8.4", title: "GetTemplateObject ( templateLiteral )",
//     label: "Note 2", quote, size: 31, hl: [{ text: "…a substring of quote…", u, wipe }] })
// Highlighted spans get a lime wash (u: its strength, wipe: how much of it
// has been drawn, left to right) and full-white text; while any is on, the
// rest of the quote dims a little. Returns {x, y, w, h, spans: [[rects]]}.
const LAYOUTS = new Map();
function layoutQuote(ctx, quote, size, maxW) {
  const k = `${size}|${maxW}|${quote}`;
  if (LAYOUTS.has(k)) return LAYOUTS.get(k);
  const f = sans(size, 450);
  const words = [];
  let i = 0;
  for (const m of quote.matchAll(/\S+/g)) words.push({ text: m[0], start: m.index, end: m.index + m[0].length, i: i++ });
  const space = measure(ctx, " ", f);
  const lines = [];
  let line = [], lw = 0;
  for (const wd of words) {
    wd.w = measure(ctx, wd.text, f);
    const nw = line.length ? lw + space + wd.w : wd.w;
    if (nw > maxW && line.length) {
      lines.push(line);
      line = [wd];
      lw = wd.w;
    } else {
      line.push(wd);
      lw = nw;
    }
  }
  if (line.length) lines.push(line);
  lines.forEach((ln, li) => {
    let x = 0;
    for (const wd of ln) {
      wd.x = x;
      wd.line = li;
      x += wd.w + space;
    }
  });
  const L = { words, lines, space, lh: size * 1.5 };
  LAYOUTS.set(k, L);
  return L;
}

export function specCard(ctx, { x, y, w, source, section, title, label = null, quote, size = 31, hl = [], alpha = 1, glow = 0, url = null }) {
  const head = 62, padX = 34, rule = 5, gap = 24;
  const qx = x + padX + rule + gap;
  const maxW = w - (qx - x) - padX;
  const L = layoutQuote(ctx, quote, size, maxW);
  const labelH = label ? 40 : 0;
  const qy = y + head + 26 + labelH;
  const qh = L.lines.length * L.lh;
  const footH = url ? 44 : 0;
  const h = head + 26 + labelH + qh + 18 + footH + 10;
  // highlight spans -> per-line rects
  const spans = hl.map((s) => {
    const a = quote.indexOf(s.text);
    if (a < 0) throw new Error(`specCard: "${s.text}" not in quote`);
    const b = a + s.text.length;
    const byLine = new Map();
    for (const wd of L.words) {
      if (wd.end <= a || wd.start >= b) continue;
      const r = byLine.get(wd.line) ?? { x0: Infinity, x1: -Infinity, line: wd.line };
      r.x0 = Math.min(r.x0, wd.x);
      r.x1 = Math.max(r.x1, wd.x + wd.w);
      byLine.set(wd.line, r);
    }
    return [...byLine.values()].map((r) => ({ x: qx + r.x0, y: qy + r.line * L.lh + (L.lh - size * 1.3) / 2, w: r.x1 - r.x0, h: size * 1.3, a, b }));
  });
  const out = { x, y, w, h, spans, qx, qy };
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
    // header: glyph, source, section, title
    docGlyph(ctx, x + 34, y + head / 2, 1, PLAT);
    let hx = x + 62;
    hx += text(ctx, source, hx, y + head / 2 + 1, { font: sans(27, 750), color: PLAT, baseline: "middle" });
    hx += 22;
    if (section) hx += text(ctx, `§${section}`, hx, y + head / 2 + 1, { font: sans(25, 500), color: C.text3, baseline: "middle" }) + 16;
    if (title) text(ctx, title, hx, y + head / 2 + 1, { font: sans(25, 600), color: C.text, baseline: "middle" });
    // the note label and the rule
    if (label) text(ctx, label, qx, y + head + 26 + 14, { font: sans(20, 700), color: rgba(PLAT, 0.9), baseline: "middle" });
    fillRR(ctx, x + padX, qy - 4, rule, qh + 4, rule / 2, rgba(PLAT, 0.75));
    // washes
    const any = Math.max(0, ...hl.map((s) => s.u ?? 0));
    hl.forEach((s, i) => {
      const u = s.u ?? 0;
      if (u <= 0) return;
      const wipe = clamp(s.wipe ?? 1);
      for (const r of spans[i]) withAlpha(ctx, u, () => fillRR(ctx, r.x - 6, r.y, (r.w + 12) * wipe, r.h, 7, rgba(s.color ?? PLAT, 0.22)));
    });
    // words
    const f = sans(size, 450);
    ctx.save();
    setFont(ctx, f);
    ctx.textBaseline = "alphabetic";
    for (const wd of L.words) {
      let lit = 0;
      hl.forEach((s, i) => {
        if (wd.end > spans[i][0]?.a && wd.start < spans[i][0]?.b) lit = Math.max(lit, s.u ?? 0);
      });
      const a = 1 - 0.38 * any * (1 - lit);
      ctx.globalAlpha = alpha * a;
      ctx.fillStyle = lit > 0.5 ? C.white : C.text;
      ctx.fillText(wd.text, qx + wd.x, qy + wd.line * L.lh + (L.lh + size * 0.72) / 2);
    }
    ctx.restore();
    if (url) text(ctx, url, x + w - padX, y + h - 10 - footH / 2, { font: mono(19, 450), color: C.text3, baseline: "middle", align: "right" });
  });
  return out;
}

// "expr → result": a console-style evaluation, in episode 1's badge look.
// resultU fades the arrow and the result in. Returns {x, y, w, h}.
export function evalBadge(ctx, { x, y, expr, result, resultColor = C.ok, size = 26, alpha = 1, resultU = 1, align = "left", h = 60 }) {
  const f = mono(size, 550), pad = 22, gap = 16;
  const ew = measure(ctx, expr, f), aw = measure(ctx, "→", sans(size + 2, 500)), rw = measure(ctx, result, mono(size, 700));
  const w = pad + ew + gap + aw + gap + rw + pad;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  withAlpha(ctx, alpha, () => {
    fillRR(ctx, x0, y, w, h, 14, C.panel2);
    strokeRR(ctx, x0 + 0.5, y + 0.5, w - 1, h - 1, 14, C.border2, 1.5);
    text(ctx, expr, x0 + pad, y + h / 2 + 1, { font: f, color: C.text, baseline: "middle" });
    text(ctx, "→", x0 + pad + ew + gap, y + h / 2, { font: sans(size + 2, 500), color: C.text3, baseline: "middle", alpha: resultU });
    text(ctx, result, x0 + pad + ew + gap + aw + gap, y + h / 2 + 1, { font: mono(size, 700), color: resultColor, baseline: "middle", alpha: resultU });
  });
  return { x: x0, y, w, h };
}

// The advance of one mono character (for aligning things with code).
export const adv = (ctx, size, weight = 450) => monoAdvance(ctx, size, weight);
