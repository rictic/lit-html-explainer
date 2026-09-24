// A browser window, the counter app inside it, a mouse cursor, and a
// devtools Elements panel.
//
//   const page = browserWindow(ctx, { x, y, w, h, url, alpha });   // returns the page area {x, y, w, h}
//   counterApp(ctx, page, { count: 1, press: 0..1 });               // the example app
//   cursor(ctx, x, y, { press: 0..1, alpha })
//   devtools(ctx, { x, y, w, h, tree, alpha, style, rowStyle, select })  // tree: a Tree

import { C } from "./theme.js";
import { fillRR, rrect, sans, strokeRR, text, withAlpha } from "./draw.js";

export function browserWindow(ctx, { x, y, w, h, url = "localhost:8000", alpha = 1, title = "Counter" }) {
  const bar = 58;
  const page = { x: x + 1, y: y + bar, w: w - 2, h: h - bar - 1 };
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    fillRR(ctx, x, y, w, h, 16, "#232a3f");
    ctx.restore();
    // title bar
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => {
      ctx.beginPath();
      ctx.arc(x + 26 + i * 22, y + bar / 2, 7, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    });
    fillRR(ctx, x + 110, y + 13, w - 130, bar - 26, 9, "#161c2e");
    text(ctx, url, x + 130, y + bar / 2 + 1, { font: sans(19, 450), color: C.text2, baseline: "middle" });
    // page
    ctx.save();
    rrect(ctx, page.x, page.y, page.w, page.h, 0);
    ctx.clip();
    ctx.fillStyle = "#f6f7fb";
    ctx.fillRect(page.x, page.y, page.w, page.h);
    ctx.restore();
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 16, "#3a4466", 1.5);
  });
  return page;
}

// The counter from the example: a number in a span (green and underlined
// when odd, per the page's .odd style) and an Increment button.
// press: 0..1 shows the button pressed. flash: 0..1 highlights the number.
export function counterApp(ctx, page, { count = 0, press = 0, alpha = 1, flash = 0, scale = 1 }) {
  const cx = page.x + page.w / 2, cy = page.y + page.h / 2;
  const odd = count % 2 === 1;
  const out = {};
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    // span
    const f = sans(120, 600);
    ctx.font = f;
    const s = String(count);
    const tw = ctx.measureText(s).width;
    if (flash > 0) withAlpha(ctx, flash, () => fillRR(ctx, -tw / 2 - 24, -150, tw + 48, 150, 18, "rgba(255,210,90,0.35)"));
    text(ctx, s, 0, -30, { font: f, color: odd ? "#16a34a" : "#1c2233", align: "center" });
    if (odd) {
      ctx.fillStyle = "#16a34a";
      ctx.fillRect(-tw / 2, -12, tw, 7);
    }
    // button
    const bw = 250, bh = 66, by = 40;
    const k = 1 - 0.05 * press;
    ctx.save();
    ctx.translate(0, by + bh / 2);
    ctx.scale(k, k);
    fillRR(ctx, -bw / 2, -bh / 2, bw, bh, 12, press > 0.5 ? "#d9dde8" : "#e8ebf3");
    strokeRR(ctx, -bw / 2 + 0.5, -bh / 2 + 0.5, bw - 1, bh - 1, 12, "#aab2c8", 2);
    text(ctx, "Increment", 0, 2, { font: sans(30, 550), color: "#1c2233", align: "center", baseline: "middle" });
    ctx.restore();
    ctx.restore();
    out.button = { x: cx, y: cy + (by + bh / 2) * scale };
    out.number = { x: cx, y: cy - 90 * scale };
  });
  if (!out.button) {
    out.button = { x: cx, y: cy + 73 * scale };
    out.number = { x: cx, y: cy - 90 * scale };
  }
  return out;
}

// An arrow pointer with its tip at (x, y). press: 0..1 draws a click ripple.
export function cursor(ctx, x, y, { press = 0, alpha = 1, ripple = 0 } = {}) {
  withAlpha(ctx, alpha, () => {
    if (ripple > 0 && ripple < 1) {
      ctx.beginPath();
      ctx.arc(x, y, 12 + 40 * ripple, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(122,162,255,${0.8 * (1 - ripple)})`;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(x, y);
    const k = 1.35 * (1 - 0.1 * press);
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 26);
    ctx.lineTo(6.5, 20);
    ctx.lineTo(11, 30);
    ctx.lineTo(15, 28.3);
    ctx.lineTo(10.6, 18.6);
    ctx.lineTo(19, 18.6);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#111";
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  });
}

// A devtools Elements panel showing `tree` (a Tree, usually built with
// whitespace: "hide"). select: a row (or null) drawn with the selection bar.
// Returns {x, y, w, h, treeX, treeY} so callers can find rows.
export function devtools(ctx, { x, y, w, h, tree, alpha = 1, style = null, rowStyle = null, select = null, selectU = 1, title = "Elements" }) {
  const head = 48;
  const treeX = x + 30, treeY = y + head + 18;
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 12;
    fillRR(ctx, x, y, w, h, 14, "#1b1f2b");
    ctx.restore();
    ctx.save();
    rrect(ctx, x, y, w, h, 14);
    ctx.clip();
    ctx.fillStyle = "#23283a";
    ctx.fillRect(x, y, w, head);
    ctx.fillStyle = "#353c55";
    ctx.fillRect(x, y + head - 1, w, 1);
    // tabs
    const tabs = [title, "Console", "Sources", "Network"];
    let tx = x + 22;
    tabs.forEach((t, i) => {
      const tw = text(ctx, t, tx, y + head / 2 + 1, { font: sans(19, i === 0 ? 600 : 450), color: i === 0 ? C.text : C.text3, baseline: "middle" });
      if (i === 0) {
        ctx.fillStyle = C.accent;
        ctx.fillRect(tx - 4, y + head - 4, tw + 8, 3);
      }
      tx += tw + 34;
    });
    if (select && selectU > 0) {
      withAlpha(ctx, selectU, () => {
        ctx.fillStyle = "rgba(122,162,255,0.22)";
        ctx.fillRect(x, tree.rowY(treeY, select), w, tree.lh);
      });
    }
    tree.draw(ctx, treeX, treeY, { style, rowStyle });
    ctx.restore();
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 14, "#353c55", 1.5);
  });
  return { x, y, w, h, treeX, treeY };
}
