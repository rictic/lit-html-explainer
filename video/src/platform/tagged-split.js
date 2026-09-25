// The counter's template literal and how it comes apart into its fixed
// strings and its expressions, for tagged's opening. Same pieces and same
// look as episode 1's literal scene (scenes/literal.js), whose geometry is
// private to it, so it is rebuilt here. Also: a lock glyph, and small
// drawing helpers shared by tagged's stages.

import { C } from "../kit/theme.js";
import { Code } from "../kit/code.js";
import { COUNTER_SRC, literalPieces } from "../kit/lit.js";
import { fillRR, mono, monoAdvance, setFont, strokeRR, withAlpha } from "../kit/draw.js";
import { truth } from "../timing.js";
import { clamp } from "../util.js";

// Lines 2-6 of the example: `const counter = (count) => html\`` through `</button>\`;`.
export const LIT_SRC = COUNTER_SRC.split("\n").slice(2, 7).join("\n");

const GEO = new Map();
// Geometry of the literal at `size`: its Code, what each token is (the
// function head, the tag, a backtick, static piece i, a ${ } delimiter or
// expression k), where each fragment of a static piece lands in its cell's
// text, and the three expressions.
export function splitGeo(ctx, size) {
  if (GEO.has(size)) return GEO.get(size);
  const code = new Code(LIT_SRC, { size });
  const statics = code.statics(0);
  const strings = truth().counter.result0.strings;
  const inR = (tok, r) => tok.line === r.line && tok.col >= r.col && tok.col + tok.text.length <= r.col + r.len;
  const role = new Map();
  for (const tok of code.tokens) {
    let r;
    if (tok.bind) r = { kind: tok.kind === "bindOpen" || tok.kind === "bindClose" ? "delim" : "expr", k: tok.bind.index };
    else if (tok.kind === "backtick") r = { kind: "tick" };
    else if (tok.tpl === 0) r = { kind: "static", i: statics.findIndex((rs) => rs.some((q) => inR(tok, q))) };
    else if (tok.kind === "fn") r = { kind: "tag" };
    else r = { kind: "head" };
    role.set(tok, r);
  }
  const frags = statics.map((ranges, i) => {
    const segs = [];
    let off = 1; // after the opening quote
    strings[i].split("\n").forEach((seg, j) => {
      if (j > 0) off += 2; // "\n" is shown as two characters
      if (seg) segs.push({ off, text: seg });
      off += seg.length;
    });
    return ranges.map((r, j) => {
      const src = code.lines[r.line].slice(r.col, r.col + r.len);
      if (segs[j]?.text !== src) console.warn(`tagged: static ${i}.${j} "${src}" != "${segs[j]?.text}"`);
      return { ...r, off: segs[j]?.off ?? 1, toks: code.tokens.filter((t) => t.kind !== "ws" && inR(t, r)) };
    });
  });
  const dims = strings.map((s) => {
    const out = [];
    let off = 0;
    for (const p of literalPieces(s)) {
      if (p.dim) out.push({ off, text: p.text });
      off += p.text.length;
    }
    return out;
  });
  const exprs = [0, 1, 2].map((k) => {
    const b = code.binding(k);
    return {
      line: b.start.line, col: b.start.col + 2, len: b.end.col - b.start.col - 3,
      text: code.lines[b.start.line].slice(b.start.col + 2, b.end.col - 1),
      toks: code.tokens.filter((t) => t.bind?.index === k && t.kind !== "bindOpen" && t.kind !== "bindClose" && t.kind !== "ws"),
    };
  });
  ctx.save();
  setFont(ctx, mono(100, 500));
  ctx.textBaseline = "middle";
  const mid = ctx.measureText("M").actualBoundingBoxDescent / 100;
  ctx.restore();
  const g = { code, statics, strings, role, frags, dims, exprs, mid, size };
  GEO.set(size, g);
  return g;
}

// A Code drawn with its top-left at (P.x, P.y), scaled by P.k.
export function drawCodeAt(ctx, code, P, style, alpha = 1) {
  if (alpha <= 0.001) return;
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.scale(P.k, P.k);
  code.draw(ctx, 0, 0, { style, alpha });
  ctx.restore();
}

// A character range of a Code placed at P, in screen px.
export function rectAt(ctx, code, P, line, col, len) {
  const r = code.rect(ctx, 0, 0, line, col, len);
  return { x: P.x + r.x * P.k, y: P.y + r.y * P.k, w: r.w * P.k, h: r.h * P.k };
}

// The "middle" text line of a Code's line at P.
export function midY(code, P, line, midK) {
  return P.y + (code.baseline(0, line) - midK * code.size) * P.k;
}

// Draws a run of tokens with its first character at (x, y) (baseline "middle").
export function drawRun(ctx, toks, col0, x, y, size, color, alpha = 1) {
  if (alpha <= 0.001) return;
  const a = monoAdvance(ctx, size, 500);
  ctx.save();
  setFont(ctx, mono(size, 480));
  ctx.textBaseline = "middle";
  ctx.globalAlpha *= alpha;
  for (const tok of toks) {
    ctx.fillStyle = color(tok);
    ctx.fillText(tok.text, x + (tok.col - col0) * a, y);
  }
  ctx.restore();
}

// A rounded plate with a soft shadow (things in flight).
export function plate(ctx, x, y, w, h, { fill = C.panel2, stroke = null, alpha = 1, r = 9 } = {}) {
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    fillRR(ctx, x, y, w, h, r, fill);
    ctx.restore();
    if (stroke) strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r, stroke, 1.5);
  });
}

// A point on the quadratic arc from a to b (bend: px, perpendicular to the chord).
export function arc(a, b, u, bend) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const c = { x: mx - (dy / len) * bend, y: my + (dx / len) * bend };
  return {
    x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
    y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y,
  };
}

// A padlock, centred on (cx, cy): body 30 x 24 px and a shackle, at k = 1.
// u closes the shackle (0 = open, lifted; 1 = shut).
export function lockGlyph(ctx, cx, cy, k = 1, color = C.text, u = 1) {
  const bw = 30 * k, bh = 24 * k, bx = cx - bw / 2, by = cy - bh / 2 + 6 * k;
  const lift = (1 - clamp(u)) * 9 * k;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 4 * k;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - 9 * k, by - lift);
  ctx.lineTo(cx - 9 * k, by - 9 * k - lift);
  ctx.arc(cx, by - 9 * k - lift, 9 * k, Math.PI, 0);
  ctx.lineTo(cx + 9 * k, by - lift + (u < 1 ? -4 * k : 0));
  ctx.stroke();
  fillRR(ctx, bx, by, bw, bh, 5 * k, color);
  ctx.fillStyle = C.bg;
  ctx.beginPath();
  ctx.arc(cx, by + bh * 0.42, 3.4 * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(cx - 1.6 * k, by + bh * 0.42, 3.2 * k, 7 * k);
  ctx.restore();
}
