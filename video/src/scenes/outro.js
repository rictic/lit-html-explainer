// outro: where to read more (the design doc and the source, both in the
// lit repo), then small credits; under the title from open, as a bookend.
// Ends by fading to the background.

import { B, C, SIZE, rgba } from "../kit/theme.js";
import { fillRR, measure, mono, sans, strokeRR, text, withAlpha, withGlow } from "../kit/draw.js";
import { OBJ } from "../kit/lit.js";
import { truth } from "../timing.js";
import { clamp, ease, prog } from "../util.js";
import { runs } from "./recap-glyphs.js";

export const transition = "fade";

const CARD = { x: 300, w: 1320 };

// A page with a folded corner.
function docGlyph(ctx, cx, cy, color) {
  const w = 64, h = 82, x = cx - w / 2, y = cy - h / 2, f = 18;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + w - f, y);
  ctx.lineTo(x + w, y + f);
  ctx.lineTo(x + w, y + h - 8);
  ctx.quadraticCurveTo(x + w, y + h, x + w - 8, y + h);
  ctx.lineTo(x + 8, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - 8);
  ctx.lineTo(x, y + 8);
  ctx.quadraticCurveTo(x, y, x + 8, y);
  ctx.closePath();
  ctx.fillStyle = rgba(color, 0.14);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w - f, y);
  ctx.lineTo(x + w - f, y + f);
  ctx.lineTo(x + w, y + f);
  ctx.stroke();
  ctx.restore();
  return { x, y, w, h };
}

// A few lines of text on a page.
function docLines(ctx, g, color) {
  [30, 34, 26, 32].forEach((len, i) => fillRR(ctx, g.x + 14, g.y + 30 + i * 11, len, 4, 2, rgba(color, 0.7)));
}

function card(ctx, { y, h, u, color, icon, title, titleFont, path, caption = null, captionU = 0 }) {
  if (u <= 0) return;
  const e = ease.outCubic(u);
  const x = CARD.x, w = CARD.w, yy = y + 26 * (1 - e);
  withAlpha(ctx, clamp(u * 1.6), () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    fillRR(ctx, x, yy, w, h, 18, C.panel);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, yy, w, h, 18);
    ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + w * 0.7, 0);
    g.addColorStop(0, rgba(color, 0.12));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, yy, w, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, yy, 8, h);
    ctx.restore();
    strokeRR(ctx, x + 0.5, yy + 0.5, w - 1, h - 1, 18, rgba(color, 0.45), 1.5);
    icon(x + 100, yy + h / 2);
    const tx = x + 190;
    const top = caption ? yy + 66 : yy + h / 2 - 28;
    text(ctx, title, tx, top, { font: titleFont, color: C.text, baseline: "middle" });
    runs(ctx, path, tx, top + 64);
    if (caption && captionU > 0) {
      withAlpha(ctx, captionU, () =>
        text(ctx, caption, tx + 12 * (1 - captionU), top + 124, { font: sans(32, 500), color: C.text2, baseline: "middle" }));
    }
  });
}

// "github.com/lit/lit  ›  <path>", with the repository dimmer than the path.
function repoPath(path) {
  const f = mono(27, 500);
  return [
    { text: "github.com/", font: f, color: C.text3 },
    { text: "lit/lit", font: f, color: C.text2 },
    { text: "  ›  ", font: sans(28, 500), color: C.text3 },
    { text: path, font: f, color: OBJ.result },
  ];
}

export function draw(F, S) {
  const { ctx, t } = F;
  const endFade = prog(t, S.end - 1.3, 1.0, ease.inOutCubic);       // cards and credits
  const titleFade = prog(t, S.end - 0.95, 0.9, ease.inOutCubic);    // the title last

  // the title, as in open, smaller and at the top
  withAlpha(ctx, 1 - titleFade, () => {
    const y = 190;
    withGlow(ctx, "rgba(122,162,255,0.35)", 36, () =>
      text(ctx, "How lit-html renders", 960, y, { font: sans(SIZE.h1 + 12, 750), color: C.text, align: "center" }));
    B.forEach((c, i) => fillRR(ctx, 960 - 90 + i * 64, y + 36, 52, 8, 4, c));
  });

  withAlpha(ctx, 1 - endFade, () => {
    // "Life of a lit-html render", in the lit repo
    card(ctx, {
      y: 316, h: 196, u: prog(t, S.m("read") - 0.2, 0.6, ease.linear), color: OBJ.result,
      icon: (cx, cy) => { const g = docGlyph(ctx, cx, cy, OBJ.result); docLines(ctx, g, OBJ.result); },
      title: "Life of a lit-html render", titleFont: sans(46, 700),
      path: repoPath("dev-docs/design/how-lit-html-works.md"),
    });
    // and the source
    card(ctx, {
      y: 552, h: 256, u: prog(t, S.m("source") - 0.2, 0.6, ease.linear), color: C.accent,
      icon: (cx, cy) => {
        const g = docGlyph(ctx, cx, cy, C.accent);
        text(ctx, "TS", g.x + g.w / 2, g.y + g.h / 2 + 8, { font: sans(24, 800), color: C.accent, align: "center", baseline: "middle" });
      },
      title: "lit-html.ts", titleFont: mono(46, 600),
      path: repoPath("packages/lit-html/src/lit-html.ts"),
      caption: "well commented, and all in one file", captionU: prog(t, S.m("file") - 0.15, 0.5, ease.outCubic),
    });

    // credits, in one centred row
    const cu = prog(t, S.word(0, "file") + 0.45, 0.8, ease.outCubic);
    if (cu > 0) {
      const version = truth().litHtmlVersion[0];
      const items = ["Voice: Gemini 3.8 Flash TTS", "Music: Lyria 3.5", `Data captured from lit-html ${version}`, "Drawn on a canvas"];
      const f = sans(26, 500), sep = 64;
      const ws = items.map((s) => measure(ctx, s, f));
      let x = 960 - (ws.reduce((a, b) => a + b, 0) + sep * (items.length - 1)) / 2;
      const y = 930 + 10 * (1 - cu);
      withAlpha(ctx, cu, () => items.forEach((s, i) => {
        text(ctx, s, x, y, { font: f, color: C.text3, baseline: "middle" });
        x += ws[i];
        if (i < items.length - 1) {
          ctx.fillStyle = C.text4;
          ctx.beginPath();
          ctx.arc(x + sep / 2, y + 1, 3.5, 0, Math.PI * 2);
          ctx.fill();
          x += sep;
        }
      }));
    }
  });
}
