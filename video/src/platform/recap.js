// recap: what the browser does for Lit. A table, one row per mark (r1..r7):
// the platform feature (its icon, its name, its APIs as chips) → what it does
// for Lit. Then (glue / why / fast) the table folds into a closing diagram:
// the features as tiles, "the browser", with Lit as a thin layer across the
// top, glued into each; its size; and the tiles lit up as native code.

import { B, C, DOMC, SYN, rgba } from "../kit/theme.js";
import { fillRR, measure, mono, sans, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { clamp, ease, lerp, mix, prog, pulse, window } from "../util.js";
import { runs } from "../scenes/recap-glyphs.js";
import { ICONS, LITC, PLAT, apiChips, platLabel } from "./recap-icons.js";

export const transition = "fade";

// ------------------------------------------------------------------ rows

// name: runs ({text} in sans, {text, mono: true} for API names); api: chips;
// lit: what it does for Lit, one or two lines, each with the word it lands on.
function rowSpecs(S) {
  const w = (text, nth = 0) => S.word(1, text, nth);
  return [
    {
      name: [{ text: "Tagged template literals" }],
      api: ["GetTemplateObject(templateLiteral)"],
      lit: [["static / dynamic split,", w("split")], ["a cache key", w("cache")]],
    },
    {
      name: [{ text: "The HTML parser and " }, { text: "<template>", mono: true }],
      api: ["template.innerHTML = html"],
      lit: [["strings into inert DOM", w("turn")]],
    },
    {
      name: [{ text: "importNode", mono: true }, { text: " and " }, { text: "TreeWalker", mono: true }],
      api: ["importNode(content, true)", "createTreeWalker(document, 129)"],
      lit: [["copy it, find the holes", w("copy")]],
    },
    {
      name: [{ text: "Comments" }],
      api: [{ src: "<!---->", color: DOMC.comment }, "insertBefore(node, endNode)"],
      lit: [["hold places", w("hold")]],
    },
    {
      name: [{ text: "Listener objects" }],
      api: ["addEventListener('click', part, fn)", "handleEvent(event)"],
      lit: [["cheap handler swaps", w("make")]],
    },
    {
      name: [{ text: "Custom elements, shadow DOM, adopted stylesheets" }],
      api: ["customElements.define", "attachShadow", "adoptedStyleSheets"],
      lit: [["components with scoped styles", w("give")]],
    },
    {
      name: [{ text: "Microtasks" }],
      api: ["await this.__updatePromise"],
      lit: [["batched updates", w("batch")]],
    },
  ];
}

const TB = { x: 100, w: 1720, y0: 186, h: 106, gap: 14 };
const rowY = (i) => TB.y0 + i * (TB.h + TB.gap);
const TILE = 88; // icon tile in a row
const ICON_S = 0.86; // icon scale in a row
const NAME_X = TB.x + 134;
const ARROW_X = TB.x + 1018;
const LIT_X = TB.x + 1072;
const iconHome = (i) => ({ x: TB.x + 22 + TILE / 2, y: rowY(i) + TB.h / 2 });

const nameFont = sans(34, 650), nameMono = mono(31, 600);
const litFont = sans(34, 600);

function nameRuns(spec, color) {
  return spec.name.map((r) => ({ text: r.text, font: r.mono ? nameMono : nameFont, color: r.mono ? SYN.prop : color }));
}

function drawRow(ctx, i, spec, { u, lit, lits, textA = 1, bandA = 1 }) {
  if (u <= 0) return;
  const e = ease.outCubic(u);
  const x = TB.x, y = rowY(i) - 24 * (1 - e), w = TB.w, h = TB.h;
  withAlpha(ctx, clamp(u * 1.8) * bandA, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 9;
    fillRR(ctx, x, y, w, h, 16, C.panel);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + w * 0.55, 0);
    g.addColorStop(0, rgba(PLAT, 0.03 + 0.06 * lit));
    g.addColorStop(1, rgba(PLAT, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = rgba(PLAT, 0.3 + 0.6 * lit);
    ctx.fillRect(x, y, 7, h);
    ctx.restore();
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 16, C.border, 1.5);
    if (lit > 0) withAlpha(ctx, lit, () => withGlow(ctx, rgba(PLAT, 0.4), 22, () => strokeRR(ctx, x, y, w, h, 16, rgba(PLAT, 0.75), 2)));
    // icon tile (the icon itself is drawn by the caller, so it can fly)
    const tx = x + 22, ty = y + (h - TILE) / 2;
    fillRR(ctx, tx, ty, TILE, TILE, 14, rgba(PLAT, 0.04 + 0.03 * lit));
    strokeRR(ctx, tx + 0.5, ty + 0.5, TILE - 1, TILE - 1, 14, rgba(PLAT, 0.2 + 0.18 * lit), 1.5);
    const bright = (0.58 + 0.42 * lit) * textA;
    withAlpha(ctx, bright, () => {
      runs(ctx, nameRuns(spec, C.text), NAME_X, y + 34);
      apiChips(ctx, { x: NAME_X, y: y + 56, items: spec.api, size: 21, h: 36, gap: 12 });
    });
    // → what it does for Lit
    const l0 = lits[0];
    if (l0 > 0) {
      withAlpha(ctx, l0 * bright, () =>
        text(ctx, "→", ARROW_X - 16 * (1 - l0), y + h / 2, { font: sans(40, 500), color: rgba(LITC, 0.8), align: "center", baseline: "middle" }));
    }
    const n = spec.lit.length;
    spec.lit.forEach(([str], k) => {
      const lu = lits[k];
      if (lu <= 0) return;
      const ly = y + h / 2 + (k - (n - 1) / 2) * 42 + 1;
      withAlpha(ctx, lu * (0.62 + 0.38 * lit) * textA, () =>
        text(ctx, str, LIT_X + 14 * (1 - lu), ly, { font: litFont, color: C.text, baseline: "middle" }));
    });
  });
}

// ------------------------------------------------------------- diagram

// Tiles: the seven features again, as the browser's floor, Lit across the top.
const TILES = [
  { w: 218, label: [[{ text: "Tagged" }], [{ text: "templates" }]] },
  { w: 218, label: [[{ text: "HTML parser," }], [{ text: "<template>", mono: true }]] },
  { w: 218, label: [[{ text: "importNode,", mono: true }], [{ text: "TreeWalker", mono: true }]] },
  { w: 218, label: [[{ text: "Comments" }]] },
  { w: 218, label: [[{ text: "Listener" }], [{ text: "objects" }]] },
  { w: 296, label: [[{ text: "Custom elements," }], [{ text: "shadow DOM," }], [{ text: "adoptedStyleSheets", mono: true }]] },
  { w: 218, label: [[{ text: "Microtasks" }]] },
];
const DG = { x: 110, gap: 16, slabY: 262, slabH: 64, tileY: 436, tileH: 372, panel: { x: 86, y: 392, w: 1748, h: 540 } };
function tileRect(i) {
  let x = DG.x;
  for (let k = 0; k < i; k++) x += TILES[k].w + DG.gap;
  return { x, y: DG.tileY, w: TILES[i].w, h: DG.tileH };
}
const DG_W = TILES.reduce((a, t) => a + t.w, 0) + DG.gap * (TILES.length - 1);
const tileIcon = (i) => { const r = tileRect(i); return { x: r.x + r.w / 2, y: r.y + 132 }; };
const TILE_ICON_S = 1.6;

const tileSans = sans(29, 650), tileMono = mono(24, 600);

function drawTile(ctx, i, { u, labelU, glow }) {
  if (u <= 0) return;
  const r = tileRect(i);
  withAlpha(ctx, u, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, r.x, r.y, r.w, r.h, 16, C.panel);
    ctx.restore();
    if (glow > 0) {
      withAlpha(ctx, glow, () => {
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(r.x, r.y, r.w, r.h, 16);
        ctx.clip();
        const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
        g.addColorStop(0, rgba(PLAT, 0.0));
        g.addColorStop(1, rgba(PLAT, 0.08));
        ctx.fillStyle = g;
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.restore();
        withGlow(ctx, rgba(PLAT, 0.55), 28, () => strokeRR(ctx, r.x, r.y, r.w, r.h, 16, rgba(PLAT, 0.85), 2));
      });
    }
    strokeRR(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 16, rgba(PLAT, 0.3), 1.5);
    // label, centred under the icon
    withAlpha(ctx, labelU, () => {
      const lines = TILES[i].label;
      const lh = 38;
      const y0 = r.y + 280 - ((lines.length - 1) * lh) / 2;
      lines.forEach((ln, k) => {
        const items = ln.map((it) => ({ text: it.text, font: it.mono ? tileMono : tileSans, color: it.mono ? SYN.prop : C.text }));
        const wsum = items.reduce((a, it) => a + measure(ctx, it.text, it.font), 0);
        runs(ctx, items, r.x + r.w / 2 - wsum / 2, y0 + k * lh);
      });
    });
  });
}

function drawDiagram(ctx, t, S, D) {
  const { tilesU, labelU, slabU } = D;
  const P = DG.panel;
  const footY = DG.tileY + DG.tileH + (P.y + P.h - DG.tileY - DG.tileH) / 2;
  // the browser: a big panel under the tiles
  withAlpha(ctx, tilesU, () => {
    fillRR(ctx, P.x, P.y, P.w, P.h, 22, rgba("#0c1224", 0.9));
    fillRR(ctx, P.x, P.y, P.w, P.h, 22, rgba(PLAT, 0.03));
    strokeRR(ctx, P.x + 0.75, P.y + 0.75, P.w - 1.5, P.h - 1.5, 22, rgba(PLAT, 0.4), 1.5);
  });
  platLabel(ctx, { x: DG.x + 4, y: footY, text: "the browser", size: 32, alpha: labelU });
  // native code: a sweep of light across the tiles, then a steady glow
  const tFast = S.word(2, "speed") - 0.1;
  TILES.forEach((_, i) => {
    const at = tFast + i * 0.11;
    const glow = Math.max(pulse(t, at, 0.8), 0.55 * prog(t, at + 0.3, 0.5));
    drawTile(ctx, i, { u: tilesU, labelU, glow });
  });
  const nu = prog(t, S.word(2, "native") - 0.15, 0.5, ease.outCubic);
  withAlpha(ctx, nu, () =>
    text(ctx, "native code, already in your browser", DG.x + DG_W - 4 - 12 * (1 - nu), footY, { font: sans(32, 600), color: C.text, baseline: "middle", align: "right" }));

  // Lit: a thin layer across the top, glued into every feature
  if (slabU > 0) {
    const e = ease.inOutCubic(slabU);
    const sx = DG.x, sw = DG_W * e, sy = DG.slabY, sh = DG.slabH;
    withAlpha(ctx, clamp(slabU * 3), () => {
      withGlow(ctx, rgba(LITC, 0.45), 26, () => fillRR(ctx, sx, sy, sw, sh, 14, "#1a2a55"));
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(sx, sy, sw, sh, 14);
      ctx.clip();
      const g = ctx.createLinearGradient(0, sy, 0, sy + sh);
      g.addColorStop(0, rgba(LITC, 0.34));
      g.addColorStop(1, rgba(LITC, 0.16));
      ctx.fillStyle = g;
      ctx.fillRect(sx, sy, sw, sh);
      text(ctx, "Lit", sx + 26, sy + sh / 2 + 1, { font: sans(38, 750), color: C.white, baseline: "middle" });
      ctx.restore();
      strokeRR(ctx, sx + 1, sy + 1, Math.max(0, sw - 2), sh - 2, 14, LITC, 2);
    });
    // the joints: one pin per feature, dropping in turn
    TILES.forEach((_, i) => {
      const r = tileRect(i);
      const px = r.x + r.w / 2;
      const pu = prog(t, S.word(2, "between") - 0.35 + i * 0.07, 0.4, ease.outCubic);
      if (pu <= 0) return;
      const y0 = DG.slabY + DG.slabH, y1 = lerp(y0, r.y, pu);
      ctx.save();
      ctx.strokeStyle = LITC;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(px, y0);
      ctx.lineTo(px, y1);
      ctx.stroke();
      ctx.restore();
      withGlow(ctx, rgba(LITC, 0.8), 12, () => {
        ctx.beginPath();
        ctx.arc(px, y1, 7, 0, Math.PI * 2);
        ctx.fillStyle = LITC;
        ctx.fill();
      });
    });
  }

  // small: the sizes, on the layer
  const su = prog(t, S.word(2, "small") - 0.25, 0.45, ease.outBack);
  if (su > 0) {
    const cy = DG.slabY + DG.slabH / 2;
    const items = [["lit-html", "≈ 3 KB"], ["all of Lit", "≈ 6 KB"]];
    let x = DG.x + DG_W - 24;
    withAlpha(ctx, clamp(su), () => {
      const nw = text(ctx, "compressed", x, cy + 1, { font: sans(24, 550), color: C.text2, baseline: "middle", align: "right" });
      x -= nw + 22;
      for (let k = items.length - 1; k >= 0; k--) {
        const [a, b] = items[k];
        const fa = sans(26, 550), fb = sans(28, 750);
        const wa = measure(ctx, a, fa), wb = measure(ctx, b, fb);
        const cw = wa + wb + 14 + 40, ch = 46;
        const cx0 = x - cw;
        withScale(ctx, lerp(0.85, 1, su), cx0 + cw / 2, cy, () => {
          fillRR(ctx, cx0, cy - ch / 2, cw, ch, ch / 2, rgba("#0c1224", 0.75));
          strokeRR(ctx, cx0 + 0.5, cy - ch / 2 + 0.5, cw - 1, ch - 1, ch / 2, rgba(LITC, 0.7), 1.5);
          text(ctx, a, cx0 + 20, cy + 1, { font: fa, color: C.text2, baseline: "middle" });
          text(ctx, b, cx0 + 20 + wa + 14, cy + 1, { font: fb, color: C.white, baseline: "middle" });
        });
        x = cx0 - 14;
      }
    });
  }
}

// --------------------------------------------------------------- draw

export function draw(F, S) {
  const { ctx, t } = F;
  const specs = rowSpecs(S);
  const marks = ["r1", "r2", "r3", "r4", "r5", "r6", "r7"].map((m) => S.m(m));
  const glue = S.m("glue");

  // the fold into the diagram: the rows' words go, then each icon flies to
  // its tile while its row fades
  const textOut = prog(t, glue - 0.45, 0.35);
  // (the lowest row leaves first: it has the farthest to go)
  const fold = (i) => prog(t, glue - 0.25 + (6 - i) * 0.06, 0.85, ease.inOutCubic);
  const D = {
    tilesU: prog(t, glue + 0.1, 0.5),
    labelU: prog(t, glue + 0.6, 0.45),
    slabU: prog(t, glue + 0.8, 0.8),
  };

  // title; at the very end it glides to where the outro's title sits (centred,
  // larger, over the three binding bars and the platform's), so the
  // crossfade hands it over
  const ti = prog(t, S.m("all") - 0.2, 0.6, ease.outCubic);
  const hand = prog(t, S.end - 1.02, 0.7, ease.inOutCubic);
  withAlpha(ctx, ti, () => {
    const TITLE = "What the browser does for Lit";
    const f = sans(Math.round(lerp(54, 64, hand) * 10) / 10, Math.round(lerp(700, 750, hand)));
    const tw = measure(ctx, TITLE, f);
    const x = lerp(TB.x, 960 - tw / 2, hand), y = lerp(118 + 16 * (1 - ti), 130, hand);
    if (hand > 0) withGlow(ctx, `rgba(122,162,255,${0.35 * hand})`, 36, () => text(ctx, TITLE, x, y, { font: f, color: C.text }));
    else text(ctx, TITLE, x, y, { font: f, color: C.text });
    withAlpha(ctx, hand, () => {
      B.forEach((c, i) => fillRR(ctx, 960 - 90 + i * 64, y + 34, 52, 8, 4, c));
      fillRR(ctx, 960 - 90, y + 50, 180, 8, 4, PLAT);
    });
  });
  // column heads
  const hu = prog(t, S.m("all") + 0.3, 0.5) * (1 - textOut);
  platLabel(ctx, { x: TB.x + 24, y: 160, text: "the browser", size: 24, alpha: hu });
  withAlpha(ctx, hu, () => text(ctx, "for Lit", LIT_X, 161, { font: sans(24, 700), color: LITC, baseline: "middle" }));

  if (D.tilesU > 0) drawDiagram(ctx, t, S, D);

  // empty slots for the seven rows, until each arrives
  for (let i = 0; i < 7; i++) {
    const su = prog(t, S.m("all") + 0.15 + i * 0.08, 0.4) * (1 - prog(t, marks[i] - 0.15, 0.4));
    if (su <= 0) continue;
    withAlpha(ctx, 0.55 * su, () => {
      ctx.save();
      ctx.setLineDash([10, 10]);
      strokeRR(ctx, TB.x + 0.5, rowY(i) + 0.5, TB.w - 1, TB.h - 1, 16, C.border2, 1.5);
      ctx.restore();
    });
  }

  specs.forEach((spec, i) => {
    const u = prog(t, marks[i] - 0.15, 0.55, ease.linear);
    if (u <= 0) return;
    const next = marks[i + 1] ?? glue;
    const lit = window(t, marks[i] - 0.15, next - 0.2, 0.4, 0.5);
    const lits = spec.lit.map(([, at]) => prog(t, at - 0.15, 0.45, ease.outCubic));
    const f = fold(i);
    drawRow(ctx, i, spec, { u, lit, lits, textA: 1 - textOut, bandA: Math.min(1 - f, 1 - 0.55 * textOut) });
    // the icon: in its row, then flying to its tile
    const home = iconHome(i), dest = tileIcon(i);
    home.y -= 24 * (1 - ease.outCubic(u)); // the row's slide in
    const p = mix(home, dest, f);
    const k = lerp(ICON_S, TILE_ICON_S, f) * (0.94 + 0.06 * ease.outBack(clamp(u * 1.4)));
    const bright = lerp(0.62 + 0.38 * lit, 1, f);
    withAlpha(ctx, clamp(u * 1.8) * bright, () => ICONS[i](ctx, p.x, p.y, k));
  });
}
