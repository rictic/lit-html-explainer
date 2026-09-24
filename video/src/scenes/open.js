// open: the counter app, three clicks, then devtools shows two comments
// nobody wrote. Ends on the title.

import { B, C, SIZE, rgba } from "../kit/theme.js";
import { mono, ring, sans, text, withAlpha, withGlow } from "../kit/draw.js";
import { browserWindow, counterApp, cursor, devtools } from "../kit/browser.js";
import { Tree } from "../kit/tree.js";
import { truth } from "../timing.js";
import { ease, lerp, mix, prog, pulse, window } from "../util.js";

export const transition = "fade";

let TREE = null;
// The page's DOM after the third click: the captured DOM after one click,
// with the count changed (the structure is identical).
function pageTree() {
  if (TREE) return TREE;
  const body = structuredClone(truth().counter.render1.body);
  const span = body.children.find((c) => c.name === "span");
  span.children.find((c) => c.type === "text").data = "3";
  TREE = new Tree(body, { size: 27, whitespace: "hide", inline: true });
  return TREE;
}

export function draw(F, S) {
  const { ctx, t } = F;
  const tree = pageTree();

  // clicks: 3 of them, just after "adds one to it"
  const clicks = [S.m("click") + 0.55, S.m("click") + 1.25, S.m("click") + 1.95];
  const count = clicks.filter((c) => t >= c).length;
  const press = Math.max(...clicks.map((c) => pulse(t, c - 0.08, 0.22)));

  // layout: browser centred, then shifted left when devtools opens
  const dv = prog(t, S.m("devtools") - 0.2, 0.9);
  const outro = prog(t, S.m("follow") + 0.3, 1.2);
  const bw = mix({ x: 390, y: 170, w: 1140, h: 720 }, { x: 70, y: 200, w: 820, h: 620 }, dv);
  const enter = prog(t, S.start, 0.8, ease.outCubic);
  const page = browserWindow(ctx, { ...bw, y: bw.y + 30 * (1 - enter), alpha: enter * (1 - 0.75 * outro), url: "localhost:8000/counter.html" });
  const app = counterApp(ctx, page, { count, press, alpha: enter * (1 - 0.75 * outro), scale: lerp(1, 0.85, dv) });

  // "A number, and a button": rings
  const rApp = window(t, S.m("app"), S.m("click") + 0.3, 0.3, 0.4);
  if (rApp > 0) {
    ring(ctx, { x: app.number.x - 90, y: app.number.y - 70, w: 180, h: 140, r: 16, color: C.accent, u: rApp });
  }

  // the cursor: comes in before the first click, leaves when devtools opens
  const cu = prog(t, S.m("click") - 0.2, 0.7, ease.inOutCubic);
  const cleave = prog(t, S.m("devtools") - 0.4, 0.6);
  if (cu > 0 && cleave < 1) {
    const from = { x: bw.x + bw.w + 120, y: bw.y + bw.h + 80 };
    const p = mix(from, { x: app.button.x + 40, y: app.button.y + 8 }, cu);
    const ripple = Math.max(...clicks.map((c) => (t >= c ? Math.min(1, (t - c) / 0.5) : 0) * (t < c + 0.5 ? 1 : 0)));
    cursor(ctx, p.x, p.y, { press, alpha: 1 - cleave, ripple });
  }

  // devtools
  if (dv > 0) {
    const x = lerp(1960, 950, dv), y = 200, w = 900, h = 620;
    const empty = tree.rows.find((r) => r.kind === "comment" && r.node.data === "");
    const marker = tree.rows.find((r) => r.kind === "comment" && r.node.data.startsWith("?lit$"));
    const hlE = prog(t, S.m("empty"), 0.4);
    const hlM = prog(t, S.m("marker"), 0.4);
    const sel = t >= S.m("marker") ? marker : t >= S.m("empty") ? empty : null;
    const q = prog(t, S.m("question"), 0.5, ease.outBack);
    const dt = devtools(ctx, {
      x, y, w, h, tree, alpha: 1 - 0.75 * outro, select: sel, selectU: sel ? 1 : 0,
      style: (seg, row) => {
        if (row === empty && seg.role === "comment") return { color: hlE > 0 ? rgba("#ffffff", 1) : undefined };
        if (row === marker && seg.role === "comment") return { color: hlM > 0 ? "#ffffff" : undefined };
        return {};
      },
    });
    // rings and question marks on the two comments
    for (const [row, u, k] of [[empty, hlE, 0], [marker, hlM, 1]]) {
      if (u <= 0) continue;
      const r = tree.rowRect(ctx, dt.treeX, dt.treeY, row);
      const breathe = t > S.m("question") ? 0.75 + 0.25 * Math.sin((t - S.m("question")) * 5 + k) : 1;
      ring(ctx, { ...r, r: 8, color: "#ffd166", u: u * breathe * (1 - 0.75 * outro), pad: 8 });
      withAlpha(ctx, q * (1 - 0.75 * outro), () => {
        withGlow(ctx, "rgba(255,209,102,0.8)", 16, () =>
          text(ctx, "?", r.x + r.w + 34, r.y + r.h / 2 + 2, { font: sans(44, 800), color: "#ffd166", baseline: "middle" }));
      });
    }
    // "a long random number": underline the digits as they're mentioned
    const digitsU = prog(t, S.word(1, "random") - 0.1, 0.5);
    if (digitsU > 0 && marker) {
      const r = tree.rowRect(ctx, dt.treeX, dt.treeY, marker);
      const a = tree.adv(ctx);
      const x0 = r.x + a * "<!--?lit$".length;
      ctx.fillStyle = "#ffd166";
      withAlpha(ctx, (1 - 0.75 * outro), () => ctx.fillRect(x0, r.y + r.h - 4, a * 9 * digitsU, 3));
    }
  }

  // the title
  const ti = prog(t, S.m("follow") + 0.6, 1.0, ease.outCubic);
  if (ti > 0) {
    withAlpha(ctx, ti, () => {
      const y = 470 + 24 * (1 - ti);
      withGlow(ctx, "rgba(122,162,255,0.35)", 40, () =>
        text(ctx, "How lit-html renders", 960, y, { font: sans(SIZE.title + 8, 750), color: C.text, align: "center" }));
      text(ctx, "one template, from the code you write to the DOM", 960, y + 80, { font: sans(36, 450), color: C.text2, align: "center" });
      // the three binding colours, as a quiet signature
      B.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.globalAlpha = ti;
        ctx.beginPath();
        ctx.roundRect(960 - 90 + i * 64, y + 130, 52, 8, 4);
        ctx.fill();
      });
    });
  }
}
