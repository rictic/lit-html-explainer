// parse → walk → cache: the prepare phase's second half, drawn as one
// continuous composition over three scenes (walk and cache start with a
// cut). Everything here is a pure function of absolute time, scheduled from
// the three scenes' marks, so the frame on either side of a cut is the same.
//
// The cast:
//  - the annotated HTML (truth counter.prepare.html), as a string;
//  - the <template> element ("the box"): its content tree (truth
//    counter.prepare.parsed) drawn with the kit's Tree, whitespace shown;
//  - the walker (a cursor in the box's left gutter, counting nodes);
//  - the parts list (templatePartCard per part, truth template prep parts);
//  - the Template card and the template cache.

import { scene, truth } from "../timing.js";
import { B, C, DOMC, rgba, blend } from "../kit/theme.js";
import {
  along, arrow, check, chip, cross, fillRR, measure, mono, monoAdvance, panel, ring, sans, setFont, strokeRR,
  text, withAlpha, withGlow, withScale,
} from "../kit/draw.js";
import { Tree } from "../kit/tree.js";
import { Code } from "../kit/code.js";
import { OBJ, cacheTable, marker, templatePartCard, templateParts } from "../kit/lit.js";
import { clamp, ease, lerp, mix, prog, pulse, window } from "../util.js";

// ------------------------------------------------------------------ marks

let MK = null;
const marks = () => (MK ??= { p: scene("parse"), w: scene("walk"), c: scene("cache") });

// ----------------------------------------------------------------- layout

const TS = 38;                  // tree text size in the box at scale 1
const LH = TS * 1.6;            // the Tree's row height
const BOXW = 1052, HEAD = 66, GUT = 104, PADT = 14, PADB = 22;
const X0 = GUT + 16;            // "#document-fragment" (box-local)
const FRAG_Y = HEAD + PADT;     // top of the "#document-fragment" row
const TREE_Y = FRAG_Y + LH;     // top of the tree's first row
const BADGE_X = 54;             // the walker's badge, in the gutter

// The box sits here from the moment it's created until it's packed into
// the Template.
const BOX = { x: 104, y: 120, k: 1 };
const RIGHT = 1204;             // the right column (code, icons, parts)
const bandY = () => BOX.y + boxH() + 22;   // the band under the box (string, caption, walker, legend)

// the parts list (walk)
const PANEL = { x: RIGHT, y: 120, w: 612, head: 50, pad: 18, gap: 18 };
const CARD = { size: 28, w: 564 };

// the Template card (cache): made centre stage, then moved left as it's cached
const TPL = { mid: 586, k: 0.68, lab: 128, pad: 26, head: 58, rowH: 48, left: 64 };
// the template cache (the kit's table, drawn 1.15x)
const CACHE = { right: 1856, y: 250, w: 620, k: 1.15 };

let TREE = null;
const tree = () => (TREE ??= new Tree(truth().counter.prepare.parsed, { size: TS, lineHeight: 1.6, whitespace: "show", inline: false }));
const boxH = () => HEAD + PADT + LH * (1 + tree().rows.length) + PADB;
const rowTop = (row) => TREE_Y + row.index * LH;
const rowMid = (row) => rowTop(row) + LH / 2;

// The nodes lit-html's walker visits, from truth: [{index, path, type, row}].
let STOPS = null;
function stops() {
  if (STOPS) return STOPS;
  const tr = tree();
  STOPS = truth().counter.prepare.walk.map((s) => ({ ...s, row: tr.rowOf(s.path, s.type === "#comment" ? null : "open") }));
  return STOPS;
}

// The template's parts, from truth (the "template prep" event). In this
// template, part k is found at node k and belongs to binding k.
const parts = () => templateParts();

// --------------------------------------------------------- the HTML string

// The annotated HTML as display lines of coloured pieces. The leading
// newline is not drawn (an empty first line); markers take their binding's
// colour, in order.
let HTML = null;
function htmlLines() {
  if (HTML) return HTML;
  const m = marker();
  const lines = truth().counter.prepare.html.split("\n");
  if (lines[0] === "") lines.shift();
  let k = 0;
  HTML = lines.map((line) => {
    const out = [];
    let i = 0, inTag = false;
    const push = (text, color, bind = null) => out.push({ text, color, bind });
    while (i < line.length) {
      const pi = `<?${m}>`;
      if (line.startsWith(pi, i)) { push(pi, B[k], k); k++; i += pi.length; continue; }
      if (line.startsWith(m, i)) { push(m, B[k], k); k++; i += m.length; continue; }
      const c = line[i];
      if (!inTag) {
        if (c === "<") {
          const t = /^<(\/?)([a-zA-Z][\w-]*)/.exec(line.slice(i));
          push("<" + t[1], DOMC.punct);
          push(t[2], DOMC.tag);
          i += t[0].length;
          inTag = true;
          continue;
        }
        let j = i;
        while (j < line.length && line[j] !== "<") j++;
        push(line.slice(i, j), DOMC.text);
        i = j;
        continue;
      }
      if (c === ">") { push(">", DOMC.punct); inTag = false; i++; continue; }
      if (c === " " || c === "=" || c === '"') { push(c, DOMC.punct); i++; continue; }
      let j = i;
      while (j < line.length && !/[\s=>"]/.test(line[j])) j++;
      push(line.slice(i, j), DOMC.attr);
      i = j;
    }
    return out;
  });
  return HTML;
}
const htmlCols = () => Math.max(...htmlLines().map((l) => l.reduce((n, p) => n + p.text.length, 0)));

// Draws the lines with their top-left at (x, y). glow(k): 0..1 per binding.
function drawHtml(ctx, x, y, size, { alpha = 1, lineAlpha = () => 1, glow = () => 0 } = {}) {
  if (alpha <= 0.001) return;
  const adv = monoAdvance(ctx, size, 480);
  const lh = size * 1.5;
  ctx.save();
  setFont(ctx, mono(size, 480));
  ctx.textBaseline = "middle";
  const base = ctx.globalAlpha;
  htmlLines().forEach((pcs, i) => {
    const la = alpha * lineAlpha(i);
    if (la <= 0.001) return;
    let col = 0;
    const cy = y + i * lh + lh / 2 + 1;
    for (const pc of pcs) {
      ctx.globalAlpha = base * la;
      const g = pc.bind !== null ? glow(pc.bind) : 0;
      if (g > 0) {
        ctx.save();
        ctx.fillStyle = rgba(pc.color, 0.22 * g);
        ctx.beginPath();
        ctx.roundRect(x + col * adv - 4, cy - size * 0.72, pc.text.length * adv + 8, size * 1.44, 6);
        ctx.fill();
        ctx.shadowColor = rgba(pc.color, 0.9);
        ctx.shadowBlur = 14 * g;
        ctx.fillStyle = pc.color;
        ctx.fillText(pc.text, x + col * adv, cy);
        ctx.restore();
      } else {
        ctx.fillStyle = pc.color;
        ctx.fillText(pc.text, x + col * adv, cy);
      }
      col += pc.text.length;
    }
  });
  ctx.restore();
}

// ------------------------------------------------------------ small pieces

// An object frame drawn like kit/objects.js card(), for cards whose body
// isn't key/value rows.
function objectFrame(ctx, { x, y, w, h, title, color, alpha = 1, glow = 0, size = 28, sub = null }) {
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, x, y, w, h, 16, C.panel);
    ctx.restore();
    if (glow > 0) withGlow(ctx, rgba(color, 0.8 * glow), 30 * glow, () => strokeRR(ctx, x, y, w, h, 16, rgba(color, glow), 2.5));
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.clip();
    ctx.fillStyle = rgba(color, 0.16);
    ctx.fillRect(x, y, w, TPL.head);
    ctx.fillStyle = rgba(color, 0.5);
    ctx.fillRect(x, y + TPL.head - 1.5, w, 1.5);
    ctx.restore();
    text(ctx, title, x + 20, y + TPL.head / 2 + 1, { font: sans(size * 0.95, 650), color, baseline: "middle" });
    if (sub) text(ctx, sub, x + w - 18, y + TPL.head / 2 + 1, { font: sans(20, 500), color: C.text3, baseline: "middle", align: "right" });
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 16, rgba(color, 0.55), 1.5);
  });
}

// "<template>" in DOM colours; returns the width.
function tagText(ctx, name, x, y, size, alpha = 1) {
  let w = 0;
  const f = mono(size, 500);
  w += text(ctx, "<", x + w, y, { font: f, color: DOMC.punct, baseline: "middle", alpha });
  w += text(ctx, name, x + w, y, { font: f, color: DOMC.tag, baseline: "middle", alpha });
  w += text(ctx, ">", x + w, y, { font: f, color: DOMC.punct, baseline: "middle", alpha });
  return w;
}

// Icons for what doesn't happen in inert content.
function inertIcon(ctx, kind, x, y, s, u, crossU) {
  if (u <= 0) return;
  withScale(ctx, lerp(0.6, 1, u), x + s / 2, y + s / 2, () => withAlpha(ctx, clamp(u), () => {
    fillRR(ctx, x, y, s, s, 16, C.panel2);
    strokeRR(ctx, x + 0.5, y + 0.5, s - 1, s - 1, 16, C.border2, 1.5);
    ctx.save();
    ctx.strokeStyle = C.text2;
    ctx.fillStyle = C.text2;
    ctx.lineWidth = 3;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const cx = x + s / 2, cy = y + s / 2;
    if (kind === "script") {
      // a script tag, and "run"
      setFont(ctx, mono(s * 0.25, 600));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("</>", cx, cy - s * 0.17);
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.1, cy + s * 0.07);
      ctx.lineTo(cx + s * 0.14, cy + s * 0.2);
      ctx.lineTo(cx - s * 0.1, cy + s * 0.33);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "image") {
      const fx = x + s * 0.2, fy = y + s * 0.24, fw = s * 0.6, fh = s * 0.52;
      ctx.strokeRect(fx, fy, fw, fh);
      ctx.beginPath();
      ctx.moveTo(fx + 3, fy + fh - 3);
      ctx.lineTo(fx + fw * 0.38, fy + fh * 0.42);
      ctx.lineTo(fx + fw * 0.6, fy + fh * 0.68);
      ctx.lineTo(fx + fw * 0.74, fy + fh * 0.52);
      ctx.lineTo(fx + fw - 3, fy + fh - 3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(fx + fw * 0.74, fy + fh * 0.26, s * 0.055, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // a custom element tag, and "upgrade" (an arrow up)
      setFont(ctx, mono(s * 0.2, 600));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("<x-a>", cx, cy + s * 0.22);
      ctx.beginPath();
      ctx.moveTo(cx, cy + s * 0.02);
      ctx.lineTo(cx, cy - s * 0.3);
      ctx.moveTo(cx - s * 0.11, cy - s * 0.19);
      ctx.lineTo(cx, cy - s * 0.3);
      ctx.lineTo(cx + s * 0.11, cy - s * 0.19);
      ctx.stroke();
    }
    ctx.restore();
    // the cross badge
    if (crossU > 0) {
      const bx = x + s - 4, by = y + 4;
      withAlpha(ctx, clamp(crossU * 3), () => {
        fillRR(ctx, bx - 18, by - 18, 36, 36, 18, C.bg);
        strokeRR(ctx, bx - 18, by - 18, 36, 36, 18, rgba(C.bad, 0.9), 2.5);
      });
      cross(ctx, bx, by, 24, C.bad, crossU);
    }
  }));
}

// A highlight over a card row (kit cards don't take per-row highlights).
function rowHighlight(ctx, r, color, u) {
  if (u <= 0.001) return;
  withAlpha(ctx, u, () => {
    fillRR(ctx, r.x - 2, r.y + 2, r.w + 4, r.h - 4, 8, rgba(color, 0.14));
    withGlow(ctx, rgba(color, 0.7), 10, () => strokeRR(ctx, r.x - 2, r.y + 2, r.w + 4, r.h - 4, 8, rgba(color, 0.9), 2));
  });
}

// ------------------------------------------------------------ the timeline

// All the times the composition uses, from the three scenes' marks.
let TT = null;
function times() {
  if (TT) return TT;
  const { p, w, c } = marks();
  TT = {
    // parse
    frame: p.word(0, "join") - 0.2,
    markersGlow: p.word(0, "markers") - 0.1,
    toTop: p.m("template") - 0.3,
    box: p.word(0, "creates") - 0.3,
    code1: p.word(0, "creates"),
    code2: p.m("inner") - 0.1,
    fly: p.word(0, "inner") - 0.05,
    parsed: p.m("parsed") - 0.1,
    inert: p.m("inert") - 0.1,
    inertChip: p.word(1, "inert.") - 0.2,
    icons: [p.m("scripts"), p.m("images"), p.m("elements")],
    copied: p.m("copied") - 0.1,
    // walk
    walk: w.m("walk") - 0.1,
    enter: w.word(0, "walks") - 0.3,
    counting: w.word(0, "counting") - 0.1,
    skip: w.m("skip") - 0.1,
    elements: w.word(0, "elements") - 0.15,
    comments: w.word(0, "comments,") - 0.15,
    textWord: w.word(0, "text") - 0.1,
    whitespace: w.word(0, "whitespace,") - 0.2,
    n: [w.m("n0"), w.m("n1"), w.m("n2")],
    bound0: w.word(1, "bound") - 0.1,
    found: [w.m("found0"), w.m("found1"), w.word(3, "so") - 0.35],
    glow: [w.m("found0") - 0.1, w.m("found1") - 0.1, w.m("found2") - 0.1],
    at: w.word(3, "at") - 0.1,
    // each card's rows (0 type, 1 index, 2 name, 3 ctor), lit in turn as
    // the narration names them: [[time, rows], ...], until `end`
    rows: [
      { steps: [[w.word(1, "attribute", 1) - 0.15, [0, 3]], [w.word(1, "named") - 0.15, [2]], [w.word(1, "node", 1) - 0.15, [1]]], end: w.m("remove0") - 0.1 },
      { steps: [[w.word(2, "child") - 0.15, [0]], [w.word(2, "node", 1) - 0.15, [1]]], end: w.m("keep1") + 0.3 },
      { steps: [[w.word(3, "event") - 0.15, [3]], [w.word(3, "click.") - 0.25, [2]]], end: w.m("prefixes") + 0.3 },
    ],
    remove: [w.m("remove0"), null, w.word(3, "removed.") - 0.25],
    keep1: w.m("keep1") - 0.1,
    prefixes: w.m("prefixes") - 0.25,
    dot: w.word(3, "dot") - 0.15,
    question: w.word(3, "question") - 0.15,
    legendEnd: w.m("remove2") + 0.2,
    recorded: w.m("remove2") - 0.1,
    holes: w.word(4, "holes,") - 0.15,
    threeParts: w.word(4, "three", 1) - 0.1,
    stop: w.m("stop"),
    // cache
    tplEl: c.word(0, "template") - 0.1,
    tplParts: c.word(0, "list") - 0.1,
    merge: c.word(0, "together") - 0.15,
    tplTitle: c.word(0, "template", 1) - 0.35,
    stored: c.m("stored") - 0.15,
    entry: c.word(0, "cache,") - 0.35,
    key: c.word(0, "strings") - 0.1,
    once: c.m("once"),
    rule: c.word(0, "once") - 0.15,
    times: c.word(0, "times,") - 0.3,
    places: c.word(0, "places,") - 0.3,
  };
  return TT;
}

// ------------------------------------------------------------- the box

// Where the box is at t: {x, y, k}.
function boxAt(t) {
  const T = times();
  return mix(BOX, boxInTemplate(t), prog(t, T.merge, 1.0));
}

// The Template card: its size, and where it is at t.
const tplW = () => TPL.lab + BOXW * TPL.k + TPL.pad;
const tplH = () => TPL.head + 18 + boxH() * TPL.k + 22 + parts().length * TPL.rowH + 14;
function tplAt(t) {
  const T = times();
  const w = tplW();
  const h = tplH();
  return { x: lerp(960 - w / 2, TPL.left, prog(t, T.stored, 0.8)), y: TPL.mid - h / 2, w, h };
}
function boxInTemplate(t) {
  const p = tplAt(t);
  return { x: p.x + TPL.lab, y: p.y + TPL.head + 18, k: TPL.k };
}
const toGlobal = (b, x, y) => ({ x: b.x + x * b.k, y: b.y + y * b.k });

// Per-row geometry for a bound attribute: which segments strike, and where.
const ATTR = new Map();
function attrSpan(row, a = 0) {
  const key = `${row.index}:${a}`;
  if (ATTR.has(key)) return ATTR.get(key);
  const segs = row.segs.filter((s) => s.attr === a && s.text !== " ");
  const off = new Map();
  let n = 0;
  for (const s of segs) { off.set(s, n); n += s.text.length; }
  const first = row.segs.findIndex((s) => s.attr === a);
  const out = { off, total: n, name: segs[0], first };
  ATTR.set(key, out);
  return out;
}

// The state of binding k's attribute (k = 0 span, 2 button) at t.
function attrState(t, k) {
  const T = times();
  const i = k === 0 ? 0 : 2;
  const hot = prog(t, T.glow[i], 0.4);
  const r = T.remove[i];
  const strike = prog(t, r, 0.45, ease.inOutQuad);
  const fade = prog(t, r + 0.5, 0.3);
  const collapse = prog(t, r + 0.8, 0.5);
  return { hot, strike, fade, collapse };
}

// Text rows (whitespace and "Increment"): dimmed once the walk explains they're skipped.
function textDim(t) {
  const T = times();
  return prog(t, T.whitespace + 0.3, 0.6) * (1 - prog(t, T.merge, 0.8));
}

function drawBox(ctx, t) {
  const T = times();
  const tr = tree();
  const H = boxH();
  const appear = prog(t, T.box, 0.5, ease.outBack);
  if (appear <= 0) return null;
  const b = boxAt(t);
  const st = stops();
  const [sSpan, sComment, sButton] = st;
  const adv = tr.adv(ctx);
  const tx = X0 + 2 * adv;

  // parse: rows appear as a sweep passes; the string lines vanish under it
  const sweepU = prog(t, T.parsed, 1.1, ease.inOutSine);
  const sweepY = lerp(TREE_Y - 6, TREE_Y + tr.rows.length * LH + 6, sweepU);
  const rowIn = (row) => clamp((sweepY - rowTop(row)) / (LH * 0.9));

  // frost: inert content, from {inert} until the walk starts
  const frost = prog(t, T.inert, 0.8) * (1 - prog(t, T.walk, 0.6));

  // highlights (cache)
  const glowEl = window(t, T.tplEl, T.tplEl + 1.3, 0.3, 0.5);

  const dim = textDim(t);
  const kids = { span: sSpan.row, comment: sComment.row, button: sButton.row };

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(b.k, b.k);
  if (appear !== 1) {
    ctx.translate(BOXW / 2, H / 2);
    ctx.scale(appear, appear);
    ctx.translate(-BOXW / 2, -H / 2);
  }
  ctx.globalAlpha *= clamp(appear);

  // the panel
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 10;
  fillRR(ctx, 0, 0, BOXW, H, 16, C.panel);
  ctx.restore();
  if (glowEl > 0) withGlow(ctx, rgba(OBJ.dom, 0.8 * glowEl), 30 * glowEl, () => strokeRR(ctx, 0, 0, BOXW, H, 16, rgba(OBJ.dom, glowEl), 3));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(0, 0, BOXW, H, 16);
  ctx.clip();
  ctx.fillStyle = C.panel2;
  ctx.fillRect(0, 0, BOXW, HEAD);
  ctx.fillStyle = C.border;
  ctx.fillRect(0, HEAD - 1, BOXW, 1);
  ctx.restore();
  tagText(ctx, "template", 26, HEAD / 2 + 1, 32);
  // "inert"
  const ic = prog(t, T.inertChip, 0.4) * lerp(1, 0.6, prog(t, T.walk, 0.6));
  if (ic > 0) chip(ctx, { x: BOXW - 22, y: HEAD / 2 - 19, h: 38, align: "right", text: "inert", font: sans(23, 650), color: C.text2, bg: rgba(C.text2, 0.1), border: rgba(C.text2, 0.45), alpha: ic });
  strokeRR(ctx, 0.5, 0.5, BOXW - 1, H - 1, 16, rgba(OBJ.dom, 0.45), 1.5);

  // ----- walk: the cursor, stop marks, washes behind rows
  const cur = cursorAt(t);
  const bar = (row, color, u) => {
    if (u <= 0.001) return;
    withAlpha(ctx, u, () => fillRR(ctx, 12, rowTop(row) + 3, BOXW - 24, LH - 6, 8, color));
  };
  // the elements and comments the walker visits ({skip})
  const visit = [prog(t, T.elements, 0.4), prog(t, T.comments, 0.4), prog(t, T.elements + 0.12, 0.4)];
  const visitFlash = [pulse(t, T.elements, 1.3), pulse(t, T.comments, 1.3), pulse(t, T.elements + 0.12, 1.3)];
  st.forEach((s, i) => bar(s.row, rgba(C.accent, 0.16), visitFlash[i]));
  // text rows flash on "text nodes" and "whitespace"
  const textFlash = Math.max(pulse(t, T.textWord, 1.0), pulse(t, T.whitespace, 1.0));
  for (const row of tr.rows) if (row.kind === "text") bar(row, rgba(C.text2, 0.14), textFlash);
  // the cursor's bar
  if (cur.alpha > 0) {
    withAlpha(ctx, cur.alpha * cur.bar, () => {
      fillRR(ctx, 12, cur.y - LH / 2 + 3, BOXW - 24, LH - 6, 8, rgba(C.accent, 0.2));
      fillRR(ctx, 12, cur.y - LH / 2 + 3, 5, LH - 6, 2.5, C.accent);
    });
  }
  // binding washes behind the found attributes / comment
  const washAttr = (row, k, u) => {
    if (u <= 0.001) return;
    const sp = attrSpan(row);
    const j0 = row.segs.indexOf(sp.name), j1 = j0 + 4;
    const r = tr.rowRect(ctx, tx, TREE_Y, row, { from: j0, to: j1 });
    withAlpha(ctx, u, () => fillRR(ctx, r.x - 6, r.y - 3, r.w + 12, r.h + 6, 8, rgba(B[k], 0.2)));
  };
  const a0 = attrState(t, 0), a2 = attrState(t, 2);
  washAttr(kids.span, 0, a0.hot * (1 - a0.strike));
  washAttr(kids.button, 2, a2.hot * (1 - a2.strike));
  const c1 = prog(t, T.glow[1], 0.4);
  const keepU = 1 - prog(t, T.merge, 0.6);
  if (c1 > 0) {
    const r = tr.rowRect(ctx, tx, TREE_Y, kids.comment);
    withAlpha(ctx, c1 * keepU, () => fillRR(ctx, r.x - 6, r.y - 3, r.w + 12, r.h + 6, 8, rgba(B[1], 0.18)));
  }

  // ----- the tree
  const style = (seg, row) => {
    if (row === kids.span || row === kids.button) {
      if (seg.attr === 0) {
        const k = row === kids.span ? 0 : 2;
        const s = row === kids.span ? a0 : a2;
        const sp = attrSpan(row);
        const out = {};
        if (seg.role === "attrValue") out.color = B[k];
        else if (seg.text !== " ") out.color = blend(seg.role === "attrName" ? DOMC.attr : DOMC.punct, B[k], s.hot);
        if (seg.text !== " " && s.strike > 0) {
          out.strike = clamp((s.strike * sp.total - sp.off.get(seg)) / seg.text.length);
        }
        out.collapse = s.collapse;
        out.alpha = 1 - s.fade;
        return out;
      }
      return {};
    }
    if (row === kids.comment) return { color: B[1] };
    return {};
  };
  const rowStyle = (row) => {
    let a = rowIn(row);
    if (row.kind === "text") a *= lerp(1, 0.32, dim);
    return { alpha: a };
  };
  const drawTree = () => {
    // #document-fragment: the template's content
    text(ctx, "#document-fragment", X0, FRAG_Y + LH / 2 + 1, { font: mono(TS, 450), color: C.text3, baseline: "middle" });
    tr.draw(ctx, tx, TREE_Y, { style, rowStyle });
  };
  if (frost > 0.001) {
    ctx.save();
    ctx.filter = `saturate(${(1 - 0.9 * frost).toFixed(3)}) blur(${(1.1 * frost).toFixed(2)}px)`;
    ctx.globalAlpha *= lerp(1, 0.7, frost);
    drawTree();
    ctx.restore();
  } else drawTree();

  // the parse sweep line
  if (sweepU > 0 && sweepU < 1) {
    const sa = Math.sin(Math.PI * sweepU);
    withAlpha(ctx, sa, () => withGlow(ctx, rgba(C.accent, 0.9), 14, () => fillRR(ctx, 16, sweepY - 1.5, BOXW - 32, 3, 1.5, C.accent)));
  }

  // "skipped" on the text rows ({text}), until node 0
  const skipU = prog(t, T.textWord + 0.2, 0.4) * (1 - prog(t, T.n[0] - 0.4, 0.4));
  if (skipU > 0) {
    tr.rows.filter((r) => r.kind === "text").forEach((row, i) => {
      const r = tr.rowRect(ctx, tx, TREE_Y, row);
      const u = prog(t, T.textWord + 0.2 + i * 0.12, 0.4) * (1 - prog(t, T.n[0] - 0.4, 0.4));
      text(ctx, "not visited", r.x + r.w + 28, rowMid(row) + 1, { font: sans(25, 500, "italic"), color: C.text3, baseline: "middle", alpha: u });
    });
  }

  // rings: "$lit$" (bound attribute, node 0) and "@" (found2)
  const ringOn = (row, from, len, color, u) => {
    if (u <= 0.001) return;
    const sp = attrSpan(row);
    const j = row.segs.indexOf(sp.name);
    const c0 = tr.segCol(row, j) + from;
    const r = { x: tx + c0 * adv, y: rowTop(row) + (LH - TS * 1.3) / 2, w: len * adv, h: TS * 1.3 };
    ring(ctx, { ...r, r: 6, pad: 4, color, u });
  };
  const nm0 = attrSpan(kids.span).name.text, suffix = truth().boundAttributeSuffix;
  ringOn(kids.span, nm0.length - suffix.length, suffix.length, B[0], window(t, T.bound0, T.glow[0] + 0.2, 0.3, 0.3));
  ringOn(kids.button, 0, 1, B[2], window(t, T.at, T.found[2] + 0.4, 0.3, 0.4));
  // the found attribute / comment: a ring while the card is made
  const attrRing = (row, k, u) => {
    if (u <= 0.001) return;
    const sp = attrSpan(row);
    const j0 = row.segs.indexOf(sp.name);
    const r = tr.rowRect(ctx, tx, TREE_Y, row, { from: j0, to: j0 + 4 });
    ring(ctx, { ...r, r: 8, pad: 6, color: B[k], u });
  };
  attrRing(kids.span, 0, window(t, T.glow[0], T.remove[0] - 0.1, 0.35, 0.3));
  const cr = window(t, T.glow[1], T.keep1 + 1.6, 0.35, 0.5);
  if (cr > 0) ring(ctx, { ...tr.rowRect(ctx, tx, TREE_Y, kids.comment), r: 8, pad: 6, color: B[1], u: cr });
  // "stays"
  const stay = prog(t, T.keep1, 0.4, ease.outBack) * keepU;
  if (stay > 0) {
    const r = tr.rowRect(ctx, tx, TREE_Y, kids.comment);
    chip(ctx, { x: r.x + r.w + 30, y: rowMid(kids.comment) - 21, h: 42, text: "stays", font: sans(25, 650), color: B[1], bg: rgba(B[1], 0.12), border: rgba(B[1], 0.6), alpha: clamp(stay) });
  }

  // the gutter: stops, their numbers, the walker's badge
  const gutterFade = 1 - prog(t, T.merge - 0.3, 0.5);
  st.forEach((s, i) => {
    const u = visit[i] * gutterFade;
    if (u <= 0) return;
    const y = rowMid(s.row);
    const landed = cur.visited >= i;
    const color = landed ? B[i] : C.accent;
    withAlpha(ctx, u, () => {
      ctx.beginPath();
      ctx.arc(BADGE_X, y, 19, 0, Math.PI * 2);
      ctx.fillStyle = landed ? rgba(B[i], 0.16) : "rgba(0,0,0,0)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = rgba(color, landed ? 0.9 : 0.55);
      ctx.stroke();
      if (landed) text(ctx, String(s.index), BADGE_X, y + 1, { font: mono(24, 700), color: B[i], align: "center", baseline: "middle" });
    });
  });
  if (cur.alpha > 0) {
    withAlpha(ctx, cur.alpha, () => {
      const x = BADGE_X + cur.dx, y = cur.y;
      withGlow(ctx, rgba(C.accent, 0.8), 16, () => {
        ctx.beginPath();
        ctx.arc(x, y, 24, 0, Math.PI * 2);
        ctx.fillStyle = C.accent;
        ctx.fill();
      });
      // pointer
      ctx.beginPath();
      ctx.moveTo(x + 29, y - 9);
      ctx.lineTo(x + 41, y);
      ctx.lineTo(x + 29, y + 9);
      ctx.closePath();
      ctx.fillStyle = C.accent;
      ctx.fill();
      if (cur.label !== null) {
        const pop = 1 + 0.25 * pulse(t, cur.labelT, 0.35);
        withScale(ctx, pop, x, y, () => text(ctx, cur.label, x, y + 1, { font: mono(27, 750), color: C.bg, align: "center", baseline: "middle" }));
      }
    });
  }

  // frost over the content
  if (frost > 0.001) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(8, HEAD + 6, BOXW - 16, H - HEAD - 14, 10);
    ctx.clip();
    ctx.fillStyle = `rgba(200,215,255,${(0.07 * frost).toFixed(3)})`;
    ctx.fillRect(0, HEAD, BOXW, H - HEAD);
    ctx.strokeStyle = `rgba(220,230,255,${(0.05 * frost).toFixed(3)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let d = -H; d < BOXW; d += 16) {
      ctx.moveTo(d, H);
      ctx.lineTo(d + H, 0);
    }
    ctx.stroke();
    ctx.restore();
    withAlpha(ctx, frost, () => strokeRR(ctx, 8, HEAD + 6, BOXW - 16, H - HEAD - 14, 10, "rgba(220,230,255,0.22)", 1.5));
  }

  ctx.restore();
  return {
    b, H, adv, tx,
    // global rects of the three binding places, for part cards to emerge from
    source(i) {
      const row = st[i].row;
      let r;
      if (i === 1) r = tr.rowRect(ctx, tx, TREE_Y, row);
      else {
        const sp = attrSpan(row);
        const j0 = row.segs.indexOf(sp.name);
        r = tr.rowRect(ctx, tx, TREE_Y, row, { from: j0, to: j0 + 4 });
      }
      const p = toGlobal(b, r.x + r.w / 2, r.y + r.h / 2);
      return p;
    },
    badge() { return toGlobal(b, BADGE_X, cur.y); },
  };
}

// The walker at t: {alpha, y, dx, bar, label, labelT, visited, settle}.
function cursorAt(t) {
  const T = times();
  const st = stops();
  const enter = prog(t, T.enter, 0.5);
  const leave = prog(t, T.stop, 0.6);
  const out = { alpha: enter * (1 - leave), y: FRAG_Y + LH / 2, dx: -30 * (1 - enter), bar: 1, label: null, labelT: 0, visited: -1, settle: 0 };
  let prevY = out.y;
  st.forEach((s, i) => {
    const u = prog(t, T.n[i] - 0.3, 0.75);
    if (u <= 0) return;
    const y1 = rowMid(s.row);
    out.y = lerp(prevY, y1, u);
    // hop left of the rows it passes over
    out.dx = -16 * Math.sin(Math.PI * u);
    out.bar = 1 - 0.85 * Math.sin(Math.PI * u);
    if (u >= 0.55) { out.label = String(s.index); out.labelT = T.n[i] - 0.3 + 0.75 * 0.55; }
    out.visited = u >= 1 ? i : i - 1;
    out.settle = u;
    prevY = y1;
  });
  out.y += 26 * leave;
  return out;
}

// ------------------------------------------------------------ parts list

function cardRows(p) { return 2 + (p.name !== undefined ? 1 : 0) + (p.ctor ? 1 : 0); }
function cardH(p) { return 46 + cardRows(p) * CARD.size * 1.75 + 16; }
function panelH() {
  const ps = parts();
  return PANEL.head + PANEL.pad * 2 + ps.reduce((n, p) => n + cardH(p), 0) + PANEL.gap * (ps.length - 1);
}
function slot(i) {
  const ps = parts();
  let y = PANEL.y + PANEL.head + PANEL.pad;
  for (let j = 0; j < i; j++) y += cardH(ps[j]) + PANEL.gap;
  return { x: PANEL.x + (PANEL.w - CARD.w) / 2, y };
}

// Compact part records inside the Template card.
const mergeU = (t, i = 0) => prog(t, times().merge + 0.06 * i, 1.0);
const COMPACT_F = () => mono(25, 550);
function compactW(ctx, i) { return measure(ctx, compact(parts()[i]), COMPACT_F()) + 28; }
function compactCentre(ctx, i, t) {
  const pos = compactPos(i, t);
  return { x: pos.x + compactW(ctx, i) / 2, y: pos.y + 20 };
}
// A compact part record centred on (cx, cy).
function compactRow(ctx, i, cx, cy, alpha = 1, k = 1) {
  if (alpha <= 0.001) return;
  const w = compactW(ctx, i);
  withScale(ctx, k, cx, cy, () => withAlpha(ctx, alpha, () => {
    const x = cx - w / 2, y = cy - 20;
    fillRR(ctx, x, y, w, 40, 9, rgba(B[i], 0.1));
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, 39, 9, rgba(B[i], 0.55), 1.5);
    text(ctx, compact(parts()[i]), x + 14, y + 21, { font: COMPACT_F(), color: B[i], baseline: "middle" });
  }));
}
function compact(p) {
  return `{type: ${p.type}, index: ${p.index}${p.name !== undefined ? `, name: '${p.name}'` : ""}${p.ctor ? ", …" : ""}}`;
}
// Under the box wherever it is, so the records ride along as it moves into the Template.
function compactPos(i, t) {
  const b = boxAt(t);
  return { x: b.x, y: b.y + boxH() * b.k + 22 + i * TPL.rowH };
}

// ------------------------------------------------------------------ draw

export function drawPrep(F) {
  const { ctx, t } = F;
  const T = times();
  const ps = parts();

  // ================================================================ parse
  // the code, in the right column: lit-html's Template.createElement
  const codeA = 1 - prog(t, T.inert + 0.3, 0.5);
  const c1 = prog(t, T.code1, 0.45), c2 = prog(t, T.code2, 0.45);
  if (c1 > 0 && codeA > 0) {
    const code = codeBlock();
    const cx = RIGHT, cy = BOX.y + boxH() / 2 - code.height / 2 - 10;
    const hlHtml = window(t, T.fly - 0.1, T.parsed, 0.3, 0.4);
    withAlpha(ctx, codeA, () => {
      if (hlHtml > 0) {
        const f = code.find("html");
        const r = code.rect(ctx, cx, cy, f.line, f.col, f.len);
        withAlpha(ctx, hlHtml, () => fillRR(ctx, r.x - 5, r.y - 2, r.w + 10, r.h + 4, 7, rgba(C.accent, 0.22)));
      }
      code.draw(ctx, cx, cy, { style: (tok) => {
        const u = tok.line < 2 ? c1 : c2;
        return { alpha: u, dx: 16 * (1 - u) };
      } });
    });
  }

  // ghost copies behind the box ({copied})
  const ghost = prog(t, T.copied + 0.25, 0.8) * (1 - prog(t, T.walk - 0.1, 0.4));
  if (ghost > 0) {
    const b = boxAt(t), H = boxH();
    for (let g = 2; g >= 1; g--) {
      const off = 16 * g * ghost;
      withAlpha(ctx, ghost * (g === 1 ? 0.55 : 0.3), () => {
        fillRR(ctx, b.x + off, b.y + off, BOXW, H, 16, C.panel);
        ctx.save();
        ctx.setLineDash([10, 8]);
        strokeRR(ctx, b.x + off + 0.5, b.y + off + 0.5, BOXW - 1, H - 1, 16, rgba(OBJ.dom, 0.6), 1.5);
        ctx.restore();
      });
    }
  }

  // ================================================================ cache: the Template frame (behind the box)
  const tplU = prog(t, T.merge + 0.75, 0.5);
  const tplGlow = Math.max(pulse(t, T.tplTitle + 0.1, 1.2) * 0.8, pulse(t, T.once - 0.1, 1.4) * 0.9);
  if (tplU > 0) {
    const tp = tplAt(t), bt = boxInTemplate(t);
    withScale(ctx, lerp(0.96, 1, tplU), tp.x + tp.w / 2, tp.y + tp.h / 2, () => {
      objectFrame(ctx, { x: tp.x, y: tp.y, w: tp.w, h: tp.h, title: "Template", color: OBJ.template, alpha: tplU, glow: tplGlow, size: 32 });
      withAlpha(ctx, tplU, () => {
        text(ctx, "el:", tp.x + TPL.pad, bt.y + 36, { font: mono(26, 450), color: C.text3, baseline: "middle" });
        text(ctx, "parts:", tp.x + TPL.pad, compactPos(0, t).y + 20, { font: mono(26, 450), color: C.text3, baseline: "middle" });
      });
    });
  }

  // ================================================================ the box
  const box = drawBox(ctx, t);

  // ================================================================ parse: the string
  drawString(ctx, t, box);

  // the inert icons (right column) and "only there to be copied" (under the box)
  const iconsOut = 1 - prog(t, T.walk - 0.1, 0.4);
  if (iconsOut > 0) {
    const labels = ["scripts don't run", "images don't load", "custom elements don't upgrade"];
    const kinds = ["script", "image", "element"];
    const s = 108, gap = 58, y0 = BOX.y + boxH() / 2 - (3 * s + 2 * gap) / 2;
    labels.forEach((lab, i) => {
      const t0 = T.icons[i] - 0.2;
      const u = prog(t, t0, 0.45, ease.outBack) * iconsOut;
      const y = y0 + i * (s + gap);
      inertIcon(ctx, kinds[i], RIGHT, y, s, u, prog(t, t0 + 0.45, 0.35));
      text(ctx, lab, RIGHT + s + 32 - 12 * (1 - clamp(u)), y + s / 2 + 1, { font: sans(33, 550), color: C.text, baseline: "middle", alpha: clamp(u) });
    });
    const cp = prog(t, T.copied, 0.5) * iconsOut;
    if (cp > 0) text(ctx, "only there to be copied", BOX.x + 4, bandY() + 92 - 10 * (1 - cp), { font: sans(46, 700), color: C.text, baseline: "middle", alpha: cp });
  }

  // ================================================================ walk
  drawWalk(ctx, t, box);

  // ================================================================ cache
  drawCache(ctx, t, box);
}

let CODE = null;
const codeBlock = () => (CODE ??= new Code("const el =\n  document.createElement('template');\nel.innerHTML = html;", { size: 28 }));

// The annotated HTML: centred at first, then up at the top left, then into the box.
function drawString(ctx, t, box) {
  const T = times();
  const into = prog(t, T.fly, 0.95, ease.inOutCubic);
  const sweepU = prog(t, T.parsed, 1.1, ease.inOutSine);
  if (sweepU >= 1) return;
  const cols = htmlCols();
  const nl = htmlLines().length;
  // A: centred, large
  const sA = 32;
  const wA = cols * 0.6 * sA;
  const A = { x: 960 - wA / 2, y: 560 - (nl * sA * 1.5) / 2, s: sA };
  // B: top left, above the box
  const B_ = { x: BOX.x + 36, y: bandY() + 54, s: 26 };
  // C: inside the box, where the tree will be
  const b = box ? box.b : BOX;
  const C_ = { x: b.x + (X0 + 4) * b.k, y: b.y + (TREE_Y + 8) * b.k, s: 24 };
  const up = prog(t, T.toTop, 0.85, ease.inOutCubic);
  let P = mix(A, B_, up);
  P = mix(P, C_, into);
  // the frame: "html", one string
  const fr = prog(t, T.frame, 0.5) * (1 - prog(t, T.fly + 0.1, 0.5));
  const w = cols * 0.6 * P.s, h = nl * P.s * 1.5;
  if (fr > 0) {
    const padX = lerp(36, 36, up), head = 46;
    const fx = P.x - padX, fy = P.y - head - 8, fw = w + padX * 2, fh = h + head + 26;
    withAlpha(ctx, fr, () => {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      fillRR(ctx, fx, fy, fw, fh, 14, rgba(C.panel, 0.92));
      ctx.restore();
      strokeRR(ctx, fx + 0.5, fy + 0.5, fw - 1, fh - 1, 14, C.border2, 1.5);
      text(ctx, "html", fx + 22, fy + head / 2 + 4, { font: mono(26, 600), color: C.text2, baseline: "middle" });
      text(ctx, "one string", fx + fw - 22, fy + head / 2 + 4, { font: sans(22, 500), color: C.text3, baseline: "middle", align: "right" });
    });
  }
  const T0 = T.markersGlow;
  const glow = (k) => pulse(t, T0 + k * 0.25, 0.9);
  // inside the box, the lines vanish as the parse sweep passes
  const lineAlpha = (i) => {
    if (sweepU <= 0) return 1;
    const tr = tree();
    const sweepY = lerp(TREE_Y - 6, TREE_Y + tr.rows.length * LH + 6, sweepU);
    const ly = TREE_Y + 8 + i * P.s * 1.5;
    return 1 - clamp((sweepY - ly) / 30);
  };
  drawHtml(ctx, P.x, P.y, P.s, { lineAlpha, glow });
}

// ---------------------------------------------------------------- walk

function drawWalk(ctx, t, box) {
  const T = times();
  const ps = parts();
  if (!box) return;

  // under the box: the walker and its filter
  const sy = bandY();
  const wl = prog(t, T.enter, 0.5) * (1 - prog(t, T.stop + 0.2, 0.6));
  if (wl > 0) {
    withAlpha(ctx, wl, () => {
      const x = BOX.x + 4;
      text(ctx, "TreeWalker", x, sy + 34, { font: mono(30, 600), color: C.accent, baseline: "middle" });
      const fu = prog(t, T.skip, 0.45);
      if (fu > 0) chip(ctx, { x: x + 12 * (1 - fu), y: sy + 70, h: 48, text: "SHOW_ELEMENT | SHOW_COMMENT", font: mono(25, 550), color: C.text, bg: rgba(C.accent, 0.12), border: rgba(C.accent, 0.55), r: 10, alpha: fu });
    });
  }

  // the prefix legend ({prefixes})
  const lg = prog(t, T.prefixes, 0.45) * (1 - prog(t, T.legendEnd, 0.5));
  if (lg > 0) drawLegend(ctx, t, BOX.x + BOXW - LEG_W, sy + 6, lg);

  // the parts list
  const pa = prog(t, T.counting - 0.3, 0.6) * (1 - prog(t, T.merge, 0.4));
  const glowParts = window(t, T.tplParts, T.tplParts + 1.2, 0.3, 0.4);
  if (pa > 0) {
    panel(ctx, { x: PANEL.x, y: PANEL.y, w: PANEL.w, h: panelH(), title: "parts", titleFont: mono(26, 600), titleColor: C.text, header: PANEL.head, alpha: pa, accent: null, glow: glowParts, border: C.border });
    if (glowParts > 0) withAlpha(ctx, pa, () => withGlow(ctx, rgba(OBJ.template, 0.8 * glowParts), 26 * glowParts, () => strokeRR(ctx, PANEL.x, PANEL.y, PANEL.w, panelH(), 16, rgba(OBJ.template, glowParts), 2.5)));
    // one slot per hole (strings.length - 1), until its part lands
    const holes = truth().counter.result0.strings.length - 1;
    for (let i = 0; i < holes; i++) {
      const sl = slot(i), h = cardH(ps[i]);
      const u = pa * (1 - prog(t, T.found[i] + 0.6, 0.3));
      if (u <= 0) continue;
      withAlpha(ctx, u, () => {
        ctx.save();
        ctx.setLineDash([9, 8]);
        strokeRR(ctx, sl.x + 0.5, sl.y + 0.5, CARD.w - 1, h - 1, 14, rgba(B[i], 0.45), 2);
        ctx.restore();
        text(ctx, `hole ${i}`, sl.x + CARD.w / 2, sl.y + h / 2 + 1, { font: sans(26, 600), color: rgba(B[i], 0.6), align: "center", baseline: "middle" });
      });
    }
  }

  // the cards: emerge from their node, fly to their slot
  ps.forEach((p, i) => {
    const t0 = T.found[i];
    const u = prog(t, t0, 0.85, ease.inOutCubic);
    if (u <= 0) return;
    const merge = mergeU(t, i);
    const s1 = slot(i);
    const h = cardH(p);
    const from = box.source(i);
    const to = { x: s1.x + CARD.w / 2, y: s1.y + h / 2 };
    const pos = along(from, to, u, -60);
    const k = lerp(0.25, 1, ease.outCubic(u));
    // cache: the card shrinks into its compact record in the Template
    const toC = compactCentre(ctx, i, t);
    const P = mix(pos, toC, merge);
    const kk = lerp(k, 0.42, merge);
    const cardA = clamp(u * 3) * (1 - clamp((merge - 0.3) / 0.4));
    if (merge > 0 && merge < 1) compactRow(ctx, i, P.x, P.y, clamp((merge - 0.45) / 0.4), lerp(0.75, 1, merge));
    const glow = Math.max(pulse(t, t0 + 0.7, 1.0), pulse(t, T.threeParts + i * 0.12, 0.9), i === 2 ? pulse(t, T.recorded, 0.9) : 0);
    if (cardA > 0) {
      withScale(ctx, kk, P.x, P.y, () => {
        const kc = templatePartCard(ctx, { x: P.x - CARD.w / 2, y: P.y - h / 2, part: p, color: B[i], size: CARD.size, w: CARD.w, alpha: cardA, glow });
        // rows lit in turn as they're named
        const R = T.rows[i];
        withAlpha(ctx, cardA, () => {
          R.steps.forEach(([at, rows], j) => {
            const until = R.steps[j + 1]?.[0] ?? R.end;
            const u = window(t, at, until - 0.05, 0.25, 0.25);
            for (const ri of rows) if (ri < kc.rowRects.length) rowHighlight(ctx, kc.row(ri), B[i], u);
          });
        });
      });
    }
  });

  // "3 holes, 3 parts"
  const hu = prog(t, T.holes, 0.4) * (1 - prog(t, T.tplEl, 0.5));
  if (hu > 0) {
    const holes = truth().counter.result0.strings.length - 1;
    const x = PANEL.x + PANEL.w / 2, y = PANEL.y + panelH() + 58;
    const pu = prog(t, T.threeParts, 0.4);
    withAlpha(ctx, hu, () => {
      const f = sans(32, 650);
      const a = `${holes} holes`, b2 = `  ·  ${ps.length} parts`;
      const wa = measure(ctx, a, f), wb = measure(ctx, b2, f);
      const x0 = x - (wa + wb + 50) / 2;
      text(ctx, a, x0, y, { font: f, color: C.text, baseline: "middle" });
      text(ctx, b2, x0 + wa, y, { font: f, color: C.text, baseline: "middle", alpha: pu });
      check(ctx, x0 + wa + wb + 32, y, 30, C.ok, prog(t, T.threeParts + 0.4, 0.4));
    });
  }
}

// ".value → PropertyPart" etc.: from truth (partKinds for the two kinds the
// counter doesn't use; the counter's own two attribute parts for the others).
let LEG = null;
function legendRows() {
  if (LEG) return LEG;
  const T = truth();
  const names = T.partKinds.prepare.attrNames;
  const pk = T.partKinds.events.find((e) => e.kind === "template prep").parts.filter((p) => p.type === 1);
  const byPrefix = new Map(names.map((n, i) => [/^[.?@]/.test(n) ? n[0] : "", { name: n, ctor: pk[i].ctor }]));
  const ours = T.counter.prepare.attrNames; // ['class', '@click']
  const tp = templateParts().filter((p) => p.type === 1);
  const oursBy = new Map(ours.map((n, i) => [/^[.?@]/.test(n) ? n[0] : "", { name: n, ctor: tp[i].ctor, k: templateParts().indexOf(tp[i]) }]));
  LEG = [".", "?", "@", ""].map((pre) => {
    const o = oursBy.get(pre);
    if (o) return { pre, name: o.name, ctor: o.ctor, color: B[o.k], ours: true };
    const e = byPrefix.get(pre);
    return { pre, name: e.name, ctor: e.ctor, color: C.text2, ours: false };
  });
  return LEG;
}

const LEG_W = 590;
function drawLegend(ctx, t, x, y, a) {
  const T = times();
  const rows = legendRows();
  const f = mono(25, 500), fb = mono(25, 800);
  const rh = 43, w = LEG_W;
  const h = 12 + rows.length * rh + 12;
  withAlpha(ctx, a, () => {
    fillRR(ctx, x, y, w, h, 14, rgba(C.panel, 0.9));
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 14, C.border, 1.5);
    const hot = { ".": window(t, T.dot, T.question - 0.2, 0.25, 0.3), "?": window(t, T.question, T.recorded - 0.1, 0.25, 0.3), "@": window(t, T.prefixes, T.dot - 0.1, 0.25, 0.3), "": 0 };
    rows.forEach((r, i) => {
      const ry = y + 12 + i * rh;
      const ra = r.ours ? 1 : prog(t, r.pre === "." ? T.dot : T.question, 0.35) * 0.55 + 0.45;
      const u = hot[r.pre];
      if (u > 0) withAlpha(ctx, u, () => fillRR(ctx, x + 10, ry + 2, w - 20, rh - 4, 8, rgba(r.ours ? r.color : C.accent, 0.16)));
      withAlpha(ctx, ra, () => {
        const my = ry + rh / 2 + 1;
        // the prefix, as a key cap (dashed and empty: no prefix)
        const kx = x + 20, ks = 32, kc = r.ours ? r.color : C.text;
        ctx.save();
        if (!r.pre) ctx.setLineDash([4, 4]);
        fillRR(ctx, kx, my - ks / 2, ks, ks, 7, r.pre ? rgba(kc, 0.14) : "rgba(0,0,0,0)");
        strokeRR(ctx, kx + 0.5, my - ks / 2 + 0.5, ks - 1, ks - 1, 7, rgba(kc, r.pre ? 0.7 : 0.35), 1.5);
        ctx.restore();
        if (r.pre) text(ctx, r.pre, kx + ks / 2, my + 1, { font: fb, color: kc, baseline: "middle", align: "center" });
        text(ctx, r.pre ? r.name.slice(1) : r.name, kx + ks + 4, my, { font: f, color: r.color, baseline: "middle" });
        text(ctx, "→", x + 214, my, { font: sans(26, 500), color: C.text3, baseline: "middle" });
        text(ctx, r.ctor, x + 256, my, { font: f, color: r.ours ? r.color : C.text, baseline: "middle" });
      });
    });
  });
}

// ---------------------------------------------------------------- cache

function drawCache(ctx, t, box) {
  const T = times();
  const ps = parts();
  // compact part records inside the Template (once the cards have become them)
  ps.forEach((p, i) => {
    if (mergeU(t, i) < 1) return;
    const c = compactCentre(ctx, i, t);
    compactRow(ctx, i, c.x, c.y);
  });

  // the template cache (on the right, where lookup had it): the entry goes
  // in under the strings array
  const su = prog(t, T.stored, 0.7);
  if (su <= 0) return;
  const tp = tplAt(t);
  const K = CACHE.k;
  const tableH = 52 + 16 + 62 + 10; // kit cacheTable with one row
  const cx = CACHE.right - CACHE.w * K + 90 * (1 - su);
  const cy = CACHE.y;
  const eu = prog(t, T.entry, 0.45);
  const keyHl = window(t, T.key, T.once - 0.2, 0.3, 0.4);
  let g = null;
  withScale(ctx, K, cx, cy, () => {
    g = cacheTable(ctx, { x: cx, y: cy, w: CACHE.w, entries: eu > 0 ? [{ key: "counter strings", u: eu, hl: 0 }] : [], alpha: su, glow: pulse(t, T.entry - 0.1, 1.2) });
    const r = g.rows[0];
    if (keyHl > 0) ring(ctx, { x: r.x + 6, y: r.y + 5, w: CACHE.w * 0.5 - 24, h: r.h - 10, r: 8, pad: 2, color: OBJ.cache, u: keyHl });
  });
  const S = (q) => ({ x: cx + (q.x - cx) * K, y: cy + (q.y - cy) * K });
  const r = g.rows[0];
  // the entry's value points at the Template
  const au = prog(t, T.entry + 0.3, 0.7);
  if (au > 0) {
    const a = S({ x: r.valuePort.x + 30, y: r.y + r.h + 4 });
    const b = { x: tp.x + tp.w + 14, y: tp.y + tp.h * 0.42 };
    arrow(ctx, a, b, { color: OBJ.template, width: 3.5, bend: -110, progress: au, glow: 0.5, head: 14 });
  }
  // the rule, under the cache
  const r1 = prog(t, T.rule, 0.5), r2 = prog(t, T.times, 0.5), r3 = prog(t, T.places, 0.5);
  if (r1 > 0) {
    const x = cx + 6, y = cy + tableH * K + 250;
    text(ctx, "once per template literal", x + 10 * (1 - r1), y, { font: sans(50, 700), color: C.text, alpha: r1 });
    text(ctx, "however many renders,", x + 10 * (1 - r2), y + 70, { font: sans(36, 500), color: C.text2, alpha: r2 });
    text(ctx, "however many places", x + 10 * (1 - r3), y + 122, { font: sans(36, 500), color: C.text2, alpha: r3 });
  }
}
