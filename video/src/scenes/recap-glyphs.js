// Small pieces for recap (and outro): icon-sized echoes of the video's
// objects (the strings array, the template cache, a TemplateInstance, the
// Parts), a phase pill styled like the HUD's, mixed text-and-glyph runs, a
// bracket, and HTML source drawn with DOM colours.

import { B, C, DOMC, rgba } from "../kit/theme.js";
import { OBJ, miniStrings } from "../kit/lit.js";
import { fillRR, measure, mono, sans, strokeRR, text, withAlpha, withGlow } from "../kit/draw.js";

// A strings array glyph (four slivers, as in cacheTable) centred on (cx, cy).
// k scales it: at k = 1 it is 41 x 24 px.
export function stringsGlyph(ctx, cx, cy, k = 1, color = C.text) {
  miniStrings(ctx, cx - 20.5 * k, cy - 12 * k, color, k);
}

// The template cache: a small gold table, two entries of
// strings glyph -> Template (lavender). About 96 x 80 px at s = 1.
export function cacheGlyph(ctx, cx, cy, s = 1) {
  const w = 96 * s, h = 80 * s, x = cx - w / 2, y = cy - h / 2;
  fillRR(ctx, x, y, w, h, 10 * s, C.panel);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10 * s);
  ctx.clip();
  ctx.fillStyle = rgba(OBJ.cache, 0.35);
  ctx.fillRect(x, y, w, 18 * s);
  ctx.restore();
  strokeRR(ctx, x + 1, y + 1, w - 2, h - 2, 10 * s, rgba(OBJ.cache, 0.85), 2 * s);
  for (let i = 0; i < 2; i++) {
    const ry = y + 34 * s + i * 24 * s;
    miniStrings(ctx, x + 11 * s, ry - 7 * s, C.text2, 0.58 * s);
    ctx.fillStyle = C.text3;
    ctx.fillRect(x + 42 * s, ry - 1 * s, 14 * s, 2 * s);
    fillRR(ctx, x + 62 * s, ry - 7 * s, 24 * s, 14 * s, 3 * s, OBJ.template);
  }
}

// A TemplateInstance: a sky card holding a small cloned DOM tree, with a
// dot in each binding colour for its three parts. About 96 x 80 px at s = 1.
export function instanceGlyph(ctx, cx, cy, s = 1) {
  const w = 96 * s, h = 80 * s, x = cx - w / 2, y = cy - h / 2;
  fillRR(ctx, x, y, w, h, 10 * s, C.panel);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10 * s);
  ctx.clip();
  ctx.fillStyle = rgba(OBJ.instance, 0.3);
  ctx.fillRect(x, y, w, 16 * s);
  ctx.restore();
  strokeRR(ctx, x + 1, y + 1, w - 2, h - 2, 10 * s, rgba(OBJ.instance, 0.85), 2 * s);
  const rows = [[12, 38], [24, 26], [12, 44]];
  rows.forEach(([dx, len], i) => {
    const ry = y + 30 * s + i * 16 * s;
    fillRR(ctx, x + dx * s, ry - 3 * s, len * s, 6 * s, 3 * s, rgba(OBJ.instance, 0.6));
    ctx.beginPath();
    ctx.arc(x + (dx + len + 12) * s, ry, 4.5 * s, 0, Math.PI * 2);
    ctx.fillStyle = B[i];
    ctx.fill();
  });
}

// Three Parts, one per binding colour, each holding its last value (the
// filled slot at its right). About 96 x 82 px at s = 1.
export function partsGlyph(ctx, cx, cy, s = 1) {
  const w = 96 * s, h = 22 * s, gap = 8 * s;
  const y0 = cy - (3 * h + 2 * gap) / 2;
  for (let i = 0; i < 3; i++) {
    const x = cx - w / 2, y = y0 + i * (h + gap);
    fillRR(ctx, x, y, w, h, 6 * s, rgba(B[i], 0.16));
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 6 * s, rgba(B[i], 0.9), 1.8 * s);
    fillRR(ctx, x + 10 * s, y + h / 2 - 2 * s, 30 * s, 4 * s, 2 * s, rgba(B[i], 0.55));
    fillRR(ctx, x + w - 34 * s, y + 5 * s, 26 * s, h - 10 * s, 3 * s, B[i]);
  }
}

// A phase pill like the HUD's (kit/hud.js), at any size. state: "active"
// (accent), "idle", or "lit" (active plus a glow of strength `glow`).
export function phasePill(ctx, { x, y, w = 200, h = 48, label, state = "active", glow = 0, alpha = 1, font = null }) {
  withAlpha(ctx, alpha, () => {
    const st = state === "idle"
      ? { fill: "rgba(0,0,0,0)", border: C.border2, text: C.text3 }
      : { fill: rgba(C.accent, 0.22), border: C.accent, text: C.white };
    if (glow > 0) withGlow(ctx, rgba(C.accent, 0.8 * glow), 22 * glow, () => fillRR(ctx, x, y, w, h, h / 2, rgba(C.accent, 0.22 + 0.2 * glow)));
    else fillRR(ctx, x, y, w, h, h / 2, st.fill);
    strokeRR(ctx, x + 1, y + 1, w - 2, h - 2, h / 2, st.border, 2);
    text(ctx, label.toUpperCase(), x + w / 2, y + h / 2 + 1, { font: font ?? sans(h * 0.45, 650), color: st.text, align: "center", baseline: "middle" });
  });
}

// Draws a row of runs left to right, vertically centred on cy. A run is
// {text, font, color} or {w, glyph: (ctx, cx, cy) => void}. Returns the width.
export function runs(ctx, items, x, cy) {
  let w = 0;
  for (const it of items) {
    if (it.glyph) {
      it.glyph(ctx, x + w + it.w / 2, cy);
      w += it.w;
    } else {
      w += text(ctx, it.text, x + w, cy, { font: it.font, color: it.color ?? C.text, baseline: "middle" });
    }
  }
  return w;
}
export function runsWidth(ctx, items) {
  return items.reduce((n, it) => n + (it.glyph ? it.w : measure(ctx, it.text, it.font)), 0);
}

// A square bracket along a vertical span (x, y0..y1), ticks pointing right,
// drawn partially from the top by u.
export function bracket(ctx, x, y0, y1, { color, u = 1, tick = 12, width = 3 }) {
  if (u <= 0) return;
  const y = y0 + (y1 - y0) * Math.min(1, u);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(x + tick, y0);
  ctx.lineTo(x, y0);
  ctx.lineTo(x, y);
  if (u >= 1) ctx.lineTo(x + tick, y1);
  ctx.stroke();
  ctx.restore();
}

// HTML source (a string with tags, comments and text) as runs with DOM
// colours. Returns [{text, color, comment?}] pieces.
export function htmlPieces(src) {
  const out = [];
  for (const tok of src.split(/(<!--[\s\S]*?-->|<\/?[a-zA-Z][^>]*>)/)) {
    if (!tok) continue;
    if (tok.startsWith("<!--")) out.push({ text: tok, color: DOMC.comment, comment: tok.slice(4, -3) });
    else if (tok.startsWith("<")) {
      const m = /^(<\/?)([a-zA-Z][\w-]*)(.*?)(>)$/.exec(tok);
      out.push({ text: m[1], color: DOMC.punct }, { text: m[2], color: DOMC.tag });
      if (m[3]) out.push({ text: m[3], color: DOMC.attr });
      out.push({ text: m[4], color: DOMC.punct });
    } else out.push({ text: tok, color: DOMC.text });
  }
  return out;
}

// Draws htmlPieces in monospace at (x, baseline-middle cy). Returns the
// x-extent of each piece: [{x, w, piece}], so callers can ring comments.
export function drawHtml(ctx, pieces, x, cy, { size = 22, weight = 450, alpha = 1, style = null } = {}) {
  const f = mono(size, weight);
  const out = [];
  let cx = x;
  for (const p of pieces) {
    const w = measure(ctx, p.text, f);
    const st = style ? style(p) ?? {} : {};
    text(ctx, p.text, cx, cy, { font: f, color: st.color ?? p.color, baseline: "middle", alpha: alpha * (st.alpha ?? 1) });
    out.push({ x: cx, w, piece: p });
    cx += w;
  }
  return out;
}
