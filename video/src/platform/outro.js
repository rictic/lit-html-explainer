// outro: the lit-html explorer (Lit's side: LITC), then the specs behind each
// feature (platform link cards: PLAT, in the order the video met them) and
// Lit's source, then small credits; under the title, handed over from recap
// as a bookend. Ends by fading to the background.

import { B, C, SYN, rgba } from "../kit/theme.js";
import { fillRR, measure, mono, sans, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { OBJ } from "../kit/lit.js";
import { platformTruth } from "../timing.js";
import { clamp, ease, lerp, prog } from "../util.js";
import { runs } from "../scenes/recap-glyphs.js";
import { LITC, PLAT, docGlyph, platLabel } from "./recap-icons.js";

export const transition = "fade";

const X0 = 110, W = 1700;

// A browser window with the series' three binding colours in it: the explorer.
function explorerGlyph(ctx, cx, cy) {
  const w = 104, h = 80, x = cx - w / 2, y = cy - h / 2;
  fillRR(ctx, x, y, w, h, 10, C.panel2);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.clip();
  ctx.fillStyle = rgba(C.accent, 0.22);
  ctx.fillRect(x, y, w, 18);
  ctx.restore();
  strokeRR(ctx, x + 1, y + 1, w - 2, h - 2, 10, C.accent, 2.5);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(x + 12 + i * 10, y + 9, 3, 0, Math.PI * 2);
    ctx.fillStyle = rgba(C.accent, 0.8);
    ctx.fill();
  }
  // a template, its holes in the three binding colours
  const rows = [[10, [22, 12, 18]], [22, [14, 20]], [10, [26, 10]]];
  rows.forEach(([dx, segs], r) => {
    let sx = x + dx;
    const ry = y + 32 + r * 14;
    segs.forEach((len, k) => {
      fillRR(ctx, sx, ry - 3, len, 6, 3, rgba(C.text2, 0.7));
      sx += len + 4;
      if (k < segs.length - 1 || r === 1) {
        fillRR(ctx, sx, ry - 4, 12, 8, 3, B[(r + k) % 3]);
        sx += 16;
      }
    });
  });
}

// The big card (as in episode 1's outro): stripe, wash, icon, title, a path, a caption.
function bigCard(ctx, { y, h, u, color, icon, title, titleFont, path, caption, captionU }) {
  if (u <= 0) return;
  const e = ease.outCubic(u);
  const x = X0, yy = y + 26 * (1 - e);
  withAlpha(ctx, clamp(u * 1.6), () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    fillRR(ctx, x, yy, W, h, 18, C.panel);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, yy, W, h, 18);
    ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + W * 0.7, 0);
    g.addColorStop(0, rgba(color, 0.13));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, yy, W, h);
    ctx.fillStyle = color;
    ctx.fillRect(x, yy, 8, h);
    ctx.restore();
    strokeRR(ctx, x + 0.5, yy + 0.5, W - 1, h - 1, 18, rgba(color, 0.5), 1.5);
    icon(x + 104, yy + h / 2);
    const tx = x + 200;
    text(ctx, title, tx, yy + 58, { font: titleFont, color: C.text, baseline: "middle" });
    const pw = runs(ctx, path, tx, yy + 112);
    if (captionU > 0) {
      withAlpha(ctx, captionU, () =>
        text(ctx, caption, tx + pw + 36 + 12 * (1 - captionU), yy + 112, { font: sans(31, 500), color: C.text2, baseline: "middle" }));
    }
  });
}

// The specs, in the order the video met them. badge: the standard; title:
// runs (mono for API names); host: where it lives.
const M = (text) => ({ text, mono: true });
const T = (text) => ({ text });
const LINKS = [
  { badge: "ECMA-262", title: [M("GetTemplateObject")], host: "tc39.es/ecma262" },
  { badge: "HTML", title: [T("The template element")], host: "html.spec.whatwg.org" },
  { badge: "HTML", title: [T("Support processing instructions in HTML")], host: "github.com/whatwg/html" },
  { badge: "DOM", title: [M("importNode"), T(" and "), M("TreeWalker")], host: "dom.spec.whatwg.org" },
  { badge: "DOM", title: [M("EventListener"), T(" and "), M("handleEvent")], host: "dom.spec.whatwg.org" },
  { badge: "HTML", title: [T("Custom elements")], host: "html.spec.whatwg.org" },
  { badge: "DOM", title: [T("Shadow DOM: "), M("attachShadow")], host: "dom.spec.whatwg.org" },
  { badge: "CSSOM", title: [M("adoptedStyleSheets")], host: "drafts.csswg.org/cssom" },
];
const GRID = { y: 468, h: 92, gap: 16, colGap: 24, rows: 4 };
const colW = (W - GRID.colGap) / 2;
// column-major: the left column reads down first
const linkRect = (i) => ({
  x: X0 + Math.floor(i / GRID.rows) * (colW + GRID.colGap),
  y: GRID.y + (i % GRID.rows) * (GRID.h + GRID.gap),
  w: colW,
  h: GRID.h,
});

const titleSans = sans(29, 650), titleMono = mono(27, 600);

const badgeFont = sans(22, 700);
// One badge width for all (the widest label), so the titles line up.
const badgeW = (ctx) => 46 + Math.max(...LINKS.map((L) => measure(ctx, L.badge, badgeFont))) + 20;

function linkCard(ctx, L, r, u) {
  if (u <= 0) return;
  const e = ease.outCubic(u);
  const y = r.y + 18 * (1 - e);
  withAlpha(ctx, clamp(u * 1.6), () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, r.x, y, r.w, r.h, 14, C.panel);
    ctx.restore();
    strokeRR(ctx, r.x + 0.5, y + 0.5, r.w - 1, r.h - 1, 14, C.border, 1.5);
    // the standard, as a platform tag: a spec page and its name
    const bw = badgeW(ctx), bh = 40;
    const bx = r.x + 20, by = y + r.h / 2 - bh / 2;
    fillRR(ctx, bx, by, bw, bh, bh / 2, rgba(PLAT, 0.1));
    strokeRR(ctx, bx + 0.75, by + 0.75, bw - 1.5, bh - 1.5, bh / 2, rgba(PLAT, 0.6), 1.5);
    docGlyph(ctx, bx + 27, by + bh / 2, 0.78);
    text(ctx, L.badge, bx + 46 + (bw - 46 - 20) / 2, by + bh / 2 + 1, { font: badgeFont, color: PLAT, align: "center", baseline: "middle" });
    // what, and where
    const tx = bx + bw + 24;
    runs(ctx, L.title.map((it) => ({ text: it.text, font: it.mono ? titleMono : titleSans, color: it.mono ? SYN.fn : C.text })), tx, y + 32);
    text(ctx, L.host, tx, y + 67, { font: mono(21, 500), color: C.text3, baseline: "middle" });
  });
}

// Chromium's major version, from the user agent the platform facts were captured in.
function chromiumVersion() {
  const ua = platformTruth()?.userAgent ?? "";
  return /Chrome\/(\d+)/.exec(ua)?.[1] ?? "";
}

export function draw(F, S) {
  const { ctx, t } = F;
  const endFade = prog(t, S.end - 1.5, 1.1, ease.inOutCubic);   // cards and credits
  const titleFade = prog(t, S.end - 1.1, 1.0, ease.inOutCubic);  // the title last

  // the title, as a bookend (recap glides its own title to this spot just
  // before the crossfade, so it's already here as the scene fades in)
  withAlpha(ctx, 1 - titleFade, () => {
    const y = 130;
    withGlow(ctx, "rgba(122,162,255,0.35)", 36, () =>
      text(ctx, "What the browser does for Lit", 960, y, { font: sans(64, 750), color: C.text, align: "center" }));
    // episode 1's signature, resting on the platform's (as the intro's title)
    B.forEach((c, i) => fillRR(ctx, 960 - 90 + i * 64, y + 34, 52, 8, 4, c));
    fillRR(ctx, 960 - 90, y + 50, 180, 8, 4, PLAT);
  });

  withAlpha(ctx, 1 - endFade, () => {
    // the explorer: alone, centred and a little larger at first, then up to
    // make room for the links
    const L0 = S.m("links");
    const up = prog(t, L0 - 0.95, 0.75, ease.inOutCubic); // in the pause before "Links"
    const cardY = lerp(452, 210, up), cardH = 164, k = lerp(1.04, 1, up);
    const pf = mono(29, 500);
    withScale(ctx, k, 960, cardY + cardH / 2, () => bigCard(ctx, {
      y: cardY, h: cardH, u: prog(t, S.m("explorer") - 0.2, 0.6, ease.linear), color: LITC,
      icon: (cx, cy) => explorerGlyph(ctx, cx, cy),
      title: "lit-html explorer", titleFont: sans(48, 700),
      path: [{ text: "/explorer/", font: pf, color: OBJ.result }],
      caption: "watch lit-html render your own templates",
      captionU: prog(t, S.word(0, "templates,") - 0.2, 0.5, ease.outCubic),
    }));

    // the specs, and the source
    const hu = prog(t, L0 - 0.2, 0.5, ease.outCubic);
    withAlpha(ctx, hu, () => {
      const hy = GRID.y - 34 + 10 * (1 - hu);
      platLabel(ctx, { x: X0 + 6, y: hy, text: "The specs", size: 28, glyph: "doc" });
      const src = [
        { text: "and the source:  ", font: sans(28, 500), color: C.text3 },
        { text: "github.com/", font: mono(26, 500), color: C.text3 },
        { text: "lit/lit", font: mono(26, 600), color: C.text2 },
      ];
      const sw = src.reduce((a, it) => a + measure(ctx, it.text, it.font), 0);
      runs(ctx, src, X0 + W - 4 - sw, hy);
    });
    LINKS.forEach((L, i) => linkCard(ctx, L, linkRect(i), prog(t, L0 - 0.1 + i * 0.1, 0.5, ease.linear)));

    // credits, in one centred row
    const cu = prog(t, S.word(0, "video.") + 0.4, 0.8, ease.outCubic);
    if (cu > 0) {
      // Lit 3.3.3: the lit release the flake pins for truth/platform.js
      // (lit-html 3.3.3, lit-element 4.2.2, @lit/reactive-element 2.1.2)
      const items = ["Voice: Gemini 3.8 Flash TTS", "Music: Lyria 3.5", `Facts captured from Chromium ${chromiumVersion()} and Lit 3.3.3`, "Drawn on a canvas"];
      const f = sans(25, 500), sep = 56;
      const ws = items.map((s) => measure(ctx, s, f));
      let x = 960 - (ws.reduce((a, b) => a + b, 0) + sep * (items.length - 1)) / 2;
      const y = 972 + 10 * (1 - cu);
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
