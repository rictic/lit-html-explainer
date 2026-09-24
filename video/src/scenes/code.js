// code: the example, its three bindings, the two render calls, and the
// three phases (with a preview of how often the first two are skipped).

import { B, C, SYN, rgba } from "../kit/theme.js";
import { Code } from "../kit/code.js";
import { COUNTER_SRC } from "../kit/lit.js";
import { arrow, chip, fillRR, mono, panel, ring, sans, strokeRR, text, withAlpha } from "../kit/draw.js";
import { clamp, ease, lerp, prog, window } from "../util.js";

export const transition = "fade";

let CODE = null;
const code = () => (CODE ??= new Code(COUNTER_SRC, { size: 31 }));

const LABELS = ["class", "count", "click handler"];

export function draw(F, S) {
  const { ctx, t } = F;
  const c = code();
  const cw = c.width(ctx);
  const pw = cw + 96, ph = c.height + 44 + 52;
  const px = 960 - pw / 2, py = 138;
  const x = px + 48, y = py + 44 + 26;

  const enter = prog(t, S.start - 0.3, 0.8, ease.outCubic);
  // focus: which lines are bright
  const fnU = window(t, S.m("fn") - 0.15, S.m("render") - 0.15, 0.45, 0.4);
  const renderU = window(t, S.m("render") - 0.15, S.m("phases"), 0.45, 0.6);
  const handlerU = window(t, S.m("handler") - 0.15, S.m("phases"), 0.45, 0.6);
  const lineAlpha = (line) => {
    let a = 1;
    if (fnU > 0) a = Math.min(a, lerp(1, line >= 2 && line <= 6 ? 1 : 0.3, fnU));
    if (renderU > 0) a = Math.min(a, lerp(1, line === 8 || (handlerU > 0 && line === 4) ? 1 : 0.3, renderU));
    return a;
  };
  const bindU = [0, 1, 2].map((k) => prog(t, S.m(`b${k}`) - 0.15, 0.4));

  withAlpha(ctx, enter, () => {
    panel(ctx, { x: px, y: py, w: pw, h: ph, title: "counter.js", accent: SYN.fn });
    // binding washes
    for (let k = 0; k < 3; k++) {
      if (bindU[k] <= 0) continue;
      const rects = c.bindingRects(ctx, x, y, k);
      const hot = Math.max(window(t, S.m(`b${k}`) - 0.15, S.m(`b${k}`) + 1.6, 0.3, 0.6), k === 2 ? handlerU : 0);
      for (const r of rects) {
        withAlpha(ctx, bindU[k] * lineAlpha(c.binding(k).start.line), () => {
          fillRR(ctx, r.x - 3, r.y, r.w + 6, r.h, 7, rgba(B[k], 0.16 + 0.12 * hot));
          if (hot > 0) withAlpha(ctx, hot, () => strokeRR(ctx, r.x - 3, r.y, r.w + 6, r.h, 7, rgba(B[k], 0.9), 2));
        });
      }
    }
    // the code
    c.draw(ctx, x, y, {
      style: (tok) => {
        const a = lineAlpha(tok.line);
        const k = tok.bind?.template === 0 ? tok.bind.index : -1;
        if (k >= 0 && (tok.kind === "bindOpen" || tok.kind === "bindClose")) {
          return { alpha: a, color: bindU[k] > 0 ? B[k] : undefined };
        }
        return { alpha: a };
      },
    });
    // labels, at the end of each binding's line (matched by colour)
    let lineEnd = {};
    for (let k = 0; k < 3; k++) {
      const u = window(t, S.m(`b${k}`) - 0.1, S.m("render") - 0.2, 0.35, 0.4);
      const b = c.binding(k);
      const endCol = c.lines[b.end.line].length;
      const r = c.rect(ctx, x, y, b.end.line, endCol, 0);
      const lx = Math.max(r.x + 26, lineEnd[b.end.line] ?? 0);
      const w = chip(ctx, { x: lx + 20 * (1 - ease.outCubic(clamp(u))), y: r.y + r.h / 2 - 17, text: LABELS[k], color: B[k], bg: rgba(B[k], 0.14), border: rgba(B[k], 0.6), font: sans(20, 650), h: 34, alpha: u }).w;
      lineEnd[b.end.line] = lx + w + 12;
    }
    // render(...) and the handler's render(...)
    const last = c.find("render(counter(0), document.body)");
    const r0 = c.rect(ctx, x, y, last.line, last.col, last.len);
    ring(ctx, { ...r0, r: 8, color: C.accent, u: renderU * window(t, S.m("render") - 0.1, S.m("handler") + 2.5, 0.3, 0.5) });
    const inner = c.find("render(counter(count + 1), document.body)");
    const r1 = c.rect(ctx, x, y, inner.line, inner.col, inner.len);
    const hu = window(t, S.m("handler") - 0.1, S.m("phases"), 0.35, 0.5);
    if (hu > 0) {
      ring(ctx, { ...r1, r: 8, color: B[2], u: hu });
      const p = prog(t, S.m("handler") + 0.2, 0.7);
      arrow(ctx, { x: r1.x + r1.w + 14, y: r1.y + r1.h / 2 }, { x: r0.x + r0.w + 16, y: r0.y + r0.h / 2 },
        { color: rgba(C.accent, 0.9), bend: -120, progress: p, alpha: hu, width: 2.5 });
      text(ctx, "each click makes the same call, with the next number", r0.x, py + ph + 52,
        { font: sans(26, 500), color: C.text2, alpha: hu * prog(t, S.m("handler") + 0.7, 0.4) });
    }
  });

  // how often each phase runs: a row per render, prepare and create only in the first
  const sk = prog(t, S.m("skip") - 0.2, 0.6, ease.outCubic);
  if (sk > 0) {
    const rows = 4, bw = 172, bh = 40, gap = 16;
    const gx = 960 - (3 * bw + 2 * gap) / 2 + 60, gy = py + ph + 34;
    withAlpha(ctx, sk, () => {
      ["prepare", "create", "update"].forEach((name, i) => {
        text(ctx, name, gx + i * (bw + gap) + bw / 2, gy + 2, { font: sans(21, 650), color: C.text3, align: "center" });
      });
      for (let r = 0; r < rows; r++) {
        const ry = gy + 18 + r * (bh + 10);
        const u = prog(t, S.m("skip") + 0.15 * r, 0.4);
        withAlpha(ctx, u, () => {
          text(ctx, `render #${r + 1}`, gx - 24, ry + bh / 2 + 1, { font: mono(21, 500), color: C.text3, align: "right", baseline: "middle" });
          for (let i = 0; i < 3; i++) {
            const bx = gx + i * (bw + gap);
            const on = r === 0 || i === 2;
            if (on) fillRR(ctx, bx, ry, bw, bh, bh / 2, rgba(C.accent, i === 2 ? 0.3 : 0.18));
            ctx.save();
            if (!on) ctx.setLineDash([5, 6]);
            strokeRR(ctx, bx + 1, ry + 1, bw - 2, bh - 2, bh / 2, on ? rgba(C.accent, 0.8) : C.text4, 1.5);
            ctx.restore();
            if (!on) text(ctx, "skipped", bx + bw / 2, ry + bh / 2 + 1, { font: sans(19, 500), color: C.text4, align: "center", baseline: "middle" });
          }
        });
      }
    });
  }
}

