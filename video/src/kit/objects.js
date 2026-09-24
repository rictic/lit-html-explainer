// JavaScript objects as cards, and arrays as rows of cells.
//
//   const k = card(ctx, { x, y, title: "TemplateResult", color: C.accent,
//     rows: [{ k: "strings", v: "[4]", port: true }, { k: "values", v: "['', 0, ƒ]" }] });
//   k.w, k.h, k.ports.strings -> {x, y} (the dot at the row's right end, for arrows)
//   k.row(i) -> the rect of row i
//
//   const r = cells(ctx, { x, y, items: [{ text: "'odd'", color: B[0] }, ...] });
//   r.cells[i] -> {x, y, w, h}, r.w, r.h

import { C, rgba } from "./theme.js";
import { fillRR, measure, mono, sans, strokeRR, text, withAlpha, withGlow } from "./draw.js";

const HEAD = 46;

function cardLayout(ctx, { title, rows, size = 24, w = null, keyW = null }) {
  const kf = mono(size, 450), vf = mono(size, 500);
  const kw = keyW ?? Math.max(0, ...rows.map((r) => measure(ctx, r.k + ":", kf)));
  const vw = Math.max(0, ...rows.map((r) => measure(ctx, r.v ?? "", vf) + (r.port ? 30 : 0)));
  const tw = measure(ctx, title, sans(size * 0.95, 650)) + 40;
  const width = w ?? Math.max(tw + 20, kw + vw + 64);
  const rh = size * 1.75;
  return { kf, vf, kw, width, rh, h: HEAD + rows.length * rh + 16 };
}

export function measureCard(ctx, spec) {
  const L = cardLayout(ctx, spec);
  return { w: L.width, h: L.h };
}

// Draws a card; returns its geometry. rows: [{k, v, vColor, port, alpha, hl}].
// hl: 0..1 highlights the row; alpha fades one row.
export function card(ctx, { x, y, title, color = C.accent, rows = [], size = 24, alpha = 1, glow = 0, w = null, keyW = null, sub = null }) {
  const L = cardLayout(ctx, { title, rows, size, w, keyW });
  const out = { x, y, w: L.width, h: L.h, ports: {}, rowRects: [] };
  rows.forEach((r, i) => {
    const ry = y + HEAD + 8 + i * L.rh;
    out.rowRects.push({ x: x + 12, y: ry, w: L.width - 24, h: L.rh });
    out.ports[r.k] = { x: x + L.width - 22, y: ry + L.rh / 2 };
  });
  out.row = (i) => out.rowRects[i];
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, x, y, L.width, L.h, 14, C.panel);
    ctx.restore();
    if (glow > 0) withGlow(ctx, rgba(color, 0.8 * glow), 30 * glow, () => strokeRR(ctx, x, y, L.width, L.h, 14, rgba(color, glow), 2.5));
    // header
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, L.width, L.h, 14);
    ctx.clip();
    ctx.fillStyle = rgba(color, 0.16);
    ctx.fillRect(x, y, L.width, HEAD);
    ctx.fillStyle = rgba(color, 0.5);
    ctx.fillRect(x, y + HEAD - 1.5, L.width, 1.5);
    ctx.restore();
    text(ctx, title, x + 18, y + HEAD / 2 + 1, { font: sans(size * 0.95, 650), color, baseline: "middle" });
    if (sub) text(ctx, sub, x + L.width - 16, y + HEAD / 2 + 1, { font: sans(size * 0.7, 500), color: C.text3, baseline: "middle", align: "right" });
    strokeRR(ctx, x + 0.5, y + 0.5, L.width - 1, L.h - 1, 14, rgba(color, 0.55), 1.5);
    rows.forEach((r, i) => {
      const rr = out.rowRects[i];
      withAlpha(ctx, r.alpha ?? 1, () => {
        if (r.hl > 0) withAlpha(ctx, r.hl, () => fillRR(ctx, rr.x, rr.y + 3, rr.w, rr.h - 6, 8, rgba(r.vColor ?? color, 0.18)));
        text(ctx, r.k + ":", x + 20, rr.y + rr.h / 2 + 1, { font: L.kf, color: C.text3, baseline: "middle" });
        if (r.v !== undefined) text(ctx, r.v, x + 20 + L.kw + 14, rr.y + rr.h / 2 + 1, { font: L.vf, color: r.vColor ?? C.text, baseline: "middle" });
        if (r.port) {
          const p = out.ports[r.k];
          withGlow(ctx, rgba(r.vColor ?? color, 0.8), 10, () => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = r.vColor ?? color;
            ctx.fill();
          });
        }
      });
    });
  });
  return out;
}

// A row of cells in brackets: [ a, b, c ]. items: [{text, color, alpha, bg, hl, w}].
// Returns {x, y, w, h, cells: [{x, y, w, h}]}.
export function cells(ctx, { x, y, items, size = 24, alpha = 1, gap = 10, pad = 14, brackets = true, h = null, minW = 0, bg = C.panel2, border = C.border }) {
  const f = mono(size, 500);
  const ch = h ?? size * 1.9;
  const bw = brackets ? measure(ctx, "[", mono(size * 1.2, 400)) + 10 : 0;
  let cx = x + bw;
  const out = { x, y, h: ch, cells: [] };
  for (const it of items) {
    const w = it.w ?? Math.max(minW, measure(ctx, it.text, f) + pad * 2);
    out.cells.push({ x: cx, y, w, h: ch });
    cx += w + gap;
  }
  out.w = cx - gap - x + bw;
  withAlpha(ctx, alpha, () => {
    if (brackets) {
      text(ctx, "[", x, y + ch / 2 + 1, { font: mono(size * 1.2, 400), color: C.text3, baseline: "middle" });
      text(ctx, "]", x + out.w - bw + 10, y + ch / 2 + 1, { font: mono(size * 1.2, 400), color: C.text3, baseline: "middle" });
    }
    items.forEach((it, i) => {
      const c = out.cells[i];
      withAlpha(ctx, it.alpha ?? 1, () => {
        fillRR(ctx, c.x, c.y, c.w, c.h, 9, it.bg ?? bg);
        strokeRR(ctx, c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1, 9, it.border ?? border, it.border ? 2 : 1.2);
        if (it.hl > 0) withAlpha(ctx, it.hl, () => withGlow(ctx, rgba(it.color ?? C.accent, 0.9), 18, () => strokeRR(ctx, c.x, c.y, c.w, c.h, 9, it.color ?? C.accent, 2.5)));
        text(ctx, it.text, c.x + c.w / 2, c.y + c.h / 2 + 1, { font: f, color: it.color ?? C.text, align: "center", baseline: "middle" });
      });
    });
  });
  return out;
}
