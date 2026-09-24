// Helpers shared by episode 2's components and batching scenes (candidates
// for the kit):
//
//   PLAT, browserGlyph(ctx, x, y, w)     the episode's shared "platform" look (intro-platform.js):
//                                         lime, and the browser glyph (here placed by its top-left)
//   platChip(ctx, { x, y, label, ... })  intro-platform's platformTag, with an active (lit/dim) state and scale
//   apiChip(ctx, { x, y, src, ... })     intro-platform's apiChip, with the extra keywords coloured
//   platBox(ctx, { x, y, w, h, title })  a platform object: panel with a glyph + title strip
//   topicRow(ctx, { weights, ... })      the four platform features of the component
//                                         layer, as a row of chips at the top (the active one lit)
//   codePanel(ctx, { x, y, src, hl })    a code panel with per-line highlights
//   code(src, size), kw(tok)             cached Code layouts; colours `static`, `try`, `get`…
//   sheetIcon, statBox, stringsGlyph, flowChips, htmlSegs: smaller pieces

import { C, DOMC, SYN, rgba } from "../kit/theme.js";
import { Code } from "../kit/code.js";
import { fillRR, measure, mono, monoAdvance, panel, sans, setFont, strokeRR, text, withAlpha, withGlow } from "../kit/draw.js";
import { clamp, lerp } from "../util.js";
import { PLAT, apiChip as sharedApiChip, browserGlyph as sharedGlyph, platformTag } from "./intro-platform.js";

// Things the browser provides (features, API calls, platform objects): the
// episode's shared accent.
export { PLAT };
// Lit's own layers (ReactiveElement, lit-html, LitElement), as in recap-icons.js.
export const LITC = C.accent;

// ------------------------------------------------------------------ code

const CODES = new Map();
export function code(src, size = 28, lineHeight = 1.5) {
  const k = `${size}|${lineHeight}|${src}`;
  if (!CODES.has(k)) CODES.set(k, new Code(src, { size, lineHeight }));
  return CODES.get(k);
}

// Keywords the kit's tokenizer leaves as identifiers.
const MORE_KW = new Set(["static", "try", "catch", "get", "instanceof", "super"]);
export function kw(tok) {
  if (!MORE_KW.has(tok.text)) return null;
  if (tok.kind === "ident" || (tok.kind === "fn" && tok.text === "catch")) return { color: SYN.keyword };
  return null;
}
const withKw = (style) => (tok) => {
  const a = kw(tok), b = style ? style(tok) : null;
  return a || b ? { ...(a ?? {}), ...(b ?? {}) } : null;
};

// Code drawn at (x, y) (top of the first line), with the extra keywords.
export function drawCode(ctx, src, x, y, { size = 28, lineHeight = 1.5, alpha = 1, style = null } = {}) {
  const c = code(src, size, lineHeight);
  c.draw(ctx, x, y, { alpha, style: withKw(style) });
  return c;
}

// A code panel: an optional title strip, the code, and line highlights.
//   hl: [{ line, u, color, col, len }]  (col/len default to the line's text, without its indent)
// Returns { x, y, w, h, code, cx, cy, lineRect(line, col, len) }.
export function codePanel(ctx, { x, y, src, size = 28, lineHeight = 1.5, title = null, w = null, alpha = 1, hl = [],
  style = null, pad = 26, glow = 0, accent = null, titleColor = C.text2, titleFont = mono(20, 500) }) {
  const c = code(src, size, lineHeight);
  const head = title !== null ? 44 : 0;
  const W = w ?? c.width(ctx) + pad * 2;
  const H = head + c.height + pad * 1.2;
  const cx = x + pad, cy = y + head + pad * 0.6;
  const lineRect = (line, col = null, len = null) => {
    const s = c.lines[line] ?? "";
    const c0 = col ?? s.length - s.trimStart().length;
    return c.rect(ctx, cx, cy, line, c0, len ?? s.length - c0);
  };
  withAlpha(ctx, alpha, () => {
    panel(ctx, { x, y, w: W, h: H, title, titleColor, titleFont, accent, glow });
    for (const h of hl) {
      if (!(h.u > 0)) continue;
      const r = lineRect(h.line, h.col ?? null, h.len ?? null);
      withAlpha(ctx, h.u, () => {
        fillRR(ctx, r.x - 8, r.y - 2, r.w + 16, r.h + 4, 7, rgba(h.color ?? C.accent, 0.2));
        fillRR(ctx, x + 7, r.y + 2, 4, r.h - 4, 2, h.color ?? C.accent);
      });
    }
    c.draw(ctx, cx, cy, { style: withKw(style) });
  });
  return { x, y, w: W, h: H, code: c, cx, cy, lineRect };
}

// ---------------------------------------------------------- platform look

// The shared browser glyph (30 x 24 at w = 30), placed by its top-left corner.
export function browserGlyph(ctx, x, y, w = 24, color = PLAT, alpha = 1) {
  withAlpha(ctx, alpha, () => sharedGlyph(ctx, x + w / 2, y + w * 0.4, w / 30, color));
  return { w, h: w * 0.8 };
}

// platformTag's geometry: padX 16, glyph 30 * (h / 42) + 10.
export const platChipWidth = (ctx, label, f = sans(28, 650), h = 50, glyph = true) =>
  16 + (glyph ? 30 * (h / 42) + 10 : 0) + measure(ctx, label, f) + 16;

// A platform feature as a pill (the shared platformTag). active 0..1 lights it.
export function platChip(ctx, { x, y, label, font: f = sans(28, 650), h = 50, alpha = 1, active = 1, glow = 0, align = "left",
  color = PLAT, glyph = true, scale = 1 }) {
  const w = platChipWidth(ctx, label, f, h, glyph);
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  const a = alpha * lerp(0.4, 1, active);
  if (a <= 0.001) return { x: x0, y, w, h };
  ctx.save();
  if (scale !== 1) {
    ctx.translate(x0 + w / 2, y + h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-(x0 + w / 2), -(y + h / 2));
  }
  platformTag(ctx, { x: x0, y, text: label, h, font: f, color, alpha: a, glyph: glyph ? "browser" : null, glow });
  ctx.restore();
  return { x: x0, y, w, h };
}

// A platform API call (the shared apiChip), with the extra keywords coloured.
// Returns {x, y, w, h, code, cx, cy}.
export function apiChip(ctx, { x, y, src, size = 28, alpha = 1, glow = 0, align = "left", style = null, h = null, glyph = true }) {
  const r = sharedApiChip(ctx, { x, y, code: src, size, align, alpha, glow, style: withKw(style), glyph, h });
  return { ...r, cx: r.codeX, cy: r.codeY };
}

// A platform object: a panel whose title strip carries the browser glyph.
export function platBox(ctx, { x, y, w, h, title, titleFont = mono(24, 550), alpha = 1, glow = 0, color = PLAT, head = 48, fill = C.panel, dashed = false }) {
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, x, y, w, h, 14, fill);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.clip();
    ctx.fillStyle = rgba(color, 0.1);
    ctx.fillRect(x, y, w, head);
    ctx.fillStyle = rgba(color, 0.35);
    ctx.fillRect(x, y + head - 1, w, 1);
    ctx.restore();
    if (glow > 0) withGlow(ctx, rgba(color, 0.8 * glow), 26 * glow, () => strokeRR(ctx, x, y, w, h, 14, rgba(color, glow), 2.5));
    browserGlyph(ctx, x + 18, y + head / 2 - 9, 24, color, 0.95);
    text(ctx, title, x + 56, y + head / 2 + 1, { font: titleFont, color, baseline: "middle" });
    ctx.save();
    if (dashed) ctx.setLineDash([10, 7]);
    strokeRR(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 14, rgba(color, 0.5), 1.5);
    ctx.restore();
  });
}

// ---------------------------------------------------------------- topics

// The component layer's platform features: the chips the components scene
// introduces, then carries at the top as its sections (and batching's).
export const TOPICS = ["Custom elements", "Shadow DOM", "Constructable stylesheets", "Microtasks"];
export const TOPIC_FONT = sans(28, 650), TOPIC_H = 50;

export function topicSlots(ctx, x0 = 80, y = 46, gap = 16) {
  let x = x0;
  return TOPICS.map((label) => {
    const w = platChipWidth(ctx, label, TOPIC_FONT, TOPIC_H);
    const r = { x, y, w, h: TOPIC_H };
    x += w + gap;
    return r;
  });
}

// weights[i] in 0..1: how lit topic i is. pos[i] (optional) overrides a slot.
export function topicRow(ctx, { weights, alpha = 1, pos = null, alphas = null }) {
  const slots = topicSlots(ctx);
  TOPICS.forEach((label, i) => {
    const p = pos?.[i] ?? slots[i];
    const a = weights[i];
    platChip(ctx, { x: p.x, y: p.y, label, font: TOPIC_FONT, h: TOPIC_H, active: a, glow: 0.55 * a, alpha: alpha * (alphas?.[i] ?? 1) });
  });
  return slots;
}

// ------------------------------------------------------------ small pieces

// Chips flowed left to right within maxW. items: [{label, font}]. Returns rects.
export function flowChips(ctx, items, x0, y0, maxW, { h = 50, gapX = 14, gapY = 16, glyph = true } = {}) {
  const out = [];
  let x = x0, y = y0;
  for (const it of items) {
    const w = platChipWidth(ctx, it.label, it.font, h, glyph);
    if (x > x0 && x + w > x0 + maxW) { x = x0; y += h + gapY; }
    out.push({ x, y, w, h });
    x += w + gapX;
  }
  return out;
}

// A stylesheet: a page with a folded corner and its rules as coloured lines
// ([[{text, color}]], mono). Returns the page rect.
export function sheetIcon(ctx, { x, y, w, h, alpha = 1, glow = 0, color = PLAT, lines = [], size = 24, fold = 34, fill = C.panel }) {
  withAlpha(ctx, alpha, () => {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x + 12, y);
      ctx.lineTo(x + w - fold, y);
      ctx.lineTo(x + w, y + fold);
      ctx.lineTo(x + w, y + h - 12);
      ctx.quadraticCurveTo(x + w, y + h, x + w - 12, y + h);
      ctx.lineTo(x + 12, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - 12);
      ctx.lineTo(x, y + 12);
      ctx.quadraticCurveTo(x, y, x + 12, y);
      ctx.closePath();
    };
    ctx.save();
    ctx.shadowColor = glow > 0 ? rgba(color, 0.7 * glow) : "rgba(0,0,0,0.45)";
    ctx.shadowBlur = glow > 0 ? 40 * glow : 24;
    ctx.shadowOffsetY = glow > 0 ? 0 : 8;
    path();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
    path();
    ctx.fillStyle = rgba(color, 0.06);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.55 + 0.4 * glow);
    ctx.lineWidth = 1.5 + glow;
    ctx.stroke();
    // the fold
    ctx.beginPath();
    ctx.moveTo(x + w - fold, y);
    ctx.lineTo(x + w - fold, y + fold);
    ctx.lineTo(x + w, y + fold);
    ctx.closePath();
    ctx.fillStyle = rgba(color, 0.22);
    ctx.fill();
    ctx.strokeStyle = rgba(color, 0.55);
    ctx.lineWidth = 1.2;
    ctx.stroke();
    const adv = monoAdvance(ctx, size, 500);
    lines.forEach((segs, i) => {
      let cx = x + 26;
      const by = y + fold + 18 + i * size * 1.5 + size * 0.5;
      for (const s of segs) {
        text(ctx, s.text, cx, by, { font: mono(size, 500), color: s.color ?? C.text, baseline: "middle" });
        cx += s.text.length * adv;
      }
    });
  });
  return { x, y, w, h };
}

// The rule `sel { prop: value; ... }` as sheetIcon lines.
export function cssLines(sel, decls) {
  return [
    [{ text: sel, color: SYN.tag }, { text: " {", color: SYN.punct }],
    ...decls.map(([p, v]) => [{ text: "  " + p, color: DOMC.attr }, { text: ": ", color: SYN.punct }, { text: v, color: DOMC.value }, { text: ";", color: SYN.punct }]),
    [{ text: "}", color: SYN.punct }],
  ];
}

// A labelled number in a panel (like episode 1's "DOM writes").
export function statBox(ctx, { x, y, w = 360, h = 96, label, value, alpha = 1, glow = 0, bump = 0, labelFont = mono(26, 500), color = C.accent }) {
  withAlpha(ctx, alpha, () => {
    panel(ctx, { x, y, w, h, accent: color, glow, r: 16 });
    text(ctx, label, x + 24, y + h / 2 + 1, { font: labelFont, color: C.text2, baseline: "middle" });
    const k = 1 + 0.25 * bump;
    ctx.save();
    ctx.translate(x + w - 50, y + h / 2);
    ctx.scale(k, k);
    text(ctx, value, 0, 3, { font: sans(56, 750), color: C.text, align: "center", baseline: "middle" });
    ctx.restore();
  });
}

// A strings array as slivers (episode 1's miniStrings, with n of them).
export function stringsGlyph(ctx, x, y, n, color = C.text2, k = 1) {
  ctx.save();
  ctx.fillStyle = color;
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.roundRect(x + i * 11 * k, y, 8 * k, 24 * k, 2 * k);
    ctx.fill();
  }
  ctx.restore();
}

// One line of HTML from [{text, role}] (DOM view colours), left edge x,
// vertically centred on y. Returns the x extent of every segment.
const ROLE = { punct: DOMC.punct, tag: DOMC.tag, attrName: DOMC.attr, attrValue: DOMC.value, comment: DOMC.comment, text: DOMC.text, ws: DOMC.whitespace };
export function htmlSegs(ctx, segs, x, y, { size = 28, weight = 450, alpha = 1, style = null } = {}) {
  const a = monoAdvance(ctx, size, weight);
  const out = [];
  let cx = x;
  withAlpha(ctx, alpha, () => {
    ctx.save();
    setFont(ctx, mono(size, weight));
    ctx.textBaseline = "middle";
    segs.forEach((s, i) => {
      const st = style ? style(s, i) ?? {} : {};
      const w = s.text.length * a;
      out.push({ x: cx, w, y: y - size * 0.65, h: size * 1.3 });
      if (!st.hide && (st.alpha ?? 1) > 0) {
        const ga = ctx.globalAlpha;
        ctx.globalAlpha = ga * (st.alpha ?? 1);
        ctx.fillStyle = st.color ?? s.color ?? ROLE[s.role] ?? DOMC.text;
        ctx.fillText(s.text, cx, y + 1);
        ctx.globalAlpha = ga;
      }
      cx += w;
    });
    ctx.restore();
  });
  return out;
}

// Parses a little HTML string into htmlSegs segments (tags, attributes, text).
export function htmlOf(src) {
  const out = [];
  const re = /(<\/?)([\w-]+)((?:\s+[\w-]+="[^"]*")*)\s*(>)|([^<]+)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[5] !== undefined) { out.push({ text: m[5], role: "text" }); continue; }
    out.push({ text: m[1], role: "punct" }, { text: m[2], role: "tag" });
    for (const a of m[3].matchAll(/\s+([\w-]+)="([^"]*)"/g)) {
      out.push({ text: " ", role: "punct" }, { text: a[1], role: "attrName", attr: a[1] }, { text: '="', role: "punct", attr: a[1] },
        { text: a[2], role: "attrValue", attr: a[1] }, { text: '"', role: "punct", attr: a[1] });
    }
    out.push({ text: m[4], role: "punct" });
  }
  return out;
}

// A strike-through drawn left to right as u goes 0 -> 1.
export function strikeThrough(ctx, r, u, color = C.bad, width = 3) {
  if (u <= 0) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(r.x - 4, r.y + r.h / 2 - width / 2, (r.w + 8) * clamp(u), width);
  ctx.restore();
}

// A small outlined label (tinted fill, coloured border and text).
export function tag(ctx, { x, y, text: str, color = C.text2, font: f = sans(22, 650), h = 36, alpha = 1, align = "left", fill = 0.12, dashed = false }) {
  const w = measure(ctx, str, f) + 28;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  withAlpha(ctx, alpha, () => {
    if (!dashed) fillRR(ctx, x0, y, w, h, h / 2, rgba(color, fill));
    ctx.save();
    if (dashed) ctx.setLineDash([6, 6]);
    strokeRR(ctx, x0 + 1, y + 1, w - 2, h - 2, h / 2, rgba(color, 0.75), 2);
    ctx.restore();
    text(ctx, str, x0 + w / 2, y + h / 2 + 1, { font: f, color, align: "center", baseline: "middle" });
  });
  return { x: x0, y, w, h };
}
