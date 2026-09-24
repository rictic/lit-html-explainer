// Drawing helpers for the literal scene that the kit doesn't have (yet):
// a cubic-bezier arrow ("cable") that can leave a port sideways and turn,
// a key glyph, and smoothstep.

import { C, blend, rgba } from "../kit/theme.js";
import { clamp } from "../util.js";

export const smooth = (a, b, u) => {
  const x = clamp((u - a) / (b - a));
  return x * x * (3 - 2 * x);
};

export const blendHex = (a, b, u) => blend(a, b, clamp(u));

// A point on the cubic bezier p0 c1 c2 p1.
export function cubicAt(p0, c1, c2, p1, u) {
  const v = 1 - u;
  return {
    x: v * v * v * p0.x + 3 * v * v * u * c1.x + 3 * v * u * u * c2.x + u * u * u * p1.x,
    y: v * v * v * p0.y + 3 * v * v * u * c1.y + 3 * v * u * u * c2.y + u * u * u * p1.y,
  };
}

// A cubic-bezier arrow from p0 to p1, drawn up to `progress`, with a head.
export function cable(ctx, p0, c1, c2, p1, { color = C.accent, width = 3, progress = 1, head = 12, alpha = 1, dash = null, glow = 0 } = {}) {
  if (progress <= 0 || alpha <= 0) return p0;
  const p = clamp(progress);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (glow > 0) { ctx.shadowColor = rgba(C.accent, 0.9 * glow); ctx.shadowBlur = 18 * glow; ctx.lineWidth = width + 1.5 * glow; }
  if (dash) ctx.setLineDash(dash);
  const N = 60;
  ctx.beginPath();
  for (let i = 0; i <= N; i++) {
    const q = cubicAt(p0, c1, c2, p1, (i / N) * p);
    if (i === 0) ctx.moveTo(q.x, q.y);
    else ctx.lineTo(q.x, q.y);
  }
  ctx.stroke();
  const end = cubicAt(p0, c1, c2, p1, p);
  if (head > 0) {
    const prev = cubicAt(p0, c1, c2, p1, Math.max(0, p - 0.02));
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

// A key, its bow centred at (x, y), pointing right. k scales it (1 = ~52 px long).
export function drawKey(ctx, x, y, k = 1, color = "#ffd166") {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  // bow
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.stroke();
  // shaft
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.lineTo(44, 0);
  // bit (two teeth)
  ctx.moveTo(34, 0);
  ctx.lineTo(34, 9);
  ctx.moveTo(43, 0);
  ctx.lineTo(43, 11);
  ctx.stroke();
  ctx.restore();
}
