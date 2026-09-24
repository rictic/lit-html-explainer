// markers: lit-html has no HTML parser of its own. It fills each hole in the
// strings with a marker it can find again after the browser has parsed
// them, and which marker depends on where the hole is. It learns that by
// scanning the strings with a few regexes; the caret here replays the real
// scan (markers-scan.js runs lit-html's getTemplateHtml on truth's strings).
// Ends on the annotated HTML (truth counter.prepare.html) as lines, centred,
// laid out exactly as `parse` starts.

import { B, C, DOMC, SYN, blend, rgba } from "../kit/theme.js";
import { along, arrow, check, cross, fillRR, measure, mono, monoAdvance, panel, ring, sans, setFont, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { Code, KIND_COLOR, tokenize } from "../kit/code.js";
import { cells } from "../kit/objects.js";
import { literalPieces, literalText, markerPieces } from "../kit/lit.js";
import { truth } from "../timing.js";
import { clamp, ease, lerp, mix, prog, pulse, window } from "../util.js";
import { scanTemplate, stateOf } from "./markers-scan.js";

export const transition = "fade";

const WT = 480;           // weight of the HTML (as `parse` draws it)
const SLOT = 2.4;         // an empty hole's width, in characters
const GOLD = "#ffd166";   // the mystery-comment ring, as in `open`

// The scanner's states in words, each with a colour of its own (not a binding colour).
const STATES = {
  text: { label: "text", color: "#e3e8f5" },
  tag: { label: "inside a tag", color: "#9db4ff" },
  value: { label: "attribute value", color: "#a8d8a0" },
};
const stateLabel = (s) => (s === "valueU" ? "attribute value (unquoted)" : STATES[s]?.label ?? s);
const stateColor = (s) => STATES[s === "valueU" ? "value" : s]?.color ?? C.text2;

// Layouts of the HTML: where line 0's middle is, line height, size; c = 1
// centres the block on its widest line. A: next to the parser; B (in
// params): the scan; M: up, for the marker close-up; E: exactly as `parse`
// starts (32 px, 1.5 lines, centred).
const PA = { size: 46, lh: 80, y: 455, x: 60, c: 0 };
const PM = { size: 40, lh: 66, y: 272, x: 110, c: 1 };
const PE = { size: 32, lh: 48, y: 489, x: 110, c: 1 };

const DY = 820;           // the detail row under the HTML

// ------------------------------------------------------------------ model

let M = null;
function model() {
  if (M) return M;
  const T = truth();
  const strings = T.counter.result0.strings;
  const scan = scanTemplate(strings, T.marker, T.boundAttributeSuffix);
  const ok = scan.html === T.counter.prepare.html &&
    JSON.stringify(scan.attrNames) === JSON.stringify(T.counter.prepare.attrNames) &&
    scan.nodeMarker === `<${T.markerMatch}>`;
  // Syntax kind of every character of the strings, from the kit's tokenizer,
  // so the HTML is coloured like the code views.
  const src = "html`" + strings.join("${x}") + "`";
  const lineStart = [0];
  for (let i = 0; i < src.length; i++) if (src[i] === "\n") lineStart.push(i + 1);
  const kindAt = new Array(src.length).fill("ws");
  for (const tk of tokenize(src)) {
    if (tk.tpl !== 0 || tk.bind) continue;
    const off = lineStart[tk.line] + tk.col;
    for (let k = 0; k < tk.text.length; k++) kindAt[off + k] = tk.kind;
  }
  const kinds = [];
  let off = "html`".length;
  for (const s of strings) {
    kinds.push(kindAt.slice(off, off + s.length));
    off += s.length + "${x}".length;
  }
  // What's displayed, in order: static text, the $lit$ suffixes, the holes.
  const segs = [];
  for (const r of scan.strings) {
    if (r.kind === "attr") {
      segs.push({ type: "text", i: r.i, a: 0, b: r.attrNameEndIndex });
      segs.push({ type: "suffix", k: r.i });
      segs.push({ type: "text", i: r.i, a: r.attrNameEndIndex, b: r.s.length });
    } else segs.push({ type: "text", i: r.i, a: 0, b: r.s.length });
    segs.push({ type: "hole", k: r.i });
  }
  const l = strings.length - 1;
  segs.push({ type: "text", i: l, a: 0, b: strings[l].length });
  const suffix = T.boundAttributeSuffix;
  M = {
    strings, scan, ok, kinds, segs, suffix,
    marker: T.marker,
    nodeMarker: scan.nodeMarker,
    sufParts: [suffix[0], suffix.slice(1, -1), suffix.at(-1)], // "$" "lit" "$"
  };
  return M;
}

// Colour of character j of string i. `settle` blends into parse's DOM colours.
function charColor(i, j, settle = 0) {
  const k = M.kinds[i][j];
  const c = KIND_COLOR[k] ?? SYN.text;
  return settle > 0 && k === "attrValue" ? blend(c, DOMC.punct, settle) : c;
}

// ------------------------------------------------------------------ timing

function schedule(S) {
  const m = (k) => S.m(k);
  const w = (p, x, n = 0) => S.word(p, x, n);
  return {
    // goal · parser · holes · fill
    morph: m("goal") + 0.25,
    dom: w(0, "DOM") - 0.55,
    parser: m("parser") + 0.05,
    fast: w(0, "fast") - 0.15,
    feed: m("holes") + 0.05,
    refuse: w(0, "complete") - 0.1,
    holes: w(0, "holes") - 0.2,
    fills: w(0, "fills") - 0.25,
    accept: w(0, "marker") - 0.05,
    found: w(0, "find") - 0.2,
    // which · scan · states · regex
    which: m("which") - 0.1,
    scan: m("scan"),
    states: m("states"),
    sText: w(1, "text"),
    sInside0: w(1, "inside", 0),
    sTag: w(1, "tag"),
    sInside1: w(1, "inside", 1),
    sAttr: w(1, "attribute's"),
    regex: m("regex"),
    // hole 0
    h0: m("h0"),
    classAttr: w(2, "value") - 0.2,
    value: w(2, "puts") - 0.15,
    dollar0: w(2, "dollar", 0) - 0.12,
    lit: w(2, "lit", 1) - 0.12,
    dollar1: w(2, "dollar", 1) - 0.12,
    name: w(2, "name") - 0.55,
    why: m("why"),
    easy: w(2, "easy") - 0.25,
    never: w(2, "never") - 0.25,
    // hole 1
    h1: m("h1"),
    inText: w(3, "text"),
    span: w(3, "span") - 0.4,
    pi: w(3, "marker") - 0.2,
    brackets: w(3, "angle") - 0.12,
    question: w(3, "question") - 0.12,
    syntax: m("syntax"),
    processing: w(3, "processing") - 0.25,
    unsupported: w(3, "support") - 0.55,
    bogus: m("bogus"),
    comment: w(3, "comment", 0) - 0.45,
    short: w(3, "bytes") - 0.45,
    // hole 2
    h2: m("h2"),
    binding: w(4, "binding"),
    attr: w(4, "another") - 0.25,
    attrSuffix: w(4, "value") - 0.15,
    first: w(4, "first") - 0.15,
    // the marker
    marker: m("marker"),
    mLit: w(5, "lit") - 0.25,
    mRandom: w(5, "random") - 0.2,
    mDollar: w(5, "dollar") - 0.2,
    once: m("once"),
    settle: w(5, "unlikely") - 0.3,
  };
}

// The caret's two runs, as keyframes {t, i, j}: string i, character j (the
// caret sits before character j; j = length is the hole). A change of i is a
// hop over the hole between the strings. The fast run is the overview on
// "scans the strings"; the slow run steps through string 0 in time with
// "text / inside a tag / attribute's value", then strings 1 and 2 at h1, h2.
let PASSES = null, PASS_T = -1;
function passes(T) {
  if (PASSES && PASS_T === T.scan) return PASSES;
  const len = M.strings.map((s) => s.length);
  const s0 = M.scan.strings[0].steps;
  let u = T.scan + 0.3;
  const fast = { in: T.scan + 0.1, keys: [{ t: u, i: 0, j: 0 }] };
  fast.keys.push({ t: (u += 0.8), i: 0, j: len[0] });
  fast.keys.push({ t: (u += 0.22), i: 1, j: 0 });
  fast.keys.push({ t: (u += 0.14), i: 1, j: len[1] });
  fast.keys.push({ t: (u += 0.22), i: 2, j: 0 });
  fast.keys.push({ t: (u += 1.25), i: 2, j: len[2] });
  fast.out = u + 0.45;
  const slow = {
    in: T.states + 0.15,
    out: T.marker - 0.15,
    keys: [
      { t: T.states + 0.3, i: 0, j: 0 },
      { t: T.sText - 0.65, i: 0, j: 0 },
      { t: T.sText + 0.1, i: 0, j: s0[0].index },     // through the text
      { t: T.sInside0 - 0.1, i: 0, j: s0[0].index },
      { t: T.sTag - 0.03, i: 0, j: s0[0].end },         // "<span": inside a tag
      { t: T.sInside1 - 0.1, i: 0, j: s0[0].end },
      { t: T.sAttr + 0.15, i: 0, j: s0[1].end },        // ' class="': an attribute value
      { t: T.h1 - 0.4, i: 0, j: len[0] },
      { t: T.h1 - 0.05, i: 1, j: 0 },
      { t: T.inText - 0.2, i: 1, j: len[1] },
      { t: T.h2 - 0.8, i: 1, j: len[1] },
      { t: T.h2 - 0.45, i: 2, j: 0 },
      { t: T.binding - 0.1, i: 2, j: len[2] },
    ],
  };
  // when each run's caret passes the end of each regex match (and each hole)
  for (const ps of [fast, slow]) {
    ps.stepT = M.scan.strings.map((r) => r.steps.map((st) => reachT(ps, r.i, st.end)));
    ps.holeT = M.scan.strings.map((r) => reachT(ps, r.i, len[r.i]));
  }
  PASSES = [fast, slow];
  PASS_T = T.scan;
  return PASSES;
}

function reachT(ps, i, e) {
  const K = ps.keys;
  for (let n = 0; n + 1 < K.length; n++) {
    const a = K[n], b = K[n + 1];
    if (a.i === i && b.i === i && b.j > a.j && a.j <= e && b.j >= e) return lerp(a.t, b.t, (e - a.j) / (b.j - a.j));
  }
  return null;
}

// Animated widths (in characters) of the inserted pieces.
function anim(t, T) {
  const ml = M.marker.length;
  const g0 = prog(t, T.value, 0.6, ease.outCubic);
  const g1 = prog(t, T.pi, 0.6, ease.outCubic);
  const g1b = prog(t, T.brackets, 0.4, ease.outCubic);
  const g1q = prog(t, T.question, 0.4, ease.outCubic);
  const g2 = prog(t, T.attr, 0.6, ease.outCubic);
  const s0 = [T.dollar0, T.lit, T.dollar1].map((a) => prog(t, a, 0.35, ease.outCubic));
  const s2 = prog(t, T.attrSuffix, 0.45, ease.outCubic);
  const [p0, p1, p2] = M.sufParts.map((p) => p.length);
  return {
    hole: [lerp(SLOT, ml, g0), lerp(SLOT, ml, g1) + 2 * g1b + g1q, lerp(SLOT, ml, g2)],
    gap: [g0, g1, g2],
    drop: [prog(t, T.value, 0.7), prog(t, T.pi, 0.7), prog(t, T.attr, 0.7)],
    g1b, g1q,
    suf: [p0 * s0[0] + p1 * s0[1] + p2 * s0[2], 0, M.suffix.length * s2],
    s0, s2,
  };
}

function params(t, T) {
  // the scan: one size throughout (the finished first line fills ~80% of the width)
  const PB = { size: 44, lh: 123, y: lerp(380, 305, prog(t, T.regex - 0.3, 0.9)), x: PA.x, c: 1 };
  let P = mix(PA, PB, prog(t, T.which, 0.9));
  P = mix(P, PM, prog(t, T.marker - 0.1, 0.9));
  return mix(P, PE, prog(t, T.settle, 0.9));
}

// ------------------------------------------------------------------ layout

// Positions in character units: chars[i][j] = {line, col}; ends[i] is the
// end of string i (the hole); holes/sufs = {line, col, w}.
function layout(A) {
  const chars = M.strings.map(() => []);
  const ends = [], holes = [], sufs = [], lineLen = [];
  let line = -1, col = 0;          // the leading "\n" makes no line
  const L = () => Math.max(0, line);
  const grow = () => { lineLen[L()] = Math.max(lineLen[L()] ?? 0, col); };
  for (const sg of M.segs) {
    if (sg.type === "text") {
      const s = M.strings[sg.i];
      for (let j = sg.a; j < sg.b; j++) {
        chars[sg.i][j] = { line: L(), col };
        if (s[j] === "\n") { chars[sg.i][j].nl = true; line++; col = 0; }
        else { col += 1; grow(); }
      }
      if (sg.b === s.length) ends[sg.i] = { line: L(), col };
    } else if (sg.type === "suffix") {
      sufs[sg.k] = { line: L(), col, w: A.suf[sg.k] };
      col += A.suf[sg.k];
      grow();
    } else {
      holes[sg.k] = { line: L(), col, w: A.hole[sg.k] };
      col += A.hole[sg.k];
      grow();
    }
  }
  return { chars, ends, holes, sufs, lineLen, maxLen: Math.max(...lineLen) };
}

let MET = null;
function metrics(ctx) {
  if (MET) return MET;
  ctx.save();
  setFont(ctx, mono(100, WT));
  ctx.textBaseline = "middle";
  const m = ctx.measureText("Mb|$gj<");
  ctx.restore();
  MET = { asc: m.actualBoundingBoxAscent / 100, desc: m.actualBoundingBoxDescent / 100 };
  return MET;
}

function geom(ctx, P, Lc) {
  const adv = monoAdvance(ctx, P.size, WT);
  const mt = metrics(ctx);
  const x0 = lerp(P.x, 960 - (Lc.maxLen * adv) / 2, P.c);
  const asc = mt.asc * P.size, desc = mt.desc * P.size;
  const G = {
    adv, size: P.size, lh: P.lh, asc, desc, x0,
    X: (col) => x0 + col * adv,
    Y: (line) => P.y + line * P.lh,
  };
  // the box of `w` characters from (line, col)
  G.box = (line, col, w, pad = 5) => ({ x: G.X(col), y: G.Y(line) - asc - pad, w: w * adv, h: asc + desc + pad * 2 });
  return G;
}

const xy = (G, p) => ({ x: G.X(p.col), y: G.Y(p.line), line: p.line });

// Where the caret is for string i, fractional character jf.
function caretPos(G, Lc, i, jf) {
  const s = M.strings[i];
  if (jf >= s.length) return xy(G, Lc.ends[i]);
  const j = Math.max(0, Math.floor(jf)), f = jf - j;
  const p0 = Lc.chars[i][j];
  const p1 = j + 1 < s.length ? Lc.chars[i][j + 1] : Lc.ends[i];
  if (p0.line !== p1.line) return f < 0.5 ? xy(G, { line: p0.line, col: p0.col + f }) : xy(G, p1);
  return xy(G, { line: p0.line, col: lerp(p0.col, p1.col, f) });
}

// The scanner's state after reading string i up to jf.
function stateAt(i, jf) {
  const r = M.scan.strings[i];
  let re = r.start, ane = -1;
  for (const st of r.steps) if (jf >= st.end - 1e-6) { re = st.after; ane = st.attrNameEndIndex; }
  const s = stateOf(re, ane);
  return s === "value" && re === "tagEndRegex" ? "valueU" : s;
}

function regexAt(i, jf) {
  const r = M.scan.strings[i];
  let re = r.start;
  for (const st of r.steps) if (jf >= st.end - 1e-6) re = st.after;
  return re;
}

function caretNow(t, PS, G, Lc) {
  for (const ps of PS) {
    const a = prog(t, ps.in, 0.25) * (1 - prog(t, ps.out, 0.35));
    if (a <= 0) continue;
    const K = ps.keys;
    let c = null;
    if (t <= K[0].t) c = { ...caretPos(G, Lc, K[0].i, K[0].j), i: K[0].i, jf: K[0].j };
    for (let n = 0; !c && n + 1 < K.length; n++) {
      const p = K[n], q = K[n + 1];
      if (t > q.t) continue;
      const u = clamp((t - p.t) / (q.t - p.t || 1));
      if (p.i === q.i) {
        const jf = lerp(p.j, q.j, u);
        c = { ...caretPos(G, Lc, p.i, jf), i: p.i, jf };
      } else {
        // a hop over hole p.i
        const a0 = xy(G, Lc.ends[p.i]), a1 = xy(G, Lc.chars[q.i][0]);
        const e = ease.inOutCubic(u);
        c = { x: lerp(a0.x, a1.x, e), y: lerp(a0.y, a1.y, e), lift: Math.sin(Math.PI * e) * 30, line: a0.line, i: p.i, jf: M.strings[p.i].length };
      }
    }
    if (!c) {
      const k = K.at(-1);
      c = { ...caretPos(G, Lc, k.i, k.j), i: k.i, jf: k.j };
    }
    c.state = stateAt(c.i, c.jf);
    c.regex = regexAt(c.i, c.jf);
    c.alpha = a;
    c.pass = ps;
    // when the state last changed (for a small pop)
    let last = -Infinity;
    ps.stepT[c.i]?.forEach((tt) => { if (tt !== null && tt <= t) last = Math.max(last, tt); });
    c.since = t - last;
    return c;
  }
  return null;
}

// ------------------------------------------------------------------ drawing helpers

// Coloured monospace pieces [{text, color, alpha}] from (x, y) (middle baseline). Returns the width.
function monoPieces(ctx, list, x, y, size, { alpha = 1, weight = WT } = {}) {
  const adv = monoAdvance(ctx, size, weight);
  let n = 0;
  for (const p of list) {
    if (p.text) text(ctx, p.text, x + n * adv, y, { font: mono(size, weight), color: p.color, baseline: "middle", alpha: alpha * (p.alpha ?? 1) });
    n += p.text.length;
  }
  return n * adv;
}
const piecesLen = (list) => list.reduce((n, p) => n + p.text.length, 0);

// A copy of some of the HTML lifts out of it and flies to its place below:
// from/to = {x, y, size} (left edge, middle baseline). Returns where it is.
function flyPieces(ctx, list, from, to, f, bend = -60) {
  const e = ease.inOutCubic(clamp(f));
  const p = along(from, to, e, bend);
  const size = lerp(from.size, to.size, e);
  const lift = Math.sin(Math.PI * e);
  // it fades in as it leaves, so it never sits doubled over the original
  const draw = () => monoPieces(ctx, list, p.x, p.y, size, { alpha: clamp(e * 4) });
  if (lift > 0.01) withGlow(ctx, `rgba(4,8,20,${0.95 * lift})`, 16, draw);
  else draw();
  return { ...p, size };
}

// The marker's pieces in colour c; the digits dimmer (as the kit draws it)
// until `plain`, which draws it like `parse` does.
const markerIn = (c, plain = 0) => markerPieces("", "", c).filter((p) => p.text)
  .map((p, n) => (n === 1 ? { ...p, color: rgba(c, lerp(0.7, 1, plain)) } : p));

// A pill with a state name in it.
function stateChip(ctx, { x, y, label, color, alpha = 1, glow = 0, align = "center", size = 26, k = 1 }) {
  const f = sans(size, 650);
  const w = measure(ctx, label, f) + 34, h = size + 18;
  const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
  withAlpha(ctx, alpha, () => withScale(ctx, k, x0 + w / 2, y + h / 2, () => {
    if (glow > 0) withGlow(ctx, rgba(color, 0.75 * glow), 24 * glow, () => fillRR(ctx, x0, y, w, h, h / 2, C.panel));
    else fillRR(ctx, x0, y, w, h, h / 2, C.panel);
    fillRR(ctx, x0, y, w, h, h / 2, rgba(color, 0.15));
    strokeRR(ctx, x0 + 1, y + 1, w - 2, h - 2, h / 2 - 1, rgba(color, 0.9), 2);
    text(ctx, label, x0 + w / 2, y + h / 2 + 1, { font: f, color, align: "center", baseline: "middle" });
  }));
  return { x: x0, y, w, h };
}

// A small bracket under [x0, x1] at y, opening upwards (or downwards if up = false).
function bracket(ctx, x0, x1, y, color, alpha = 1, up = true, depth = 10) {
  if (alpha <= 0) return;
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const d = up ? -depth : depth;
    ctx.beginPath();
    ctx.moveTo(x0, y + d);
    ctx.lineTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.lineTo(x1, y + d);
    ctx.stroke();
    ctx.restore();
  });
}

// ------------------------------------------------------------------ the scene

export function draw(F, S) {
  const { ctx, t } = F;
  model();
  const T = schedule(S);
  const PS = passes(T);
  const A = anim(t, T);
  const Lc = layout(A);
  const G = geom(ctx, params(t, T), Lc);
  const settle = prog(t, T.settle, 0.9);
  const cur = caretNow(t, PS, G, Lc);

  drawPipeline(ctx, t, T);
  drawLegend(ctx, t, T, cur);
  drawRegexes(ctx, t, T, cur);
  drawHtml(ctx, t, T, G, Lc, A, PS, cur, settle);
  drawStart(ctx, t, T, G, Lc);
  drawCaret(ctx, t, G, cur);
  drawWhy(ctx, t, T, G, Lc);
  drawPI(ctx, t, T, G, Lc);
  drawAttrNames(ctx, t, T);
  drawCloseUp(ctx, t, T);

  if (!M.ok) text(ctx, "markers: scan does not match truth", 60, 1050, { font: mono(24, 700), color: C.bad });
}

// ------------------------------------------------------------ the start: strings → HTML

const morphU = (t, T, i) => prog(t, T.morph + 0.09 * i, 1.1, ease.inOutCubic);

// The strings array as `lookup` leaves it (size 30, top 478, centred); its
// pieces fly to their places in the HTML, the \n escapes and quotes fade.
function drawStart(ctx, t, T, G, Lc) {
  if (morphU(t, T, M.strings.length - 1) >= 1) return;
  const size = 30, top = 478;
  const items = M.strings.map((s) => ({ text: literalText(s), color: "rgba(0,0,0,0)" }));
  const probe = cells(ctx, { x: 0, y: 0, items, size, alpha: 0, gap: 12 });
  const g = cells(ctx, { x: 960 - probe.w / 2, y: top, items, size, alpha: 1 - prog(t, T.morph, 0.5), gap: 12 });
  const a = monoAdvance(ctx, size, 500);
  M.strings.forEach((s, i) => {
    const u = morphU(t, T, i);
    if (u >= 1) return;
    const c = g.cells[i];
    const sx = c.x + (c.w - measure(ctx, literalText(s), mono(size, 500))) / 2;
    const cy = c.y + c.h / 2 + 1;
    let n = 0, j = 0;
    for (const p of literalPieces(s)) {
      if (p.dim) {
        text(ctx, p.text, sx + n * a, cy, { font: mono(size, 500), color: C.text3, baseline: "middle", alpha: 1 - clamp(u * 3) });
        if (p.text === "\\n") j += 1;
      } else {
        ctx.save();
        ctx.textBaseline = "middle";
        for (let k = 0; k < p.text.length; k++) {
          if (p.text[k] === " ") continue;
          const d = Lc.chars[i][j + k];
          const fs = lerp(size, G.size, u);
          setFont(ctx, mono(fs, lerp(500, WT, u)));
          ctx.fillStyle = blend(C.text, charColor(i, j + k), u);
          ctx.fillText(p.text[k], lerp(sx + (n + k) * a, G.X(d.col), u), lerp(cy, G.Y(d.line), u));
        }
        ctx.restore();
        j += p.text.length;
      }
      n += p.text.length;
    }
  });
}

// ------------------------------------------------------------ the pipeline: HTML → parser → DOM

function drawPipeline(ctx, t, T) {
  const out = 1 - prog(t, T.which - 0.05, 0.45);
  if (out <= 0 || t < T.dom - 0.1) return;
  const adv = monoAdvance(ctx, PA.size, WT);
  const right = PA.x + (M.strings[0].length - 1 + SLOT + M.strings[1].length + SLOT + M.strings[2].indexOf("\n")) * adv;
  const ym = PA.y + 1.5 * PA.lh;
  const PX = { x: 965, y: ym - 135, w: 420, h: 270 };
  const DX = { x: 1470, y: ym - 170, w: 380, h: 340 };
  withAlpha(ctx, out, () => {
    // the goal: HTML → DOM (the parser box lands on the middle of it)
    const du = prog(t, T.dom, 0.5, ease.outBack);
    const a0 = { x: right + 30, y: ym }, a1 = { x: DX.x - 16, y: ym };
    arrow(ctx, a0, a1, { color: C.text3, width: 3, dash: [10, 10], progress: prog(t, T.dom, 0.6), alpha: 0.9 });

    // the DOM
    withAlpha(ctx, prog(t, T.dom, 0.35), () => withScale(ctx, lerp(0.85, 1, du), DX.x + DX.w / 2, ym, () => {
      panel(ctx, { x: DX.x, y: DX.y, w: DX.w, h: DX.h, title: "DOM", titleFont: sans(30, 650), titleColor: C.text, header: 58 });
      const rx = DX.x + 50;
      const rows = [DX.y + 132, DX.y + 208, DX.y + 284];
      ctx.save();
      ctx.strokeStyle = C.border2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rx + 18, rows[0] + 20);
      ctx.lineTo(rx + 18, rows[1]);
      ctx.lineTo(rx + 48, rows[1]);
      ctx.stroke();
      ctx.restore();
      text(ctx, "<span>", rx, rows[0], { font: mono(36, 500), color: DOMC.tag, baseline: "middle" });
      text(ctx, "<button>", rx, rows[2], { font: mono(36, 500), color: DOMC.tag, baseline: "middle" });
      // the markers, found again after parsing
      const dot = (x, y, k) => {
        const u = prog(t, T.found + 0.35 + 0.18 * k, 0.4, ease.outBack);
        if (u <= 0) return;
        withGlow(ctx, rgba(B[k], 0.9), 14, () => {
          ctx.beginPath();
          ctx.arc(x, y, 11 * u, 0, Math.PI * 2);
          ctx.fillStyle = B[k];
          ctx.fill();
        });
      };
      dot(rx + 172, rows[0], 0);
      dot(rx + 70, rows[1], 1);
      dot(rx + 214, rows[2], 2);
    }));

    // the parser
    const pu = prog(t, T.parser, 0.5, ease.outBack);
    const refuse = prog(t, T.refuse, 0.35) * (1 - prog(t, T.accept, 0.35));
    withAlpha(ctx, prog(t, T.parser, 0.3), () => withScale(ctx, lerp(0.8, 1, pu), PX.x + PX.w / 2, ym, () => {
      panel(ctx, { x: PX.x, y: PX.y, w: PX.w, h: PX.h, accent: C.accent, glow: 0.6 * pulse(t, T.parser + 0.2, 1.2) });
      if (refuse > 0) withAlpha(ctx, refuse, () => strokeRR(ctx, PX.x, PX.y, PX.w, PX.h, 16, rgba(C.bad, 0.8), 2.5));
      text(ctx, "the browser's", PX.x + PX.w / 2, PX.y + 80, { font: sans(32, 500), color: C.text2, align: "center", baseline: "middle" });
      text(ctx, "HTML parser", PX.x + PX.w / 2, PX.y + 140, { font: sans(52, 700), color: C.text, align: "center", baseline: "middle" });
      text(ctx, "native · fast", PX.x + PX.w / 2, PX.y + 206, { font: sans(28, 500), color: C.text3, align: "center", baseline: "middle", alpha: prog(t, T.fast, 0.4) });
    }));

    // feeding it the HTML: first refused, then (markers in) accepted
    const fu = prog(t, T.feed, 0.5);
    const acc = prog(t, T.accept, 0.4);
    if (fu > 0) {
      const col = acc > 0 ? blend(C.accent, C.ok, acc) : C.accent;
      arrow(ctx, a0, { x: PX.x - 14, y: ym }, { color: col, width: 4, progress: fu });
      const mid = { x: (a0.x + PX.x - 14) / 2, y: ym - 38 };
      cross(ctx, mid.x, mid.y, 34, C.bad, prog(t, T.refuse, 0.35) * (1 - acc));
      check(ctx, mid.x, mid.y, 36, C.ok, prog(t, T.accept + 0.1, 0.4));
      text(ctx, "needs complete HTML", PX.x + PX.w / 2, PX.y + PX.h + 46, { font: sans(28, 650), color: C.bad, align: "center", baseline: "middle", alpha: refuse });
    }
    // and the DOM, with the markers in it
    const ou = prog(t, T.found, 0.45);
    if (ou > 0) {
      arrow(ctx, { x: PX.x + PX.w + 14, y: ym }, a1, { color: C.ok, width: 4, progress: ou });
      text(ctx, "markers found again", DX.x + DX.w / 2, DX.y + DX.h + 46, { font: sans(26, 600), color: C.text2, align: "center", baseline: "middle", alpha: prog(t, T.found + 0.8, 0.4) });
    }
  });
}

// ------------------------------------------------------------ the legend: three states, a handful of regexes

function drawLegend(ctx, t, T, cur) {
  const u = prog(t, T.states - 0.05, 0.5) * (1 - prog(t, T.marker - 0.25, 0.45));
  if (u <= 0.001) return;
  const cols = [
    { key: "text", named: T.sText - 0.2 },
    { key: "tag", named: T.sTag - 0.2 },
    { key: "value", named: T.sAttr - 0.05 },
  ];
  const now = cur ? (cur.state === "valueU" ? "value" : cur.state) : null;
  withAlpha(ctx, u, () => {
    cols.forEach((col, n) => {
      const cx = 960 + (n - 1) * 470;
      const named = prog(t, col.named, 0.35);
      const on = now === col.key ? named : 0;
      const st = STATES[col.key];
      stateChip(ctx, { x: cx, y: 124, label: st.label, color: st.color, size: 28, alpha: 0.3 + 0.3 * named + 0.4 * on, glow: on, k: 1 + 0.08 * pulse(t, col.named, 0.5) });
    });
  });
}

// ------------------------------------------------------------ the regexes (lit-html.ts, exactly)

const REGEX_SRC = [
  { name: "textEndRegex", lines: [String.raw`const textEndRegex = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g;`] },
  { name: "tagEndRegex", lines: ["const tagEndRegex = new RegExp(", '  `>|${SPACE_CHAR}(?:(${NAME_CHAR}+)(${SPACE_CHAR}*=${SPACE_CHAR}*(?:${ATTR_VALUE_CHAR}|("|\')|))|$)`,', "  'g'", ");"] },
  { name: "singleQuoteAttrEndRegex", lines: ["const singleQuoteAttrEndRegex = /'/g;"] },
  { name: "doubleQuoteAttrEndRegex", lines: ['const doubleQuoteAttrEndRegex = /"/g;'] },
];
const REGEX_STATE = { textEndRegex: "text", tagEndRegex: "tag", singleQuoteAttrEndRegex: "value", doubleQuoteAttrEndRegex: "value" };

// "A handful of regular expressions": the real ones, names in their state's
// colour; the one the scanner is using now is lit.
function drawRegexes(ctx, t, T, cur) {
  const u = prog(t, T.regex - 0.1, 0.5) * (1 - prog(t, T.why - 0.45, 0.4));
  if (u <= 0.001) return;
  const size = 21, lh = 28, adv = monoAdvance(ctx, size, 500);
  const rows = REGEX_SRC.flatMap((r, n) => r.lines.map((line, k) => ({ r, n, line, first: k === 0 })));
  const cols = Math.max(...rows.map((x) => x.line.length));
  const w = cols * adv + 64, head = 40;
  const h = head + rows.length * lh + 16;
  const x = 960 - w / 2, y = 1020 - h + 20 * (1 - u);
  const dim = 1 - 0.35 * prog(t, T.h0 + 1.2, 0.6);
  withAlpha(ctx, u * dim, () => {
    panel(ctx, { x, y, w, h, title: "lit-html.ts", titleFont: mono(20, 500), titleColor: C.text3, header: head });
    rows.forEach((row, k) => {
      const ry = y + head + 8 + k * lh + lh / 2;
      const au = prog(t, T.regex + 0.12 * row.n, 0.4);
      const on = cur && cur.regex === row.r.name ? 1 : 0;
      if (on && row.first) withAlpha(ctx, au, () => fillRR(ctx, x + 14, ry - lh / 2, w - 28, lh * row.r.lines.length, 7, rgba(stateColor(REGEX_STATE[row.r.name]), 0.13)));
      let cx = x + 32;
      const put = (s, color, weight = 500) => { text(ctx, s, cx, ry, { font: mono(size, weight), color, baseline: "middle", alpha: au }); cx += s.length * adv; };
      if (row.first) {
        const i = row.line.indexOf(row.r.name);
        put(row.line.slice(0, i), SYN.keyword);
        put(row.r.name, stateColor(REGEX_STATE[row.r.name]), 650);
        put(row.line.slice(i + row.r.name.length), C.text2);
      } else put(row.line, C.text2);
    });
  });
}

// ------------------------------------------------------------ the HTML

function drawHtml(ctx, t, T, G, Lc, A, PS, cur, settle) {
  const [fast, slow] = PS;

  // regex matches flash as the caret completes them
  for (const ps of [fast, slow]) {
    M.scan.strings.forEach((r, i) => r.steps.forEach((st, n) => {
      const tp = ps.stepT[i][n];
      if (tp === null) return;
      const hold = ps === fast ? 0.15 : 0.55;
      const f = prog(t, tp - 0.06, 0.1) * (1 - prog(t, tp + hold, 0.6));
      if (f <= 0) return;
      const p0 = Lc.chars[i][st.index], p1 = Lc.chars[i][st.end - 1];
      const bx = G.box(p0.line, p0.col, p1.col + 1 - p0.col, 4);
      withAlpha(ctx, f, () => fillRR(ctx, bx.x - 2, bx.y, bx.w + 4, bx.h, 6, rgba(stateColor(stateOf(st.after, st.attrNameEndIndex)), 0.3)));
    }));
  }

  // holes: slot, pulse, preview marker ("brick"), "?", ring
  const out = 1 - prog(t, T.which - 0.05, 0.35);
  for (let k = 0; k < 3; k++) {
    const h = Lc.holes[k];
    const c = B[k];
    const bx = G.box(h.line, h.col, h.w, 5);
    const slotIn = prog(t, T.morph + 0.6 + 0.1 * k, 0.45, ease.outBack);
    if (slotIn <= 0) continue;
    const pz = pulse(t, T.holes + 0.12 * k, 0.9);
    const fast1 = fast.holeT[k] !== null ? pulse(t, fast.holeT[k] - 0.1, 0.5) : 0;
    const filled = A.gap[k];
    const k2 = lerp(0.6, 1, slotIn) * (1 + 0.14 * pz);
    withAlpha(ctx, clamp(slotIn * 2), () => withScale(ctx, k2, bx.x + bx.w / 2, bx.y + bx.h / 2, () => {
      const glow = Math.max(pz, fast1);
      const draw = () => fillRR(ctx, bx.x + 2, bx.y, bx.w - 4, bx.h, 8, rgba(c, (lerp(0.16, 0.1, filled) + 0.14 * glow) * (1 - settle)));
      if (glow > 0) withGlow(ctx, rgba(c, 0.9 * glow), 24, draw);
      else draw();
      withAlpha(ctx, 1 - filled, () => strokeRR(ctx, bx.x + 3, bx.y + 1, bx.w - 6, bx.h - 2, 7, rgba(c, 0.85), 2));
    }));
    // the preview: a block drops into each hole, and leaves again at `which`
    const drop = prog(t, T.fills + 0.12 * k, 0.45, ease.outCubic);
    if (drop > 0 && out > 0) {
      withAlpha(ctx, drop * out, () => fillRR(ctx, bx.x + 7, bx.y + 5 - 44 * (1 - drop), bx.w - 14, bx.h - 10, 5, rgba(c, 0.9)));
    }
    // "which marker?"
    const q = prog(t, T.which + 0.25 + 0.12 * k, 0.4, ease.outBack) * (1 - clamp(filled * 3));
    if (q > 0) withScale(ctx, q, bx.x + bx.w / 2, bx.y + bx.h / 2, () =>
      text(ctx, "?", bx.x + bx.w / 2, bx.y + bx.h / 2 + 1, { font: sans(32, 800), color: c, align: "center", baseline: "middle", alpha: clamp(q) }));
  }

  // the caret parks at each hole: a ring
  const rings = [
    window(t, T.h0 - 0.15, T.value + 0.8, 0.35, 0.5),
    window(t, T.inText - 0.35, T.pi + 0.8, 0.35, 0.5),
    window(t, T.binding - 0.3, T.attr + 0.8, 0.35, 0.5),
  ];
  rings.forEach((u, k) => {
    if (u <= 0) return;
    const h = Lc.holes[k];
    const bx = G.box(h.line, h.col, h.w, 5);
    ring(ctx, { x: bx.x + 2, y: bx.y, w: bx.w - 4, h: bx.h, r: 8, color: B[k], u: u * (0.8 + 0.2 * Math.sin(t * 4)), pad: 6 });
  });

  // "the value of the class attribute" / "the event binding": underline the attribute
  const attrLine = (k, u) => {
    if (u <= 0) return;
    const r = M.scan.strings[k];
    const p0 = Lc.chars[k][r.attrNameEndIndex - r.attrName.length];
    const h = Lc.holes[k];
    const endCol = h.col + h.w + (k === 0 ? 1 : 0); // with the closing quote
    const y = G.Y(p0.line) + G.desc + 10;
    withAlpha(ctx, u, () => fillRR(ctx, G.X(p0.col), y, (endCol - p0.col) * G.adv, 3, 1.5, rgba(B[k], 0.75)));
  };
  attrLine(0, window(t, T.classAttr, T.value + 0.4, 0.35, 0.4));
  attrLine(2, window(t, T.binding - 0.2, T.attr + 0.3, 0.35, 0.4));

  // the bound names: underline "class$lit$" / "@click$lit$"
  const nameLine = (k, u) => {
    if (u <= 0) return;
    const r = M.scan.strings[k];
    const p0 = Lc.chars[k][r.attrNameEndIndex - r.attrName.length];
    const sf = Lc.sufs[k];
    const y = G.Y(p0.line) + G.desc + 10;
    withAlpha(ctx, u, () => fillRR(ctx, G.X(p0.col), y, (sf.col + sf.w - p0.col) * G.adv, 3.5, 1.75, B[k]));
  };
  const firstPulse = pulse(t, T.first, 1.0);
  nameLine(0, Math.max(window(t, T.name, T.h1 - 0.5, 0.35, 0.5), firstPulse));
  nameLine(2, window(t, T.attrSuffix + 0.45, T.marker - 0.3, 0.35, 0.5));

  // the static text
  const glowMk = (k) => pulse(t, T.marker + 0.1 + 0.15 * k, 1.4) + (k === 0 ? firstPulse : 0);
  ctx.save();
  setFont(ctx, mono(G.size, WT));
  ctx.textBaseline = "middle";
  M.strings.forEach((s, i) => {
    if (morphU(t, T, i) < 1) return;
    for (let j = 0; j < s.length; j++) {
      if (s[j] === "\n" || s[j] === " ") continue;
      const p = Lc.chars[i][j];
      ctx.fillStyle = charColor(i, j, settle);
      ctx.fillText(s[j], G.X(p.col), G.Y(p.line));
    }
  });
  ctx.restore();

  // the $lit$ suffixes pop onto the names
  const pop = (u) => ({ k: ease.outBack(clamp(u)), a: clamp(u * 2) });
  const sufColor = (k) => blend(B[k], DOMC.attr, settle);
  {
    const sf = Lc.sufs[0];
    let col = sf.col;
    M.sufParts.forEach((part, n) => {
      const u = A.s0[n];
      if (u > 0) {
        const { k, a } = pop(prog(t, [T.dollar0, T.lit, T.dollar1][n], 0.4));
        const x = G.X(col), y = G.Y(sf.line);
        withAlpha(ctx, a, () => withScale(ctx, lerp(0.3, 1, k), x + (part.length * G.adv) / 2, y, () =>
          text(ctx, part, x, y, { font: mono(G.size, WT), color: sufColor(0), baseline: "middle" })));
      }
      col += part.length * u;
    });
  }
  if (A.s2 > 0) {
    const sf = Lc.sufs[2];
    const { k, a } = pop(prog(t, T.attrSuffix, 0.4));
    const x = G.X(sf.col), y = G.Y(sf.line);
    withAlpha(ctx, a, () => withScale(ctx, lerp(0.3, 1, k), x + (M.suffix.length * G.adv) / 2, y, () =>
      text(ctx, M.suffix, x, y, { font: mono(G.size, WT), color: sufColor(2), baseline: "middle" })));
  }

  // the markers drop into the holes
  const dropMarker = (k, col, line, u) => {
    if (u <= 0) return;
    const x = G.X(col), y = G.Y(line) - 44 * (1 - u);
    const g = glowMk(k);
    const draw = () => monoPieces(ctx, markerIn(B[k], settle), x, y, G.size, { alpha: clamp(u * 1.5) });
    if (g > 0) withGlow(ctx, rgba(B[k], 0.9 * clamp(g)), 18, draw);
    else draw();
  };
  dropMarker(0, Lc.holes[0].col, Lc.holes[0].line, A.drop[0]);
  dropMarker(2, Lc.holes[2].col, Lc.holes[2].line, A.drop[2]);
  {
    // hole 1: the marker, then "<" ">" around it, then "?" after "<"
    const h = Lc.holes[1];
    const y = G.Y(h.line);
    const mCol = h.col + A.g1b + A.g1q;
    dropMarker(1, mCol, h.line, A.drop[1]);
    const bit = (str, col, a0) => {
      const { k, a } = pop(prog(t, a0, 0.4));
      if (a <= 0) return;
      const x = G.X(col);
      withAlpha(ctx, a, () => withScale(ctx, lerp(0.3, 1, k), x + G.adv / 2, y, () =>
        text(ctx, str, x, y, { font: mono(G.size, WT), color: B[1], baseline: "middle" })));
    };
    const [lt, q, gt] = [M.nodeMarker[0], M.nodeMarker[1], M.nodeMarker.at(-1)];
    bit(lt, h.col, T.brackets);
    bit(q, h.col + A.g1b, T.question);
    bit(gt, mCol + lerp(SLOT, M.marker.length, A.gap[1]), T.brackets);
  }
}

// ------------------------------------------------------------ the caret and its state

function drawCaret(ctx, t, G, c) {
  if (!c) return;
  const top = c.y - G.asc - 9 - (c.lift ?? 0), bot = c.y + G.desc + 9 - (c.lift ?? 0);
  const col = stateColor(c.state);
  withAlpha(ctx, c.alpha, () => {
    withGlow(ctx, "rgba(255,255,255,0.9)", 14, () => fillRR(ctx, c.x - 2, top, 4, bot - top, 2, "#ffffff"));
    // the state, as a flag on the caret
    const label = stateLabel(c.state);
    const h = 46;
    const x1 = c.x + 2, y1 = top - 8;
    const k = 1 + 0.1 * (1 - clamp(c.since / 0.3)) * (c.since < 0.3 ? 1 : 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(c.x - 1, y1, 2, top - y1);
    stateChip(ctx, { x: x1, y: y1 - h, label, color: col, align: "right", size: 28, k });
  });
}

// ------------------------------------------------------------ hole 0: why the suffix

function drawWhy(ctx, t, T, G, Lc) {
  const u = prog(t, T.why - 0.3, 0.2) * (1 - prog(t, T.h1 - 0.7, 0.4));
  if (u <= 0.001) return;
  const r = M.scan.strings[0];
  const list = [
    { text: r.attrName, color: SYN.attr },
    { text: M.suffix, color: B[0] },
    ...[...r.s.slice(r.attrNameEndIndex)].map((ch, n) => ({ text: ch, color: charColor(0, r.attrNameEndIndex + n) })),
    ...markerIn(B[0]),
    { text: M.strings[1][0], color: charColor(1, 0) },
  ];
  const size = 40, adv = monoAdvance(ctx, size, WT);
  const w = piecesLen(list) * adv;
  const x = 960 - w / 2, y = DY - 20;
  const src = Lc.chars[0][r.attrNameEndIndex - r.attrName.length];
  const fly = prog(t, T.why - 0.3, 0.85);
  withAlpha(ctx, u, () => {
    // the suffix glows on "easy to find"
    const g = pulse(t, T.easy, 1.4);
    const sx = x + r.attrName.length * adv;
    if (g > 0 && fly >= 1) withAlpha(ctx, g, () => fillRR(ctx, sx - 4, y - size * 0.72, M.suffix.length * adv + 8, size * 1.44, 8, rgba(B[0], 0.25)));
    flyPieces(ctx, list, { x: G.X(src.col), y: G.Y(src.line), size: G.size }, { x, y, size }, fly, -50);
    text(ctx, "easy to find later", 960, y + 78, { font: sans(30, 600), color: C.text, align: "center", baseline: "middle", alpha: prog(t, T.easy, 0.4) });
    text(ctx, "and not a real class attribute", 960, y + 128, { font: sans(30, 600), color: C.text2, align: "center", baseline: "middle", alpha: prog(t, T.never, 0.4) });
  });
}

// ------------------------------------------------------------ hole 1: a processing instruction, parsed as a comment

function drawPI(ctx, t, T, G, Lc) {
  const u = prog(t, T.syntax - 0.3, 0.2) * (1 - prog(t, T.h2 + 0.55, 0.45));
  if (u <= 0.001) return;
  const size = 40, adv = monoAdvance(ctx, size, WT);
  const nm = M.nodeMarker;                         // <?lit$…$>
  const y = DY - 20;
  const piX = 560 - (nm.length * adv) / 2;
  const h = Lc.holes[1];
  withAlpha(ctx, u, () => {
    flyPieces(ctx, [
      { text: nm.slice(0, 2), color: B[1] },
      ...markerIn(B[1]),
      { text: nm.at(-1), color: B[1] },
    ], { x: G.X(h.col), y: G.Y(h.line), size: G.size }, { x: piX, y, size }, prog(t, T.syntax - 0.3, 0.85), 60);
    const lu = prog(t, T.processing, 0.4);
    text(ctx, "processing instruction", 560, y + 70, { font: sans(30, 650), color: C.text, align: "center", baseline: "middle", alpha: lu });
    text(ctx, "not supported in HTML", 560, y + 112, { font: sans(24, 500), color: C.text3, align: "center", baseline: "middle", alpha: prog(t, T.unsupported, 0.4) });

    // → the parser → a comment
    const au = prog(t, T.bogus, 0.55);
    const cm = `<!--${nm.slice(1, -1)}-->`;          // <!--?lit$…$-->
    const cmX = 1370 - (cm.length * adv) / 2;
    if (au > 0) {
      const a0 = { x: piX + nm.length * adv + 30, y }, a1 = { x: cmX - 30, y };
      arrow(ctx, a0, a1, { color: C.text3, width: 3, progress: au });
      text(ctx, "HTML parser", (a0.x + a1.x) / 2, y - 34, { font: sans(22, 600), color: C.text3, align: "center", baseline: "middle", alpha: au });
    }
    const cu = prog(t, T.comment, 0.45, ease.outBack);
    if (cu > 0) {
      withAlpha(ctx, clamp(cu), () => withScale(ctx, lerp(0.7, 1, cu), 1370, y, () => {
        monoPieces(ctx, [
          { text: cm.slice(0, 5), color: DOMC.comment },
          { text: nm.slice(2, -1), color: DOMC.comment },
          { text: cm.slice(-3), color: DOMC.comment },
        ], cmX, y, size);
      }));
      const ru = prog(t, T.comment + 0.35, 0.4);
      ring(ctx, { x: cmX, y: y - size * 0.62, w: cm.length * adv, h: size * 1.24, r: 8, color: GOLD, u: ru * (0.8 + 0.2 * Math.sin(t * 4)), pad: 9 });
      text(ctx, "a comment", 1370, y + 70, { font: sans(30, 650), color: C.text, align: "center", baseline: "middle", alpha: ru });
      text(ctx, "mystery comment #2", 1370, y + 112, { font: sans(24, 600), color: GOLD, align: "center", baseline: "middle", alpha: prog(t, T.comment + 0.8, 0.4) });
    }

    // "a few bytes shorter": <?…> vs <!--…-->
    const su = prog(t, T.short, 0.45);
    if (su > 0) {
      const a34 = monoAdvance(ctx, 34, WT);
      const pi = [{ text: nm.slice(0, 2), color: B[1] }, { text: "…", color: C.text3 }, { text: nm.at(-1), color: B[1] }];
      const co = [{ text: "<!--", color: DOMC.comment }, { text: "…", color: C.text3 }, { text: "-->", color: DOMC.comment }];
      const vs = measure(ctx, "  vs  ", sans(28, 500));
      const tail = "   4 bytes shorter";
      const tw = measure(ctx, tail, sans(30, 700));
      const total = (piecesLen(pi) + piecesLen(co)) * a34 + vs + tw;
      let x = 960 - total / 2;
      const yy = y + 178;
      withAlpha(ctx, su, () => {
        x += monoPieces(ctx, pi, x, yy, 34);
        x += text(ctx, "  vs  ", x, yy, { font: sans(28, 500), color: C.text3, baseline: "middle" });
        x += monoPieces(ctx, co, x, yy, 34);
        text(ctx, tail, x, yy, { font: sans(30, 700), color: C.ok, baseline: "middle" });
      });
    }
  });
}

// ------------------------------------------------------------ attrNames (small print)

function drawAttrNames(ctx, t, T) {
  const u = prog(t, T.name + 0.25, 0.45) * (1 - prog(t, T.marker - 0.25, 0.4));
  if (u <= 0.001) return;
  const names = M.scan.attrNames;
  const size = 26, adv = monoAdvance(ctx, size, 500);
  const x0 = 70, y = 1010;
  const in2 = prog(t, T.attrSuffix + 0.35, 0.45, ease.outCubic);
  withAlpha(ctx, u, () => {
    let n = 0;
    const put = (s, color, a = 1) => { text(ctx, s, x0 + n * adv, y, { font: mono(size, 500), color, baseline: "middle", alpha: a }); n += s.length; };
    put("attrNames = [", C.text3);
    put(`'${names[0]}'`, B[0]);
    const n0 = n;
    put(", ", C.text3, in2);
    put(`'${names[1]}'`, B[2], in2);
    n = lerp(n0, n, in2);
    put("]", C.text3);
  });
}

// ------------------------------------------------------------ the marker itself

let SRC = null;
const srcLine = () => (SRC ??= new Code("const marker = `lit$${Math.random().toFixed(9).slice(2)}$`;", { size: 26 }));

function drawCloseUp(ctx, t, T) {
  const u = prog(t, T.marker + 0.2, 0.6) * (1 - prog(t, T.settle - 0.15, 0.45));
  if (u <= 0.001) return;
  const m = M.marker;                                   // lit$480592716$
  const parts = [m.slice(0, 3), m[3], m.slice(4, -1), m.at(-1)];
  const size = 84, adv = monoAdvance(ctx, size, 600);
  const gap = 26 * u;
  const w = m.length * adv + gap * 3;
  const y = 690 + 16 * (1 - u);
  let x = 960 - w / 2;
  const xs = parts.map((p) => { const a = x; x += p.length * adv + gap; return a; });
  const hl = [prog(t, T.mLit, 0.35), prog(t, T.mDollar, 0.35), prog(t, T.mRandom, 0.35), prog(t, T.mDollar, 0.35)];
  withAlpha(ctx, u, () => {
    parts.forEach((p, n) => {
      const color = n === 2 ? rgba(C.text, 0.8) : C.text;
      const g = hl[n];
      if (g > 0) withAlpha(ctx, g, () => fillRR(ctx, xs[n] - 8, y - size * 0.66, p.length * adv + 16, size * 1.32, 12, rgba(C.accent, 0.16)));
      text(ctx, p, xs[n], y, { font: mono(size, 600), color, baseline: "middle" });
    });
    const ly = y + 92;
    text(ctx, "the word lit", xs[0] + (parts[0].length * adv) / 2, ly, { font: sans(28, 600), color: C.text2, align: "center", baseline: "middle", alpha: hl[0] });
    text(ctx, "a random number", xs[2] + (parts[2].length * adv) / 2, ly, { font: sans(28, 600), color: C.text2, align: "center", baseline: "middle", alpha: hl[2] });
    // "between dollar signs"
    const d0 = xs[1] + adv / 2, d1 = xs[3] + adv / 2;
    bracket(ctx, d0, d1, y - size * 0.78, C.accent, hl[1], false, 14);
    text(ctx, "between dollar signs", (d0 + d1) / 2, y - size * 0.78 - 34, { font: sans(28, 600), color: C.text2, align: "center", baseline: "middle", alpha: hl[1] });

    // picked once
    const ou = prog(t, T.once, 0.45);
    if (ou > 0) {
      text(ctx, "random, picked once per page load", 960, y + 180, { font: sans(34, 650), color: C.text, align: "center", baseline: "middle", alpha: ou });
      const code = srcLine();
      const cw = code.width(ctx);
      withAlpha(ctx, prog(t, T.once + 0.5, 0.45) * 0.9, () => code.draw(ctx, 960 - cw / 2, y + 222));
    }
  });
}
