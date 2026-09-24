// intro: a callback to episode 1's pipeline (template literal → prepare →
// create → update), with the browser's share of the work lit up underneath
// it (parse, copy, walk); lit-html's size, which that sharing buys; the
// title card.
//
// Layout: the strip and "the browser" band fill the frame at first; on
// {size} they shrink to the top as context and the sizes table takes the
// lower half; on {tour} everything gives way to the title.

import { B, C, SYN, rgba } from "../kit/theme.js";
import { along, fillRR, measure, mono, sans, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { phasePill } from "../scenes/recap-glyphs.js";
import { PLAT, browserGlyph } from "./intro-platform.js";
import { clamp, ease, lerp, mix, prog, pulse, window } from "../util.js";

export const transition = "fade";

// Sizes of lit 3.3.3's npm packages, in bytes (docs/PLATFORM.md, "The facts").
// Row 2 is all of Lit's core: lit-html.js plus the three files, concatenated.
const SIZES = [
  { name: "lit-html", files: "lit-html.js", cols: ["7,309", "3,234", "2,937"], about: "about 3 KB" },
  { name: "all of Lit", files: "+ css-tag.js, reactive-element.js, lit-element.js", cols: ["16,324", "6,164", "5,576"], about: "about 6 KB" },
];
const HEADS = ["minified", "gzip -9", "brotli -q 11"];

// ------------------------------------------------------------ layout
const STRIP_Y = 322;                          // centre line of the strip
const TILE = { x: 290, w: 300, h: 118 };      // the template literal
const PILL = { w: 256, h: 68 };
const PX = [690, 1030, 1370];                 // pill left edges: prepare, create, update
const PHASES = ["prepare", "create", "update"];
const BAND = { x: 262, y: 470, w: 1392, h: 318, head: 58 };
const CHIP = { w: 276, h: 92, rows: [BAND.y + BAND.head + 24, BAND.y + BAND.head + 24 + 92 + 18] };
// the group's framings: local line fy drawn at screen y sy, scaled by k
const VIEW = {
  strip: { fy: 290, sy: 505, k: 1.1 },
  band: { fy: 460, sy: 548, k: 1.1 },
  small: { fy: 460, sy: 252, k: 0.6 },
};
const TAB = { x: 196, y: 500, w: 1410, h: 420 };

const pillCx = (i) => PX[i] + PILL.w / 2;

// The browser's work, per phase column: [phase index, row, verb, API, mark].
const WORK = [
  [0, 0, "parse", "innerHTML", "parse"],
  [1, 0, "copy", "importNode", "clone"],
  [0, 1, "walk", "TreeWalker", "walk"],
  [1, 1, "walk", "TreeWalker", "walk"],
];

export function draw(F, S) {
  const { ctx, t } = F;
  const tour = S.m("tour");
  const out = prog(t, tour - 0.4, 0.5, ease.inOutCubic);   // everything but the title leaves
  if (out < 1) {
    withAlpha(ctx, 1 - out, () => {
      ctx.save();
      ctx.translate(0, -24 * out);
      drawGroup(ctx, t, S);
      drawTable(ctx, t, S);
      ctx.restore();
    });
  }
  drawTitle(ctx, t, S);
}

// ------------------------------------------------ the strip and the band

function drawGroup(ctx, t, S) {
  // three framings: the strip alone; the strip over the band; both, small, at the top
  const ab = prog(t, S.m("recap") - 0.25, 0.8);
  const bc = prog(t, S.m("size") - 0.35, 0.9);
  const V = mix(mix(VIEW.strip, VIEW.band, ab), VIEW.small, bc);
  // context once the table is in
  ctx.save();
  ctx.globalAlpha *= lerp(1, 0.6, prog(t, S.m("size") + 0.3, 0.8));
  ctx.translate(960, V.sy);
  ctx.scale(V.k, V.k);
  ctx.translate(-960, -V.fy);

  // episode 1, named
  const capU = prog(t, S.start + 0.2, 0.7, ease.outCubic);
  withAlpha(ctx, capU, () => {
    const f = sans(30, 600);
    const label = "How lit-html renders";
    const w = measure(ctx, label, f);
    const x = 960 - (w + 150) / 2;
    ctx.save();
    fillRR(ctx, x, 132, 128, 38, 19, C.panel3);
    ctx.restore();
    text(ctx, "episode 1", x + 64, 152, { font: sans(21, 650), color: C.text2, align: "center", baseline: "middle" });
    text(ctx, label, x + 150, 152, { font: f, color: C.text2, baseline: "middle" });
    B.forEach((c, i) => fillRR(ctx, x + 150 + w + 22 + i * 30, 148, 24, 7, 3.5, c));
  });

  drawStrip(ctx, t, S);
  drawBand(ctx, t, S);
  ctx.restore();
}

function drawStrip(ctx, t, S) {
  // in: the tile, then each pill; the arrows between
  const inAt = (i) => S.start + 0.35 + i * 0.14;
  // the trip: a dot runs from the tile through the three phases as the
  // narration "follows one template through lit-html"
  const t0 = S.word(0, "followed") - 0.1, t1 = S.word(0, "html") + 0.1;
  const legs = 3, legDur = (t1 - t0) / legs;
  const litAt = (i) => t0 + i * legDur;        // node i reached (0 = the tile)
  const nodeGlow = (i) => pulse(t, litAt(i) - 0.15, 0.95);

  // the tile: html`…` and the three binding colours
  const tu = prog(t, inAt(0), 0.5, ease.outCubic);
  const ty = STRIP_Y - TILE.h / 2;
  withAlpha(ctx, tu, () => {
    const g = nodeGlow(0);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, TILE.x, ty, TILE.w, TILE.h, 16, C.panel);
    ctx.restore();
    if (g > 0) withGlow(ctx, rgba(C.accent, 0.8 * g), 26 * g, () => strokeRR(ctx, TILE.x, ty, TILE.w, TILE.h, 16, rgba(C.accent, g), 2.5));
    strokeRR(ctx, TILE.x + 0.75, ty + 0.75, TILE.w - 1.5, TILE.h - 1.5, 16, C.border2, 1.5);
    const f = mono(44, 500);
    const pieces = [["html", SYN.fn], ["`", SYN.punct], ["…", C.text2], ["`", SYN.punct]];
    const w = pieces.reduce((n, [s]) => n + measure(ctx, s, f), 0);
    let x = TILE.x + TILE.w / 2 - w / 2;
    for (const [s, c] of pieces) x += text(ctx, s, x, ty + 50, { font: f, color: c, baseline: "middle" });
    B.forEach((c, i) => fillRR(ctx, TILE.x + TILE.w / 2 - 48 + i * 34, ty + 88, 28, 7, 3.5, c));
  });
  text(ctx, "template literal", TILE.x + TILE.w / 2, ty + TILE.h + 34, { font: sans(24, 600), color: C.text3, align: "center", baseline: "middle", alpha: tu });

  // arrows, and the pills
  const ends = PX.map((x) => ({ x: x + PILL.w, y: STRIP_Y }));
  for (let i = 0; i < 3; i++) {
    const a = { x: (i === 0 ? TILE.x + TILE.w : ends[i - 1].x) + 14, y: STRIP_Y }, b = { x: PX[i] - 14, y: STRIP_Y };
    const u = prog(t, inAt(i) + 0.1, 0.4);
    if (u > 0) {
      ctx.save();
      ctx.strokeStyle = C.text3;
      ctx.fillStyle = C.text3;
      ctx.lineWidth = 2.5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(lerp(a.x, b.x, u), a.y);
      ctx.stroke();
      if (u >= 1) {
        ctx.beginPath();
        ctx.moveTo(b.x + 2, b.y);
        ctx.lineTo(b.x - 10, b.y - 7);
        ctx.lineTo(b.x - 10, b.y + 7);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
  }
  PHASES.forEach((ph, i) => {
    const u = prog(t, inAt(i + 1), 0.45, ease.outBack);
    if (u <= 0) return;
    // the phase the browser helps with glows when its work is named
    const named = WORK.filter((w) => w[0] === i).map((w) => pulse(t, S.m(w[4]) - 0.2, 1.1));
    // "at almost every step": a sweep along the three
    const sweep = pulse(t, S.word(0, "every") - 0.15 + i * 0.22, 0.8);
    const glow = Math.max(nodeGlow(i + 1), sweep, ...named, 0);
    // idle until the trip reaches it, then active (as episode 1's phase bar)
    const on = prog(t, litAt(i + 1) - 0.2, 0.3);
    withScale(ctx, lerp(0.8, 1, u), PX[i] + PILL.w / 2, STRIP_Y, () => {
      if (on < 1) phasePill(ctx, { x: PX[i], y: STRIP_Y - PILL.h / 2, w: PILL.w, h: PILL.h, label: ph, state: "idle", alpha: clamp(u) * (1 - on), font: sans(27, 650) });
      if (on > 0) phasePill(ctx, { x: PX[i], y: STRIP_Y - PILL.h / 2, w: PILL.w, h: PILL.h, label: ph, glow, alpha: clamp(u) * on, font: sans(27, 650) });
    });
  });

  // the travelling dot
  if (t > t0 && t < t1 + 0.4) {
    const u = clamp((t - t0) / (t1 - t0));
    const leg = Math.min(legs - 1, Math.floor(u * legs));
    const lu = ease.inOutCubic(u * legs - leg);
    const a = leg === 0 ? { x: TILE.x + TILE.w - 6, y: STRIP_Y } : { x: ends[leg - 1].x - 6, y: STRIP_Y };
    const p = along(a, { x: PX[leg] + 20, y: STRIP_Y }, lu, 0);
    const fade = 1 - prog(t, t1, 0.4);
    withAlpha(ctx, fade, () => withGlow(ctx, rgba(C.white, 0.9), 18, () => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = C.white;
      ctx.fill();
    }));
  }
}

function drawBand(ctx, t, S) {
  const u = prog(t, S.m("recap") - 0.1, 0.7, ease.outCubic);
  if (u <= 0) return;
  const y = BAND.y + 36 * (1 - u);
  const hot = pulse(t, S.word(0, "browser") - 0.25, 1.2);
  withAlpha(ctx, u, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    fillRR(ctx, BAND.x, y, BAND.w, BAND.h, 18, C.panel);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(BAND.x, y, BAND.w, BAND.h, 18);
    ctx.clip();
    ctx.fillStyle = rgba(PLAT, 0.1 + 0.08 * hot);
    ctx.fillRect(BAND.x, y, BAND.w, BAND.head);
    ctx.fillStyle = rgba(PLAT, 0.45);
    ctx.fillRect(BAND.x, y + BAND.head - 1.5, BAND.w, 1.5);
    ctx.restore();
    if (hot > 0) withAlpha(ctx, hot, () => withGlow(ctx, rgba(PLAT, 0.7), 26, () => strokeRR(ctx, BAND.x, y, BAND.w, BAND.h, 18, rgba(PLAT, 0.9), 2.5)));
    strokeRR(ctx, BAND.x + 0.75, y + 0.75, BAND.w - 1.5, BAND.h - 1.5, 18, rgba(PLAT, 0.5), 1.5);
    browserGlyph(ctx, BAND.x + 42, y + BAND.head / 2, 1.05);
    text(ctx, "the browser", BAND.x + 72, y + BAND.head / 2 + 1, { font: sans(28, 700), color: PLAT, baseline: "middle" });
  });

  // the work: a chip per job, under the phase it does it for, and a
  // connector from the pill down into the band
  const dy = y - BAND.y;
  const cols = new Map();
  for (const [ph, row, verb, api, mk] of WORK) {
    const cu = prog(t, S.m(mk) - 0.18, 0.45, ease.outBack);
    if (cu <= 0) continue;
    cols.set(ph, Math.max(cols.get(ph) ?? 0, clamp(cu)));
    const cx = pillCx(ph), cy = CHIP.rows[row] + dy + CHIP.h / 2;
    const glow = pulse(t, S.m(mk) - 0.1, 1.0);
    withAlpha(ctx, clamp(cu) * u, () => withScale(ctx, lerp(0.7, 1, cu), cx, cy, () => {
      const x = cx - CHIP.w / 2, y0 = cy - CHIP.h / 2;
      fillRR(ctx, x, y0, CHIP.w, CHIP.h, 14, C.panel2);
      fillRR(ctx, x, y0, CHIP.w, CHIP.h, 14, rgba(PLAT, 0.07 + 0.08 * glow));
      if (glow > 0) withGlow(ctx, rgba(PLAT, 0.8 * glow), 22 * glow, () => strokeRR(ctx, x, y0, CHIP.w, CHIP.h, 14, rgba(PLAT, glow), 2.5));
      strokeRR(ctx, x + 0.75, y0 + 0.75, CHIP.w - 1.5, CHIP.h - 1.5, 14, rgba(PLAT, 0.6), 1.5);
      text(ctx, verb, cx, cy - 16, { font: sans(33, 650), color: C.text, align: "center", baseline: "middle" });
      text(ctx, api, cx, cy + 22, { font: mono(25, 500), color: PLAT, align: "center", baseline: "middle" });
    }));
  }
  // connectors: pill bottom -> band, one per phase with work
  for (const [ph, cu] of cols) {
    const x = pillCx(ph);
    const y0 = STRIP_Y + PILL.h / 2 + 8, y1 = y + BAND.head + 14;
    ctx.save();
    ctx.globalAlpha *= cu * u;
    ctx.strokeStyle = rgba(PLAT, 0.85);
    ctx.lineWidth = 2.5;
    ctx.setLineDash([7, 7]);
    ctx.beginPath();
    ctx.moveTo(x, y0);
    ctx.lineTo(x, lerp(y0, y1, cu));
    ctx.stroke();
    ctx.restore();
  }
}

// ------------------------------------------------------ the sizes table

function drawTable(ctx, t, S) {
  const tin = prog(t, S.m("size") + 0.15, 0.6, ease.outCubic);
  if (tin <= 0) return;
  const { x, w } = TAB;
  const y = TAB.y + 30 * (1 - tin);
  const rowH = 128, headY = y + 58, rowY = [y + 108, y + 108 + rowH];
  const colR = [x + w - 520, x + w - 290, x + w - 44];   // right edges of the number columns
  const colW = 200;
  const three = S.word(1, "three"), comp = S.word(1, "compressed"), six = S.word(1, "six");
  const rows = [prog(t, S.m("size") + 0.45, 0.5, ease.outCubic), prog(t, S.m("lit") - 0.2, 0.55, ease.outCubic)];
  const lit = [
    Math.max(window(t, three - 0.25, six - 0.25, 0.4, 0.6), 0.35 * prog(t, six - 0.25, 0.6)),
    prog(t, six - 0.25, 0.45),
  ];
  const h = TAB.h;

  withAlpha(ctx, tin, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    fillRR(ctx, x, y, w, h, 18, C.panel);
    ctx.restore();
    strokeRR(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 18, C.border2, 1.5);
    // column heads
    HEADS.forEach((hd, i) => text(ctx, hd, colR[i], headY, { font: mono(24, 500), color: C.text3, align: "right", baseline: "middle" }));
    // "compressed", over the two compressed columns
    const cu = prog(t, comp - 0.15, 0.5, ease.outCubic);
    if (cu > 0) {
      const x0 = colR[1] - colW + 10, x1 = colR[2] + 6, by = headY - 34;
      withAlpha(ctx, cu, () => {
        ctx.save();
        ctx.strokeStyle = rgba(C.accent, 0.9);
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, by + 10);
        ctx.lineTo(x0, by);
        ctx.lineTo(lerp(x0, x1, cu), by);
        if (cu >= 1) ctx.lineTo(x1, by + 10);
        ctx.stroke();
        ctx.restore();
        const lw = measure(ctx, "compressed", sans(24, 650)) + 24;
        fillRR(ctx, (x0 + x1) / 2 - lw / 2, by - 16, lw, 32, 8, C.panel);
        text(ctx, "compressed", (x0 + x1) / 2, by, { font: sans(24, 650), color: C.accent, align: "center", baseline: "middle" });
      });
    }
    ctx.fillStyle = C.border;
    ctx.fillRect(x + 30, headY + 32, w - 60, 1.5);
    // rows
    SIZES.forEach((r, i) => {
      const ru = rows[i];
      if (ru <= 0) return;
      const cy = rowY[i] + rowH / 2;
      withAlpha(ctx, ru, () => {
        const dx = 24 * (1 - ru);
        text(ctx, r.name, x + 44 + dx, cy - 18, { font: sans(40, 700), color: C.text, baseline: "middle" });
        text(ctx, r.files, x + 46 + dx, cy + 28, { font: mono(21, 450), color: C.text3, baseline: "middle" });
        // the compressed cells: washed and ringed as the narration gives the number
        const L = lit[i];
        if (L > 0) {
          const rx = colR[1] - colW, rw = colR[2] - rx + 18;
          withAlpha(ctx, L, () => {
            fillRR(ctx, rx, cy - 34, rw, 68, 12, rgba(C.accent, 0.16));
            strokeRR(ctx, rx, cy - 34, rw, 68, 12, rgba(C.accent, 0.75), 2);
          });
        }
        r.cols.forEach((v, c) => {
          const bw = measure(ctx, " B", mono(26, 500));
          const bright = c > 0 && L > 0.5;
          text(ctx, " B", colR[c], cy + 2, { font: mono(26, 500), color: C.text3, align: "right", baseline: "middle" });
          text(ctx, v, colR[c] - bw, cy, { font: mono(40, bright ? 650 : 550), color: c === 0 ? C.text2 : C.text, align: "right", baseline: "middle" });
        });
        if (i === 0) {
          ctx.fillStyle = C.border;
          ctx.fillRect(x + 30, rowY[0] + rowH, w - 60, 1);
        }
      });
      // "about 3 KB", "about 6 KB", to the right of the table
      const au = prog(t, (i === 0 ? three : six) - 0.2, 0.45, ease.outCubic);
      if (au > 0) {
        withAlpha(ctx, au * (i === 0 ? lerp(1, 0.5, prog(t, six - 0.25, 0.5)) : 1), () => {
          text(ctx, r.about, x + w + 30 + 14 * (1 - au), cy, { font: sans(34, 700), color: C.accent, baseline: "middle" });
        });
      }
    });
    text(ctx, "bytes · lit 3.3.3 from npm", x + w - 44, y + h - 30, { font: sans(21, 500), color: C.text3, align: "right", baseline: "middle" });
  });
}

// ------------------------------------------------------------- the title

function drawTitle(ctx, t, S) {
  const ti = prog(t, S.m("tour") - 0.12, 1.0, ease.outCubic);
  if (ti <= 0) return;
  withAlpha(ctx, ti, () => {
    const y = 470 + 24 * (1 - ti);
    withGlow(ctx, "rgba(122,162,255,0.35)", 40, () =>
      text(ctx, "What the browser does for Lit", 960, y, { font: sans(96, 750), color: C.text, align: "center" }));
    text(ctx, "the web platform features underneath Lit", 960, y + 80, { font: sans(36, 450), color: C.text2, align: "center" });
    // episode 1's signature (the three binding colours), resting on the platform's
    B.forEach((c, i) => fillRR(ctx, 960 - 90 + i * 64, y + 130, 52, 8, 4, c));
    fillRR(ctx, 960 - 90, y + 146, 180, 8, 4, PLAT);
  });
}
