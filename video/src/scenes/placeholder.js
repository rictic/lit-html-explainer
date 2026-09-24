// Drawn for scenes that don't have a module yet: the scene's name, the
// narration with the current word lit, and the marks as a timeline.

import { C, SIZE } from "../kit/theme.js";
import { mono, paragraph, sans, text } from "../kit/draw.js";

export function drawPlaceholder(F, S) {
  const { ctx, t } = F;
  text(ctx, `scene: ${S.id}`, 120, 200, { font: sans(SIZE.h1, 700), color: C.text });
  text(ctx, `${S.start.toFixed(1)}s – ${S.end.toFixed(1)}s`, 120, 250, { font: mono(24), color: C.text3 });
  const paras = Array.from({ length: 20 }, (_, i) => { try { return S.p(i); } catch { return null; } }).filter(Boolean);
  const cur = paras.find((p) => t < p.end + 0.3) ?? paras.at(-1);
  if (cur) {
    const said = cur.words.filter((w) => w.s <= t).map((w) => w.w).join(" ");
    paragraph(ctx, cur.text, 120, 340, 1680, { font: sans(36, 450), color: C.text3, lineHeight: 1.45 });
    paragraph(ctx, said, 120, 340, 1680, { font: sans(36, 450), color: C.text, lineHeight: 1.45 });
  }
  // marks
  const x0 = 120, x1 = 1800, y = 900;
  ctx.fillStyle = C.border2;
  ctx.fillRect(x0, y, x1 - x0, 2);
  const X = (tt) => x0 + ((tt - S.start) / S.dur) * (x1 - x0);
  ctx.fillStyle = C.accent;
  ctx.fillRect(X(t) - 1, y - 30, 3, 60);
  Object.entries(S.marks).forEach(([name, tt], i) => {
    ctx.fillStyle = tt <= t ? C.accent : C.text3;
    ctx.fillRect(X(tt) - 1, y - 8, 2, 16);
    text(ctx, name, X(tt), y + (i % 2 ? 44 : -20), { font: mono(16), color: tt <= t ? C.text : C.text3, align: "center" });
  });
}
