// Helpers for the clone and events scenes (episode 2), kept out of the shared
// kit while other scenes are written in parallel.
//
// The platform look is episode 2's shared one (intro-platform.js: PLAT lime,
// the browser glyph, apiChip, platformTag, evalBadge); these wrap it:
//   platCall(ctx, {x, y, code, marks, ring, hl, reveal})  the shared apiChip, plus rings /
//                                                         washes on named substrings and a
//                                                         left-to-right reveal; returns their rects
//   platPanel(ctx, {x, y, w, h, title, sub})              a browser-side container (a document,
//                                                         an event listener list), PLAT-edged
//   track / steps                                         keyframed object states (as create-comp.js)
//   curve / drawPoly / at / packet / dot                  paths values travel along (as create-comp.js)
//   pieces, eyeOff, hopArc, walkerBadge, nodeCell

import { C, DOMC, rgba } from "../kit/theme.js";
import { fillRR, measure, mono, sans, strokeRR, text, withAlpha, withGlow } from "../kit/draw.js";
import { clamp, ease, lerp } from "../util.js";
import { PLAT, apiChip, browserGlyph, evalBadge, platformTag } from "./intro-platform.js";

export { PLAT, browserGlyph, evalBadge, platformTag };

// ------------------------------------------------------------ platform look

// A DOM API call: the shared apiChip. marks: {key: "substring"} (or [substring, nth])
// names pieces of the code; ring: {key: u} rings a piece (ringColor[key]), hl: {key: u}
// washes it (hlColor[key]); colours default to PLAT. reveal 0..1 shows the code left to right.
// Returns the chip's geometry plus keys: {key: {x, y, w, h, cx, cy}}.
export function platCall(ctx, { x, y, code, size = 34, align = "left", alpha = 1, glow = 0, marks = {}, ring = {}, hl = {}, hlColor = {}, ringColor = {}, reveal = 1, style = null }) {
  const cols = reveal >= 1 ? Infinity : Math.round(code.length * clamp(reveal));
  const st = (tok) => {
    if (tok.col >= cols) return { hide: true };
    return style ? style(tok) : null;
  };
  const g = apiChip(ctx, { x, y, code, size, align, alpha, glow, style: st });
  g.keys = {};
  for (const [key, m] of Object.entries(marks)) {
    const [sub, nth] = Array.isArray(m) ? m : [m, 0];
    const f = g.code.find(sub, nth);
    const r = g.code.rect(ctx, g.codeX, g.codeY, f.line, f.col, f.len);
    r.cx = r.x + r.w / 2;
    r.cy = r.y + r.h / 2;
    g.keys[key] = r;
  }
  withAlpha(ctx, alpha, () => {
    for (const [key, r] of Object.entries(g.keys)) {
      const col = hlColor[key] ?? PLAT;
      const u = hl[key] ?? 0;
      if (u > 0) withAlpha(ctx, u, () => fillRR(ctx, r.x - 4, r.y - 1, r.w + 8, r.h + 2, 8, rgba(col, 0.2)));
      const rg = ring[key] ?? 0;
      const rc = ringColor[key] ?? hlColor[key] ?? PLAT;
      if (rg > 0) withAlpha(ctx, rg, () => withGlow(ctx, rgba(rc, 0.9), 16, () => strokeRR(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 9, rc, 2.5)));
    }
  });
  return g;
}

// A browser-side container: a document, the browser's event listener list.
// The kit's panel look, PLAT-edged, the browser glyph and a title; optional sub.
export function platPanel(ctx, { x, y, w, h, title, sub = null, alpha = 1, glow = 0, head = 56, titleSize = 26, titleFont = null, fill = C.panel, dashed = false }) {
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    fillRR(ctx, x, y, w, h, 16, fill);
    ctx.restore();
    if (glow > 0) withGlow(ctx, rgba(PLAT, 0.8 * glow), 28 * glow, () => strokeRR(ctx, x, y, w, h, 16, rgba(PLAT, glow), 2.5));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.clip();
    ctx.fillStyle = C.panel2;
    ctx.fillRect(x, y, w, head);
    ctx.fillStyle = rgba(PLAT, 0.08);
    ctx.fillRect(x, y, w, head);
    ctx.fillStyle = rgba(PLAT, 0.35);
    ctx.fillRect(x, y + head - 1.5, w, 1.5);
    ctx.restore();
    browserGlyph(ctx, x + 34, y + head / 2, 0.9, PLAT);
    text(ctx, title, x + 62, y + head / 2 + 1, { font: titleFont ?? sans(titleSize, 650), color: C.text, baseline: "middle" });
    if (sub) text(ctx, sub, x + w - 22, y + head / 2 + 1, { font: sans(titleSize * 0.8, 500), color: C.text3, baseline: "middle", align: "right" });
    ctx.save();
    if (dashed) ctx.setLineDash([10, 8]);
    strokeRR(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 16, rgba(PLAT, 0.45), 1.5);
    ctx.restore();
  });
}

// ------------------------------------------------------------ keyframes

// Object state {x, y, k, a} through keyframes [[time, state], ...]; each change
// eases over state.dur (default 0.9 s) from its time.
export function track(t, keys, dur = 0.9) {
  let s = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, sk] = keys[i];
    const u = ease.inOutCubic(clamp((t - tk) / (sk.dur ?? dur)));
    if (u <= 0) break;
    const n = {};
    for (const key in s) n[key] = typeof s[key] === "number" && typeof sk[key] === "number" ? lerp(s[key], sk[key], u) : s[key];
    s = n;
  }
  return s;
}

// A number through keyframes [[time, value], ...].
export function steps(t, v0, keys, dur = 0.45) {
  let v = v0;
  for (const [tk, vk] of keys) {
    const u = ease.inOutCubic(clamp((t - tk) / dur));
    if (u <= 0) break;
    v = lerp(v, vk, u);
  }
  return v;
}

// ------------------------------------------------------------ paths

function bez(a, b, c, d, u) {
  const v = 1 - u;
  return {
    x: v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x,
    y: v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y,
  };
}
function poly(pts) {
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, len, total: len.at(-1) || 1 };
}
// A cubic from a to b with control points c1, c2, as a polyline with arc length.
export function curve(a, c1, c2, b, n = 48) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(bez(a, c1, c2, b, i / n));
  return poly(pts);
}
// Leaves a horizontally, arrives at b horizontally.
export const sLink = (a, b, k = 0.45) => curve(a, { x: a.x + (b.x - a.x) * k, y: a.y }, { x: b.x - (b.x - a.x) * k, y: b.y }, b);
// Leaves a vertically, arrives at b vertically.
export const vLink = (a, b, k = 0.5) => curve(a, { x: a.x, y: a.y + (b.y - a.y) * k }, { x: b.x, y: b.y - (b.y - a.y) * k }, b);

export function at(Pl, u) {
  const L = clamp(u) * Pl.total;
  let i = 1;
  while (i < Pl.len.length - 1 && Pl.len[i] < L) i++;
  const a = Pl.pts[i - 1], b = Pl.pts[i];
  const k = (L - Pl.len[i - 1]) / (Pl.len[i] - Pl.len[i - 1] || 1);
  return { x: lerp(a.x, b.x, clamp(k)), y: lerp(a.y, b.y, clamp(k)), ang: Math.atan2(b.y - a.y, b.x - a.x) };
}

export function drawPoly(ctx, Pl, { from = 0, to = 1, color, width = 3, alpha = 1, head = 13, dash = null, glow = 0 }) {
  if (to <= from + 0.001 || alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (glow > 0) { ctx.shadowColor = rgba(color, 0.85 * glow); ctx.shadowBlur = 18 * glow; }
  if (dash) ctx.setLineDash(dash);
  const a = from * Pl.total, b = to * Pl.total;
  const s = at(Pl, from);
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  for (let i = 1; i < Pl.pts.length; i++) if (Pl.len[i] > a && Pl.len[i] < b) ctx.lineTo(Pl.pts[i].x, Pl.pts[i].y);
  const e = at(Pl, to);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();
  if (head > 0) {
    const q = at(Pl, Math.max(0, to - 6 / Pl.total));
    const ang = Math.atan2(e.y - q.y, e.x - q.x);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(ang) * 2, e.y + Math.sin(ang) * 2);
    ctx.lineTo(e.x - Math.cos(ang - 0.45) * head, e.y - Math.sin(ang - 0.45) * head);
    ctx.lineTo(e.x - Math.cos(ang + 0.45) * head, e.y - Math.sin(ang + 0.45) * head);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function dot(ctx, x, y, r, color, alpha = 1, glow = 1) {
  withAlpha(ctx, alpha, () => withGlow(ctx, rgba(color, 0.9), 14 * glow, () => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }));
}

// A value travelling along a path: a glowing dot with a short trail.
export function packet(ctx, Pl, u, color, alpha = 1) {
  if (u <= 0 || u >= 1 || alpha <= 0) return;
  for (let i = 5; i >= 0; i--) {
    const p = at(Pl, u - i * 0.018);
    dot(ctx, p.x, p.y, 9 - i * 1.2, color, alpha * (i === 0 ? 1 : 0.25 * (1 - i / 6)), i === 0 ? 1.4 : 0);
  }
}

// ------------------------------------------------------------ small pieces

// Text in pieces [{s, font, color}] from x (or centred on x); returns the width.
export function pieces(ctx, ps, x, y, { alpha = 1, align = "left" } = {}) {
  const total = ps.reduce((n, p) => n + measure(ctx, p.s, p.font), 0);
  let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
  withAlpha(ctx, alpha, () => {
    for (const p of ps) cx += text(ctx, p.s, cx, y, { font: p.font, color: p.color, baseline: "middle" });
  });
  return total;
}

// An eye with a slash through it (not rendered), centred on (x, y).
export function eyeOff(ctx, x, y, s, color, u = 1) {
  if (u <= 0) return;
  withAlpha(ctx, clamp(u), () => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = s * 0.09;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(x - s * 0.5, y);
    ctx.quadraticCurveTo(x, y - s * 0.52, x + s * 0.5, y);
    ctx.quadraticCurveTo(x, y + s * 0.52, x - s * 0.5, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, s * 0.14, 0, Math.PI * 2);
    ctx.fill();
    const k = clamp(u * 1.6 - 0.3);
    if (k > 0) {
      ctx.beginPath();
      ctx.moveTo(x - s * 0.42, y - s * 0.42);
      ctx.lineTo(x - s * 0.42 + s * 0.84 * k, y - s * 0.42 + s * 0.84 * k);
      ctx.stroke();
    }
    ctx.restore();
  });
}

// A hop arrow over rows the walker skips: from y0 to y1 at x, bulging left by `bulge`.
export function hopArc(ctx, x, y0, y1, { color = PLAT, u = 1, alpha = 1, bulge = 34, width = 2.5 } = {}) {
  if (u <= 0 || alpha <= 0) return;
  const Pl = curve({ x, y: y0 }, { x: x - bulge, y: y0 + (y1 - y0) * 0.15 }, { x: x - bulge, y: y1 - (y1 - y0) * 0.15 }, { x, y: y1 });
  drawPoly(ctx, Pl, { to: u, color, width, alpha, head: 10 });
}

// The TreeWalker's badge: a disc with a pointer, like episode 1's walk.
export function walkerBadge(ctx, x, y, { alpha = 1, r = 22, label = null, color = PLAT } = {}) {
  if (alpha <= 0) return;
  withAlpha(ctx, alpha, () => {
    withGlow(ctx, rgba(color, 0.8), 16, () => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
    ctx.beginPath();
    ctx.moveTo(x + r + 5, y - 9);
    ctx.lineTo(x + r + 17, y);
    ctx.lineTo(x + r + 5, y + 9);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    if (label !== null) text(ctx, label, x, y + 1, { font: mono(r * 1.1, 750), color: C.bg, align: "center", baseline: "middle" });
  });
}

// One DOM node as a cell (a text node or a comment), like the kit's cells().
// Returns its width. w: a fixed width (for animating), clip: draw the text clipped to w.
export function nodeCell(ctx, { x, y, str, color, size = 30, alpha = 1, h = null, w = null, bg = C.panel2, border = C.border, hl = 0, hlColor = null, weight = 500 }) {
  const f = mono(size, weight);
  const natural = measure(ctx, str, f) + 30;
  const W = w ?? natural, H = h ?? size * 1.9;
  withAlpha(ctx, alpha, () => {
    fillRR(ctx, x, y - H / 2, W, H, 10, bg);
    strokeRR(ctx, x + 0.5, y - H / 2 + 0.5, W - 1, H - 1, 10, border, 1.5);
    if (hl > 0) withAlpha(ctx, hl, () => withGlow(ctx, rgba(hlColor ?? color, 0.9), 18, () => strokeRR(ctx, x, y - H / 2, W, H, 10, hlColor ?? color, 2.5)));
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y - H / 2, W, H);
    ctx.clip();
    text(ctx, str, x + W / 2, y + 1, { font: f, color, align: "center", baseline: "middle" });
    ctx.restore();
  });
  return natural;
}

// DOM role colours (as kit/tree.js), for text drawn outside a Tree.
export const ROLE = { punct: DOMC.punct, tag: DOMC.tag, attrName: DOMC.attr, attrEq: DOMC.punct, attrValue: DOMC.value, comment: DOMC.comment, text: DOMC.text, ws: DOMC.whitespace };
