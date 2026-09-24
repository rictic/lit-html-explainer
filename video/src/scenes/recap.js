// recap: the four layers of caching that make re-renders cheap, stacked one
// per mark (l1..l4); then the answer to the opening's two mystery comments,
// on the same devtools view of the page.

import { B, C, SYN, rgba } from "../kit/theme.js";
import { arrow, check, fillRR, mono, ring, sans, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { devtools } from "../kit/browser.js";
import { Tree } from "../kit/tree.js";
import { LIST_SRC, OBJ, partCard } from "../kit/lit.js";
import { truth } from "../timing.js";
import { clamp, ease, lerp, mix, prog, window } from "../util.js";
import { bracket, cacheGlyph, drawHtml, htmlPieces, instanceGlyph, partsGlyph, phasePill, runs, stringsGlyph } from "./recap-glyphs.js";

export const transition = "fade";

const GOLD = "#ffd166"; // the mystery comments' rings, as in open

// ------------------------------------------------------------ the stack

const ST = { x: 110, w: 1700, y0: 196, h: 178, gap: 22 };
const bandY = (i) => ST.y0 + i * (ST.h + ST.gap);
const PILL = { w: 232, h: 56 };
const PHASES = ["prepare", "create", "update"];
// phase k's pill sits at the right end of band k + 1
const pillSlot = (k) => ({ x: ST.x + ST.w - 48 - PILL.w, y: bandY(k + 1) + ST.h / 2 - PILL.h / 2, w: PILL.w, h: PILL.h });
const pillTrip = (k) => {
  const w = 300, h = 72, gap = 84;
  const x0 = 960 - (3 * w + 2 * gap) / 2;
  return { x: x0 + k * (w + gap), y: 540 - h / 2, w, h };
};

function layerSpecs() {
  const code = mono(35, 550), words = sans(38, 600);
  const to = { text: "  →  ", font: sans(38, 400), color: C.text3 };
  const strings = { w: 62, glyph: (ctx, x, y) => stringsGlyph(ctx, x, y, 1.25, C.text) };
  return [
    {
      color: "#c8d1ea",
      icon: (ctx, x, y) => stringsGlyph(ctx, x, y, 2.3, C.text),
      line1: [{ text: "html", font: code, color: SYN.fn }, { text: "`…`", font: code, color: SYN.punct }, to, strings, { text: " strings array", font: words }],
      line2: "made by JavaScript, one per template literal",
    },
    {
      color: OBJ.cache,
      icon: (ctx, x, y) => cacheGlyph(ctx, x, y, 1.15),
      line1: [{ text: "templateCache", font: code, color: OBJ.cache }, { text: ":  ", font: code, color: C.text3 }, strings, { text: " strings array", font: words }, to, { text: "Template", font: code, color: OBJ.template }],
      line2: "each template scanned and parsed once",
    },
    {
      color: OBJ.instance,
      icon: (ctx, x, y) => instanceGlyph(ctx, x, y, 1.15),
      line1: [{ text: "ChildPart", font: code, color: OBJ.root }, to, { text: "TemplateInstance", font: code, color: OBJ.instance }],
      line2: "DOM cloned only when the template in that spot changes",
    },
    {
      color: "#d4daee",
      stripe: B, // the three parts' colours
      icon: (ctx, x, y) => partsGlyph(ctx, x, y, 1.15),
      line1: [{ text: "Part", font: code, color: C.text }, to, { text: "last value", font: words }],
      line2: "unchanged strings and numbers never touch the DOM",
    },
  ];
}

function drawBand(ctx, i, L, { u, lit, u2, extra }) {
  if (u <= 0) return;
  const e = ease.outCubic(u);
  const x = ST.x, y = bandY(i) - 30 * (1 - e), w = ST.w, h = ST.h;
  withAlpha(ctx, clamp(u * 1.8), () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    fillRR(ctx, x, y, w, h, 18, C.panel);
    ctx.restore();
    // the band's colour: a wash, a stripe at the left, the border
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.clip();
    const g = ctx.createLinearGradient(x, 0, x + w * 0.6, 0);
    g.addColorStop(0, rgba(L.color, 0.10 + 0.06 * lit));
    g.addColorStop(1, rgba(L.color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    const stripe = L.stripe ?? [L.color];
    stripe.forEach((c, k) => {
      ctx.fillStyle = c;
      ctx.fillRect(x, y + (k * h) / stripe.length, 8, h / stripe.length);
    });
    ctx.restore();
    let border = rgba(L.color, 0.85);
    if (L.stripe) {
      border = ctx.createLinearGradient(x, 0, x + w, 0);
      L.stripe.forEach((c, k) => border.addColorStop(k / (L.stripe.length - 1), c));
    }
    if (lit > 0) withAlpha(ctx, lit, () => withGlow(ctx, rgba(L.color, 0.45), 24, () => strokeRR(ctx, x, y, w, h, 18, border, 2)));
    withAlpha(ctx, 0.35, () => strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 18, border, 1.5));
    // icon tile
    const T = 138, tx = x + 36, ty = y + (h - T) / 2;
    fillRR(ctx, tx, ty, T, T, 18, rgba(L.color, 0.07));
    strokeRR(ctx, tx + 0.5, ty + 0.5, T - 1, T - 1, 18, rgba(L.color, 0.3), 1.5);
    const k = 0.94 + 0.06 * ease.outBack(clamp(u * 1.4));
    withScale(ctx, k, tx + T / 2, ty + T / 2, () => L.icon(ctx, tx + T / 2, ty + T / 2));
    // the two lines
    const bright = 0.55 + 0.45 * lit;
    const lx = x + 214;
    withAlpha(ctx, bright, () => runs(ctx, L.line1, lx, y + 64));
    if (u2 > 0) {
      withAlpha(ctx, u2 * bright, () =>
        text(ctx, L.line2, lx + 14 * (1 - u2), y + 126, { font: sans(31, 500), color: C.text2, baseline: "middle" }));
    }
    if (extra) extra(x, y, w, h, bright);
  });
}

// "the same array": counter(0)'s strings === counter(1)'s strings, checked
function sameArray(ctx, x, y, w, h, u) {
  if (u <= 0) return;
  const cx = x + w - 48 - PILL.w / 2 - 50, cy = y + h / 2 - 14;
  withAlpha(ctx, u, () => {
    for (const [dx, n] of [[-96, 0], [96, 1]]) {
      stringsGlyph(ctx, cx + dx, cy, 1.45, C.text);
      text(ctx, `counter(${n})`, cx + dx, cy + 44, { font: mono(21, 500), color: C.text3, align: "center", baseline: "middle" });
    }
    text(ctx, "===", cx, cy + 1, { font: mono(32, 600), color: C.text2, align: "center", baseline: "middle" });
    check(ctx, cx + 176, cy, 34, C.ok, clamp(u * 1.5 - 0.5));
  });
}

function drawStack(ctx, t, S, out) {
  const L = layerSpecs();
  const lm = ["l1", "l2", "l3", "l4"].map((m) => S.m(m));
  // the payoff half of each sentence: "one strings array", then each "so"
  const pay = [S.word(1, "one"), S.word(1, "so", 0), S.word(1, "so", 1), S.word(1, "so", 2)];
  const allLit = prog(t, S.word(1, "never") + 0.2, 0.7);

  withAlpha(ctx, 1 - out, () => {
    ctx.save();
    ctx.translate(0, -30 * ease.inCubic(out));

    // title
    const ti = prog(t, S.m("stack") - 0.2, 0.6, ease.outCubic);
    withAlpha(ctx, ti, () => text(ctx, "Four layers of caching", ST.x, 140 + 16 * (1 - ti), { font: sans(56, 700), color: C.text }));

    // empty slots for the four layers
    for (let i = 0; i < 4; i++) {
      const su = prog(t, S.m("stack") + 0.1 + i * 0.1, 0.4) * (1 - prog(t, lm[i] - 0.15, 0.4));
      if (su <= 0) continue;
      withAlpha(ctx, 0.6 * su, () => {
        ctx.save();
        ctx.setLineDash([10, 10]);
        strokeRR(ctx, ST.x + 0.5, bandY(i) + 0.5, ST.w - 1, ST.h - 1, 18, C.border2, 1.5);
        ctx.restore();
      });
    }

    // the layers
    L.forEach((spec, i) => {
      const u = prog(t, lm[i] - 0.15, 0.55, ease.linear);
      const next = lm[i + 1] ?? Infinity;
      const lit = Math.max(allLit, window(t, lm[i] - 0.15, next - 0.2, 0.4, 0.5));
      const u2 = prog(t, pay[i] - 0.15, 0.45, ease.outCubic);
      drawBand(ctx, i, spec, {
        u, lit, u2,
        extra: i === 0 ? (x, y, w, h) => sameArray(ctx, x, y, w, h, prog(t, pay[0] - 0.1, 0.5, ease.outCubic)) : null,
      });
    });

    // the three phase pills: the whole trip, then each into its layer
    const trip = S.m("trip");
    PHASES.forEach((ph, k) => {
      const appear = prog(t, trip - 0.5 + k * 0.12, 0.45, ease.outBack); // in as the crossfade ends
      if (appear <= 0) return;
      // the lowest slot's pill leaves first, so their paths never cross
      const fly = prog(t, S.m("stack") - 0.05 + (2 - k) * 0.14, 0.85, ease.inOutCubic);
      const r = mix(pillTrip(k), pillSlot(k), fly);
      const landed = prog(t, lm[k + 1] - 0.15, 0.4); // its layer arrives
      const glow = Math.max(0, Math.sin(Math.PI * clamp((t - (trip + 0.35 + k * 0.4)) / 0.8))) * (1 - fly);
      const dim = lerp(1, 0.4, fly) + 0.6 * landed * fly;
      withScale(ctx, lerp(0.7, 1, appear), r.x + r.w / 2, r.y + r.h / 2, () =>
        phasePill(ctx, { ...r, label: ph, glow, alpha: clamp(appear) * dim, state: "active" }));
      // the arrows between them on the trip
      if (k < 2) {
        const a = pillTrip(k);
        const leave = prog(t, S.m("stack") - 0.05, 0.3); // as soon as the first pill leaves
        text(ctx, "→", a.x + a.w + 42, a.y + a.h / 2, { font: sans(38, 400), color: C.text3, align: "center", baseline: "middle", alpha: clamp(appear) * (1 - leave) });
      }
    });
    ctx.restore();
  });
}

// ----------------------------------------------------- the two comments

let PAGE = null;
function page() {
  if (PAGE) return PAGE;
  const tree = new Tree(truth().counter.render1.body, { size: 34, indent: 3, whitespace: "hide", inline: true });
  const empty = tree.rows.find((r) => r.kind === "comment" && r.node.data === "");
  const lit = tree.rows.find((r) => r.kind === "comment" && r.node.data.startsWith("?lit$"));
  const one = tree.rows[lit.index + 1];
  const button = tree.rows.find((r) => r.node.name === "button");
  PAGE = { tree, empty, lit, one, button };
  return PAGE;
}

// The list example's page, as HTML lines (truth list.render0.bodyHtml): the
// root part's comment, the <ul> and its marker, one line per item.
let LIST = null;
function listLines() {
  if (LIST) return LIST;
  const html = truth().list.render0.bodyHtml;
  const ul = html.indexOf("<ul>"), end = html.indexOf("</ul>");
  const inner = html.slice(ul + 4, end);
  const first = /^<!--\?lit\$\d+\$-->/.exec(inner)[0];
  const items = inner.slice(first.length).match(/<!----><li>.*?<\/li><!---->/g);
  LIST = [html.slice(0, ul).trim(), "<ul>" + first, ...items.map((s) => "  " + s), "</ul>"];
  return LIST;
}

// The prepared template's HTML, as lines (truth: the "template prep" event).
let TPL = null;
function templateLines() {
  if (TPL) return TPL;
  const ev = truth().counter.render0.events.find((e) => e.kind === "template prep");
  TPL = ev.templateHtml.split("\n").filter((l) => l.trim()).map((l) => l.replace(/^ {2}/, ""));
  return TPL;
}

// The page's devtools: its home (top right, once the sources come in), and
// its first position (larger, centred), as a transform of the home layout.
const DT = { x: 800, y: 96, w: 1060, h: 540 };
const HOME = { x: DT.x + DT.w / 2, y: DT.y + DT.h / 2 };
const CARD = { x: 70 };
const LISTP = { x: 800, y: 676, w: 1060, h: 330 };
const TPLC = { x: 70, y: 580, w: 650 };

function panelBox(ctx, { x, y, w, h, title, titleFont, titleColor, sub = null, color = null, fill = C.panel, head = 48 }) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  fillRR(ctx, x, y, w, h, 14, fill);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.clip();
  ctx.fillStyle = color ? rgba(color, 0.14) : "#23283a";
  ctx.fillRect(x, y, w, head);
  ctx.restore();
  text(ctx, title, x + 20, y + head / 2 + 1, { font: titleFont, color: titleColor, baseline: "middle" });
  if (sub) text(ctx, sub, x + w - 18, y + head / 2 + 1, { font: sans(19, 500), color: C.text3, baseline: "middle", align: "right" });
  strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 14, color ? rgba(color, 0.5) : "#353c55", 1.5);
}

function drawAnswer(ctx, t, S) {
  const A = S.m("answer");
  const dv = prog(t, A - 0.3, 0.9);
  if (dv <= 0) return;
  const P = page();
  const tree = P.tree;
  const w = (name, nth = 0) => S.word(2, name, nth);
  const tRoot = w("root"), tList = w("list"), tTpl = w("template's") - 0.25;

  // focus: the empty comment from {empty}, the lit one from {lit}
  const fE = window(t, S.m("empty") - 0.1, S.m("lit") - 0.1, 0.4, 0.5);
  const fL = prog(t, S.m("lit") - 0.1, 0.4);
  const both = 1 - prog(t, S.m("empty") - 0.1, 0.4); // before the answers start
  const ringsIn = prog(t, w("those") - 0.1, 0.4);
  const ringE = ringsIn * Math.max(both, fE, 0.45);
  const ringL = ringsIn * Math.max(both, fL, 0.4);

  // the devtools: in from the right, large and centred; then home, top
  // right, when the sources come in ("for the root part")
  const home = prog(t, tRoot - 1.0, 0.9);
  const k = lerp(1.22, 1, home);
  const c = mix({ x: 960 + 1100 * (1 - dv), y: 540 }, HOME, home);
  const toScreen = (p) => ({ x: c.x + k * (p.x - HOME.x), y: c.y + k * (p.y - HOME.y) });

  let dt, rE, rL, rOne, rBtn;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(k, k);
  ctx.translate(-HOME.x, -HOME.y);
  dt = devtools(ctx, {
    ...DT, tree, alpha: clamp(dv * 1.5),
    select: t >= S.m("lit") ? P.lit : t >= S.m("empty") ? P.empty : null,
    selectU: t >= S.m("lit") ? fL : fE,
    style: (seg, row) => {
      if (row === P.empty && seg.role === "comment") return { color: fE > 0.5 ? "#ffffff" : undefined };
      if (row === P.lit && seg.role === "comment") return { color: fL > 0.5 ? "#ffffff" : undefined };
      return {};
    },
  });
  rE = tree.rowRect(ctx, dt.treeX, dt.treeY, P.empty);
  rL = tree.rowRect(ctx, dt.treeX, dt.treeY, P.lit);
  rOne = tree.rowRect(ctx, dt.treeX, dt.treeY, P.one);
  rBtn = tree.rowRect(ctx, dt.treeX, dt.treeY, P.button);

  // gold rings, "?" (as in open), then the answers in their place
  const q = prog(t, w("comments") - 0.05, 0.5, ease.outBack);
  const labelX = rL.x + rL.w + 36; // both answers start here, one above the other
  [[rE, ringE, S.m("empty"), "made by lit-html as it renders", fE, 0],
   [rL, ringL, S.m("lit"), "the template's marker, copied", fL, 1]].forEach(([r, u, at, label, focus, n]) => {
    if (u <= 0) return;
    const breathe = 0.8 + 0.2 * Math.sin((t - A) * 4 + n * 1.7);
    ring(ctx, { ...r, r: 8, color: GOLD, u: u * breathe, pad: 8 });
    const ans = prog(t, at - 0.1, 0.45, ease.outCubic);
    const qa = q * (1 - ans) * (n === 0 ? 1 : Math.max(both, 0.35)); // the second stays open, dimly
    withAlpha(ctx, qa, () => withGlow(ctx, "rgba(255,209,102,0.8)", 16, () =>
      text(ctx, "?", r.x + r.w + 34, r.y + r.h / 2 + 2, { font: sans(46, 800), color: GOLD, baseline: "middle" })));
    const lx = n === 0 ? r.x + r.w + 34 : labelX;
    withAlpha(ctx, ans * Math.max(focus, 0.5), () =>
      text(ctx, label, lx + 12 * (1 - ans), r.y + r.h / 2 + 1, { font: sans(29, 600), color: GOLD, baseline: "middle" }));
  });

  // the root part's span (from its comment to the end of the body)
  const dimRoot = lerp(1, 0.45, fL);
  withAlpha(ctx, dimRoot, () =>
    bracket(ctx, dt.treeX + 14, rE.y + 2, rBtn.y + rBtn.h - 2, { color: OBJ.root, u: prog(t, tRoot + 0.2, 0.7), tick: 14 }));
  // "each one marks where a child part starts": its span, in teal
  const su = prog(t, S.m("starts") - 0.15, 0.6);
  if (su > 0) {
    bracket(ctx, dt.treeX + 76, rL.y + 2, rOne.y + rOne.h - 2, { color: B[1], u: su, tick: 14 });
    withAlpha(ctx, prog(t, S.m("starts") + 0.1, 0.45, ease.outCubic), () =>
      text(ctx, "where a child part starts", labelX, rOne.y + rOne.h / 2 + 4, { font: sans(29, 600), color: B[1], baseline: "middle" }));
  }
  ctx.restore();

  const sE = toScreen({ x: rE.x - 14, y: rE.y + rE.h / 2 });
  const sL = toScreen({ x: rL.x - 14, y: rL.y + rL.h / 2 });

  // "for the root part": render()'s ChildPart, whose startNode is the comment
  const cu = prog(t, tRoot - 0.35, 0.45, ease.outBack);
  if (cu > 0) {
    withAlpha(ctx, clamp(cu) * dimRoot, () => {
      text(ctx, "the root part, made by render()", CARD.x, 126, { font: sans(26, 600), color: C.text2 });
      let card;
      withScale(ctx, lerp(0.85, 1, cu), CARD.x, 210, () => {
        card = partCard(ctx, { x: CARD.x, y: 148, kind: "ChildPart", node: "<!---->", committed: "TemplateInstance", color: OBJ.root, size: 27 });
      });
      const from = card.ports.startNode; // (the card is at full size by the time the arrow starts)
      arrow(ctx, { x: from.x + 12, y: from.y }, sE, { color: OBJ.root, progress: prog(t, tRoot, 0.6), bend: -16, width: 2.5 });
    });
  }

  // "and for list items": the list example's page, its empty comments ringed
  const lu = prog(t, tList - 0.35, 0.6, ease.outCubic);
  if (lu > 0) {
    const lines = listLines();
    const { x: px, w: pw, h: ph } = LISTP;
    const py = LISTP.y + 30 * (1 - lu);
    // from {lit}, its empty comments recede and its lit markers (the <ul>'s,
    // and each <li>'s, copied from their templates) are ringed instead
    const litRings = S.m("lit") + 0.5;
    withAlpha(ctx, lu * lerp(1, 0.8, fL), () => {
      panelBox(ctx, { x: px, y: py, w: pw, h: ph, fill: "#1b1f2b", title: LIST_SRC.split("\n").find((l) => l.startsWith("render(")).replace(/;$/, ""), titleFont: mono(21, 500), titleColor: C.text2 });
      let n = 0, m = 0;
      lines.forEach((line, i) => {
        const cy = py + 48 + 32 + i * 41;
        const ext = drawHtml(ctx, htmlPieces(line), px + 30, cy, { size: 25 });
        for (const e of ext) {
          let u = 0;
          if (e.piece.comment === "") u = prog(t, tList + 0.05 + n++ * 0.07, 0.35) * lerp(0.9, 0.3, fL);
          else if (e.piece.comment?.startsWith("?lit$")) u = prog(t, litRings + m++ * 0.08, 0.35) * 0.85;
          if (u > 0) ring(ctx, { x: e.x + 1, y: cy - 16, w: e.w - 2, h: 32, r: 5, color: GOLD, u, pad: 2, width: 2 });
        }
        if (i === 3) withAlpha(ctx, prog(t, tList + 0.4, 0.4) * lerp(1, 0.45, fL), () =>
          text(ctx, "a pair per item", ext.at(-1).x + ext.at(-1).w + 36, cy, { font: sans(26, 600), color: GOLD, baseline: "middle" }));
      });
    });
  }

  // "the template's markers, copied": the prepared <template>, cloned in
  const tu = prog(t, tTpl, 0.5, ease.outBack);
  if (tu > 0) {
    const lines = templateLines();
    const { x: bx, y: by, w: bw } = TPLC;
    const bh = 48 + lines.length * 44 + 28;
    let mark = null;
    withAlpha(ctx, clamp(tu), () => withScale(ctx, lerp(0.9, 1, tu), bx + bw / 2, by + bh / 2, () => {
      panelBox(ctx, { x: bx, y: by, w: bw, h: bh, color: OBJ.dom, title: "<template>", titleFont: mono(24, 600), titleColor: OBJ.dom, sub: "prepared, cached" });
      lines.forEach((line, i) => {
        const cy = by + 48 + 34 + i * 44;
        const ext = drawHtml(ctx, htmlPieces(line), bx + 26 + (i === 2 ? 30 : 0), cy, { size: 26 });
        const cm = ext.find((e) => e.piece.comment?.startsWith("?lit$"));
        if (cm) mark = { x: cm.x, y: cy - 17, w: cm.w, h: 34 };
      });
      if (mark) ring(ctx, { x: mark.x + 1, y: mark.y, w: mark.w - 2, h: mark.h, r: 5, color: GOLD, u: prog(t, tTpl + 0.3, 0.4) * 0.9, pad: 2, width: 2.5 });
    }));
    // the copy: importNode, into the page
    const cp = prog(t, w("copied") - 0.2, 0.7);
    if (mark && cp > 0) {
      const a = { x: mark.x + mark.w * 0.75, y: mark.y - 10 };
      arrow(ctx, a, sL, { color: GOLD, progress: cp, bend: -60, width: 3, glow: 0.5 });
      withAlpha(ctx, prog(t, w("copied") + 0.25, 0.4), () =>
        text(ctx, "importNode", lerp(a.x, sL.x, 0.5) - 110, lerp(a.y, sL.y, 0.5) - 30, { font: mono(24, 500), color: C.text2, baseline: "middle", align: "center" }));
    }
  }
}

export function draw(F, S) {
  const { ctx, t } = F;
  const out = prog(t, S.m("answer") - 0.4, 0.55);
  if (out < 1) drawStack(ctx, t, S, out);
  drawAnswer(ctx, t, S);
}
