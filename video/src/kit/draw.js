// Drawing primitives: rounded rects, text, panels, chips, arrows, glows.
// All coordinates are logical 1920x1080 px. Functions that change canvas
// state restore it before returning.

import { font } from "../fonts.js";
import { C, FONT, rgba } from "./theme.js";
import { clamp, lerp } from "../util.js";

export function rrect(ctx, x, y, w, h, r = 12) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function fillRR(ctx, x, y, w, h, r, fill) {
  rrect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function strokeRR(ctx, x, y, w, h, r, stroke, width = 2) {
  rrect(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}

// Runs fn with globalAlpha multiplied by a (skips it entirely at 0).
export function withAlpha(ctx, a, fn) {
  if (a <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= clamp(a);
  fn();
  ctx.restore();
}

// Runs fn scaled by k about (cx, cy).
export function withScale(ctx, k, cx, cy, fn) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(k, k);
  ctx.translate(-cx, -cy);
  fn();
  ctx.restore();
}

// Runs fn with a coloured glow (shadowBlur) on everything it draws.
export function withGlow(ctx, color, blur, fn) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

// ------------------------------------------------------------------ text

export const mono = (size, weight = 450, style) => font(FONT.mono, size, weight, style);

// Sets the canvas font. Monospace text is drawn without ligatures: JetBrains
// Mono's contextual alternates turn "<!--" and "=>" into arrows, and this
// video is about exactly those characters.
export function setFont(ctx, f) {
  ctx.font = f;
  ctx.textRendering = f.includes(FONT.mono) ? "optimizeSpeed" : "optimizeLegibility";
}
export const sans = (size, weight = 450, style) => font(FONT.sans, size, weight, style);

// Advance of one monospace character at `size` px.
const ADV = new Map();
export function monoAdvance(ctx, size, weight = 450) {
  const k = `${weight}`;
  if (!ADV.has(k)) {
    ctx.save();
    setFont(ctx, mono(100, weight));
    ADV.set(k, ctx.measureText("MMMMMMMMMM").width / 1000);
    ctx.restore();
  }
  return ADV.get(k) * size;
}

export function measure(ctx, str, f) {
  ctx.save();
  setFont(ctx, f);
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

// Draws a string. opts: font (a canvas font string), color, align
// ("left"|"center"|"right"), baseline ("alphabetic"|"middle"|"top"),
// alpha. Returns the width.
export function text(ctx, str, x, y, { font: f = sans(32), color = C.text, align = "left", baseline = "alphabetic", alpha = 1 } = {}) {
  ctx.save();
  setFont(ctx, f);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.globalAlpha *= alpha;
  ctx.fillText(str, x, y);
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

// Word-wraps `str` to `maxW` and draws it; returns the height used.
export function paragraph(ctx, str, x, y, maxW, { font: f = sans(30), color = C.text2, lineHeight = 1.4, align = "left", alpha = 1 } = {}) {
  ctx.save();
  setFont(ctx, f);
  const size = parseFloat(/(\d+(?:\.\d+)?)px/.exec(f)[1]);
  const lines = [];
  let line = "";
  for (const word of str.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxW && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha *= alpha;
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * lineHeight));
  ctx.restore();
  return lines.length * size * lineHeight;
}

// ------------------------------------------------------------ containers

// A panel: rounded body, optional header strip with a title.
//   panel(ctx, {x, y, w, h, title, titleFont, accent, alpha, fill, border, header: 44})
export function panel(ctx, { x, y, w, h, title = null, titleColor = C.text2, titleFont = sans(20, 600), accent = null,
  alpha = 1, fill = C.panel, border = C.border, header = 44, r = 16, glow = 0 }) {
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    fillRR(ctx, x, y, w, h, r, fill);
    ctx.restore();
    if (glow > 0 && accent) withGlow(ctx, rgba(accent, 0.8 * glow), 28 * glow, () => strokeRR(ctx, x, y, w, h, r, rgba(accent, glow), 2));
    if (title !== null) {
      ctx.save();
      rrect(ctx, x, y, w, h, r);
      ctx.clip();
      ctx.fillStyle = C.panel2;
      ctx.fillRect(x, y, w, header);
      ctx.fillStyle = C.border;
      ctx.fillRect(x, y + header - 1, w, 1);
      ctx.restore();
      if (accent) fillRR(ctx, x + 18, y + header / 2 - 5, 10, 10, 5, accent);
      text(ctx, title, x + (accent ? 38 : 20), y + header / 2 + 1, { font: titleFont, color: titleColor, baseline: "middle" });
    }
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r, border, 1.5);
  });
}

// A pill-shaped label. Returns {w, h}. align: "left" | "center" (x is the centre).
//   chip(ctx, {x, y, text, color, bg, font, padX, h, alpha, border, align})
export function chip(ctx, { x, y, text: str, color = C.text, bg = C.panel3, font: f = sans(22, 600), padX = 14, h = 38,
  alpha = 1, border = null, align = "left", r = null, glow = 0 }) {
  const w = measure(ctx, str, f) + padX * 2;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  withAlpha(ctx, alpha, () => {
    if (glow > 0) withGlow(ctx, rgba(border ?? color, 0.9 * glow), 22 * glow, () => fillRR(ctx, x0, y, w, h, r ?? h / 2, bg));
    else fillRR(ctx, x0, y, w, h, r ?? h / 2, bg);
    if (border) strokeRR(ctx, x0, y, w, h, r ?? h / 2, border, 2);
    text(ctx, str, x0 + w / 2, y + h / 2 + 1, { font: f, color, align: "center", baseline: "middle" });
  });
  return { w, h, x: x0 };
}

// A focus ring around a rect, drawn with a glow; u in [0,1] fades it.
export function ring(ctx, { x, y, w, h, r = 10, color = C.accent, u = 1, pad = 6, width = 3 }) {
  if (u <= 0) return;
  withAlpha(ctx, u, () => withGlow(ctx, rgba(color, 0.9), 18, () => strokeRR(ctx, x - pad, y - pad, w + pad * 2, h + pad * 2, r + pad / 2, color, width)));
}

// A soft highlight behind a rect (for code spans, DOM rows).
export function wash(ctx, { x, y, w, h, color, u = 1, r = 6, pad = 3 }) {
  if (u <= 0) return;
  withAlpha(ctx, u, () => fillRR(ctx, x - pad, y - pad, w + pad * 2, h + pad * 2, r, rgba(color, 0.2)));
}

// --------------------------------------------------------------- arrows

// Quadratic-bezier arrow from a to b, bending by `bend` (px, perpendicular
// to the chord; negative bends the other way). progress in [0,1] draws it
// partially, from a. Returns the point at `progress`.
export function arrow(ctx, a, b, { color = C.accent, width = 3, bend = 0, progress = 1, head = 12, alpha = 1, dash = null, glow = 0 } = {}) {
  if (progress <= 0 || alpha <= 0) return a;
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const c = { x: mx - (dy / len) * bend, y: my + (dx / len) * bend };
  const at = (u) => ({
    x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
    y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y,
  });
  const p = clamp(progress);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (dash) ctx.setLineDash(dash);
  if (glow > 0) { ctx.shadowColor = rgba(color, 0.8 * glow); ctx.shadowBlur = 16 * glow; }
  ctx.beginPath();
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const q = at((i / N) * p);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  }
  ctx.stroke();
  const end = at(p);
  if (head > 0) {
    const prev = at(Math.max(0, p - 0.02));
    const ang = Math.atan2(end.y - prev.y, end.x - prev.x);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(end.x + Math.cos(ang) * 2, end.y + Math.sin(ang) * 2);
    ctx.lineTo(end.x - Math.cos(ang - 0.45) * head, end.y - Math.sin(ang - 0.45) * head);
    ctx.lineTo(end.x - Math.cos(ang + 0.45) * head, end.y - Math.sin(ang + 0.45) * head);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  return end;
}

// A point moving along the same curve as arrow() (for things that travel).
export function along(a, b, u, bend = 0) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const c = { x: mx - (dy / len) * bend, y: my + (dx / len) * bend };
  return {
    x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
    y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y,
  };
}

// Check mark / cross icons, centred on (x, y).
export function check(ctx, x, y, size = 20, color = C.ok, u = 1) {
  if (u <= 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  const p = [[-0.45, 0.02], [-0.12, 0.34], [0.48, -0.36]];
  const segs = u * 2;
  ctx.moveTo(x + p[0][0] * size, y + p[0][1] * size);
  for (let i = 1; i <= 2; i++) {
    const k = clamp(segs - (i - 1));
    if (k <= 0) break;
    ctx.lineTo(x + lerp(p[i - 1][0], p[i][0], k) * size, y + lerp(p[i - 1][1], p[i][1], k) * size);
  }
  ctx.stroke();
  ctx.restore();
}

export function cross(ctx, x, y, size = 20, color = C.bad, u = 1) {
  if (u <= 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.16;
  ctx.lineCap = "round";
  const k = size * 0.4;
  const a = clamp(u * 2), b = clamp(u * 2 - 1);
  ctx.beginPath();
  ctx.moveTo(x - k, y - k);
  ctx.lineTo(x - k + 2 * k * a, y - k + 2 * k * a);
  if (b > 0) {
    ctx.moveTo(x + k, y - k);
    ctx.lineTo(x + k - 2 * k * b, y - k + 2 * k * b);
  }
  ctx.stroke();
  ctx.restore();
}
