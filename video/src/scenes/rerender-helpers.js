// Helpers shared by rerender, nesting and lists (candidates for the kit).
//
//   counterPage(ctx, page, { text, prevText, textU, odd, press, scale, alpha, flash })
//       the counter app with the span's text and its class ("odd": green and
//       underlined) set separately, so a scene can show the DOM between the
//       two writes of a render (class already "odd", text still "0").
//   strike(ctx, rect, u, color)          a strike-through line drawn left to right
//   tag(ctx, { x, y, text, color, ... })  a small outlined label (chip with a tinted fill)
//   htmlLine(ctx, segs, x, y, { size })   one line of HTML from [{text, role}] (DOMC colours)
//   commentsIn(segs)                      indices of the empty-comment segments of a line

import { C, DOMC, blend, rgba } from "../kit/theme.js";
import { chip, fillRR, measure, mono, monoAdvance, sans, setFont, strokeRR, text, withAlpha } from "../kit/draw.js";
import { clamp } from "../util.js";

export function counterPage(ctx, page, { text: str = "0", prevText = null, textU = 1, odd = 0, press = 0, alpha = 1, scale = 1, flash = 0 } = {}) {
  const cx = page.x + page.w / 2, cy = page.y + page.h / 2;
  const out = {
    button: { x: cx, y: cy + 73 * scale },
    number: { x: cx, y: cy - 90 * scale },
  };
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    const f = sans(120, 600);
    const color = blend("#1c2233", "#16a34a", clamp(odd));
    const width = (s) => measure(ctx, s, f);
    const tw = prevText !== null && textU < 1 ? Math.max(width(str), width(prevText)) : width(str);
    if (flash > 0) withAlpha(ctx, flash, () => fillRR(ctx, -tw / 2 - 24, -150, tw + 48, 150, 18, "rgba(255,210,90,0.35)"));
    if (prevText !== null && textU < 1) {
      text(ctx, prevText, 0, -30, { font: f, color, align: "center", alpha: 1 - textU });
      text(ctx, str, 0, -30, { font: f, color, align: "center", alpha: textU });
    } else {
      text(ctx, str, 0, -30, { font: f, color, align: "center" });
    }
    if (odd > 0) {
      const w = width(str);
      withAlpha(ctx, clamp(odd), () => {
        ctx.fillStyle = "#16a34a";
        ctx.fillRect(-w / 2, -12, w, 7);
      });
    }
    ctx.restore();
    // button
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    const bw = 250, bh = 66, by = 40;
    const k = 1 - 0.05 * press;
    ctx.translate(0, by + bh / 2);
    ctx.scale(k, k);
    fillRR(ctx, -bw / 2, -bh / 2, bw, bh, 12, press > 0.5 ? "#d9dde8" : "#e8ebf3");
    strokeRR(ctx, -bw / 2 + 0.5, -bh / 2 + 0.5, bw - 1, bh - 1, 12, "#aab2c8", 2);
    text(ctx, "Increment", 0, 2, { font: sans(30, 550), color: "#1c2233", align: "center", baseline: "middle" });
    ctx.restore();
  });
  return out;
}

// A strike-through over rect r, drawn left to right as u goes 0 -> 1.
export function strike(ctx, r, u, color = C.bad, width = 3) {
  if (u <= 0) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(r.x - 4, r.y + r.h / 2 - width / 2, (r.w + 8) * clamp(u), width);
  ctx.restore();
}

// A small outlined label: tinted fill, coloured border and text.
export function tag(ctx, { x, y, text: str, color = C.text2, font: f = sans(20, 650), h = 34, alpha = 1, align = "left", dashed = false, fill = 0.12, glow = 0 }) {
  if (!dashed) return chip(ctx, { x, y, text: str, color, bg: rgba(color, fill), border: rgba(color, 0.7), font: f, h, alpha, align, glow });
  const w = measure(ctx, str, f) + 28;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.setLineDash([6, 6]);
    strokeRR(ctx, x0 + 1, y + 1, w - 2, h - 2, h / 2, color, 2);
    ctx.restore();
    text(ctx, str, x0 + w / 2, y + h / 2 + 1, { font: f, color, align: "center", baseline: "middle" });
  });
  return { w, h, x: x0 };
}

// One line of HTML as coloured segments: [{text, role}] with roles
// punct tag attrName attrValue comment text (DOMC colours). opts.style(seg, i)
// may return {color, alpha, hide}. Returns the x extent of every segment.
const ROLE = { punct: DOMC.punct, tag: DOMC.tag, attrName: DOMC.attr, attrValue: DOMC.value, comment: DOMC.comment, text: DOMC.text, ws: DOMC.whitespace };
export function htmlLine(ctx, segs, x, y, { size = 24, weight = 450, style = null, alpha = 1 } = {}) {
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
        ctx.fillStyle = st.color ?? ROLE[s.role] ?? DOMC.text;
        ctx.fillText(s.text, cx + (st.dx ?? 0), y + 1 + (st.dy ?? 0));
        ctx.globalAlpha = ga;
      }
      cx += w;
    });
    ctx.restore();
  });
  return out;
}

// HTML segments for a truth DOM node, on one line (children inline).
export function nodeSegs(n) {
  if (n.type === "text") return [{ text: n.data, role: "text", node: n }];
  if (n.type === "comment") return [{ text: `<!--${n.data}-->`, role: "comment", node: n }];
  const open = [{ text: "<", role: "punct" }, { text: n.name, role: "tag" }];
  for (const [k, v] of n.attrs) {
    open.push({ text: " ", role: "punct" }, { text: k, role: "attrName" }, { text: '="', role: "punct" }, { text: v, role: "attrValue" }, { text: '"', role: "punct" });
  }
  open.push({ text: ">", role: "punct" });
  const kids = n.children.flatMap(nodeSegs);
  return [...open.map((s) => ({ ...s, node: n })), ...kids, { text: "</", role: "punct", node: n }, { text: n.name, role: "tag", node: n }, { text: ">", role: "punct", node: n }];
}
