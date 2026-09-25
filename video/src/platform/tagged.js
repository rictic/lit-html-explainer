// tagged: tagged template literals as the engine sees them. The engine's
// parse has already split the counter's literal into fixed strings and
// expressions; ECMA-262 promises one frozen strings array per literal,
// passed on every run; lit-html uses that array as its cache key, and needs
// no build step. The array's `raw` property is lit-html's proof that the
// strings came from a literal (trustFromTemplateString), so data from JSON
// can't pose as a template; and values never go through the HTML parser.
//
// The strings array is the scene's one continuous object: made by the split,
// it moves up under the spec card, up again as the cache key, down to meet
// its `raw` twin, and (both, shrunk) to the top for lit-html's trust check;
// then it gives way to the values stage.

import { B, C, DOMC, SYN, rgba } from "../kit/theme.js";
import { KIND_COLOR, Code } from "../kit/code.js";
import { OBJ, cacheTable, literalText, stringsArray } from "../kit/lit.js";
import { arrow, check, cross, fillRR, measure, mono, monoAdvance, panel, sans, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { card } from "../kit/objects.js";
import { devtools } from "../kit/browser.js";
import { Tree } from "../kit/tree.js";
import { platformTruth, truth } from "../timing.js";
import { clamp, ease, lerp, mix, prog, pulse, window } from "../util.js";
import { blendHex, cable, drawKey, smooth } from "../scenes/literal-draw.js";
import { PLAT, apiChip, browserGlyph, evalBadge, platformTag, specCard } from "./intro-platform.js";
import { arc, drawCodeAt, drawRun, lockGlyph, plate, rectAt, splitGeo } from "./tagged-split.js";

export const transition = "fade";

// ------------------------------------------------------------- the data

// ECMA-262 §13.2.8.4, GetTemplateObject: Note 2, as quoted in docs/PLATFORM.md.
const NOTE = "Each TemplateLiteral in the program code of a realm is associated with a unique template object that is used in the evaluation of tagged Templates. The template objects are frozen and the same template object is used each time a specific tagged Template is evaluated.";
const NOTE_HL = [
  "Each TemplateLiteral in the program code of a realm is associated with a unique template object",
  "The template objects are frozen",
  "the same template object is used each time a specific tagged Template is evaluated.",
];

// lit-html.ts: trustFromTemplateString, without its opening comment, and with
// the DEV_MODE message folded (as an editor folds a block).
const TRUST_SRC = `function trustFromTemplateString(
  tsa: TemplateStringsArray,
  stringFromTSA: string
): TrustedHTML {
  if (!isArray(tsa) || !tsa.hasOwnProperty('raw')) {
    let message = 'invalid template strings array';
    if (DEV_MODE) {…}
    throw new Error(message);
  }
  return policy !== undefined
    ? policy.createHTML(stringFromTSA)
    : (stringFromTSA as unknown as TrustedHTML);
}`;
// lit-html.ts, ChildPart._$getTemplate
const LOOKUP_SRC = "let template = templateCache.get(result.strings);";
// truth/platform.js: the result made from JSON, which lit-html refuses
const JSON_TEXT = '{"_$litType$": 1, "strings": ["<b>hi</b>"], "values": []}';
// truth/platform.js: a value that looks like markup
const TEXT_CALL = 'render(html`<p>${"<img src=x onerror=alert(1)>"}</p>`, box);';
// truth/platform.js: two literals with the same text
const TWO_LITERALS = "const f = (x) => tag`<p>${x}</p>`;\nconst g = (x) => tag`<p>${x}</p>`;";
// truth/platform.js: a literal with an escape
const ESC_SRC = "tag`<p>a\\tb</p>`";

// ------------------------------------------------------------ the layout

const LIT = 32;                                   // the literal, in focus
const ARR = 26;                                   // strings arrays
const EXP = 26;                                   // expressions rows
const LIT_Y = 196;                                // top of the literal's code, stage 1
const ARR_Y = { split: 604, spec: 452, key: 200, raw: 330 };
const EXP_Y = { split: 772, key: 352 };
const LIT_CTX = { x: 76, y: 752, k: 0.625 };      // the literal as context (spec)
const CARD = { x: 110, y: 56, w: 1700 };
const CALLS = [{ x: 1150, label: "counter(0)" }, { x: 1520, label: "counter(1)" }];
const CALL_Y = 606;
const FLOW_Y = 640;                               // centre line of the build-step flow
const TRUST = { x: 848, y: 250, size: 28 };       // x: its place once the JSON result arrives
const CONSOLE = { x: 60, y: 900, w: 1800, h: 126 };
const BLOCK = { k: 0.78, y: 76 };                 // the arrays shrink to the top for the trust check

const GOLD = OBJ.cache;
const FR = 14; // frame padding round an array

let CACHE = null;
function objects() {
  if (CACHE) return CACHE;
  const P = platformTruth().tagged;
  const trust = new Code(TRUST_SRC, { size: TRUST.size, lineHeight: 1.5 });
  const lookup = new Code(LOOKUP_SRC, { size: 28 });
  const two = new Code(TWO_LITERALS, { size: 23 });
  const esc = new Code(ESC_SRC, { size: 36 });
  const call = new Code(TEXT_CALL, { size: 30 });
  const fake = JSON.parse(JSON_TEXT);
  // the text value's DOM: the box, with render()'s root part comment; the <p>
  // holds its child part's marker comment and a text node (truth `textValue`:
  // childNodes [8, 3], its text, and no <img> anywhere)
  const [c0, c1] = P.textValue.childNodes;
  if (c0 !== 8 || c1 !== 3) console.warn("tagged: textValue childNodes changed", P.textValue.childNodes);
  const pNode = { type: "element", name: "p", attrs: [], children: [
    { type: "comment", data: "?" + platformTruth().parser.marker },
    { type: "text", data: P.textValue.text },
  ] };
  const box = { type: "element", name: "div", attrs: [], children: [{ type: "comment", data: "" }, pNode] };
  const tree = new Tree(box, { size: 28, whitespace: "hide", inline: false });
  CACHE = { P, trust, lookup, two, esc, call, fake, tree };
  return CACHE;
}

// Timing: every beat from the narration.
function times(S) {
  const w = (i, s, n) => S.word(i, s, n);
  return {
    js: S.m("js"), engine: S.m("engine"), parses: w(0, "parses"), tagged: w(0, "tagged"),
    split: w(0, "split"), fixed: w(0, "fixed"), strings: w(0, "strings"), exprs: w(0, "expressions"),
    spec: S.m("spec"), promise: w(0, "promise"),
    once: S.m("once"), exactly: w(0, "exactly"),
    frozen: S.m("frozen"), created: w(0, "created"), frozenW: w(0, "frozen"),
    same: S.m("same"), sameW: w(0, "same"), arrayW: w(0, "array", 1), passed: w(0, "passed"), every: w(0, "every"), that: w(0, "that"),
    key: S.m("key"), thatArray: w(1, "array"), lits: w(1, "html's"), cache: w(1, "cache"), free: w(1, "free"),
    nobuild: S.m("nobuild"), build: w(1, "build"),
    already: S.m("already"), separated: w(1, "separated"), never: w(1, "never"), what2: w(1, "what", 1),
    raw: S.m("raw"), feature: w(2, "feature"), rawW: w(2, "raw"), exactly2: w(2, "exactly"),
    trust: S.m("trust"), trusted: w(2, "trusted"), checks: w(2, "checks"), raw2: w(2, "raw", 1),
    json: S.m("json"), jsonW: w(2, "json"), cant: w(2, "can't"), data: w(2, "data"),
    values: S.m("values"), never2: w(3, "never"), text: S.m("text"), nodes: w(3, "nodes"),
    attrs: S.m("attrs"), safe: S.m("safe"), markup: w(3, "markup"),
    purpose: w(3, "purpose"), unsafe: w(3, "unsafe"),
  };
}

// A value that moves through a list of stops: [[at, value, dur]].
function steps(t, v0, list) {
  let v = v0;
  for (const [at, v1, dur = 0.8] of list) v = lerp(v, v1, prog(t, at, dur));
  return v;
}

// Runs fn with the stage-4 shrink of the arrays applied.
function inBlock(ctx, t, T, fn) {
  const u = prog(t, T.trust - 0.7, 0.8);
  if (u <= 0) return fn();
  const k = lerp(1, BLOCK.k, u);
  ctx.save();
  ctx.translate(960, lerp(ARR_Y.raw, BLOCK.y, u));
  ctx.scale(k, k);
  ctx.translate(-960, -ARR_Y.raw);
  fn();
  ctx.restore();
}

export function draw(F, S) {
  const { ctx, t } = F;
  const T = times(S);
  const O = objects();
  const g = splitGeo(ctx, LIT);

  const SG0 = stringsArray(ctx, { x: 0, y: 0, size: ARR, alpha: 0 });
  const arr = {
    x: 960 - SG0.w / 2,
    y: steps(t, ARR_Y.split, [[T.spec - 0.35, ARR_Y.spec, 0.9], [T.key - 0.35, ARR_Y.key, 0.9], [T.raw - 0.4, ARR_Y.raw, 0.9]]),
    w: SG0.w, h: SG0.h,
  };
  const L = { T, O, g, arr };

  drawOpening(ctx, t, L);
  drawSpec(ctx, t, L);
  drawKeyStage(ctx, t, L);
  drawTrust(ctx, t, L);
  inBlock(ctx, t, T, () => {
    drawRawRow(ctx, t, L);
    drawArray(ctx, t, L);
  });
  drawEscape(ctx, t, L);
  drawJson(ctx, t, L);
  drawValues(ctx, t, L);
}

// =================================================== 1. js / engine: the split

function literalPanel(ctx, g) {
  const cw = g.code.width(ctx);
  const x = 960 - cw / 2, y = LIT_Y;
  return { code: { x, y, k: 1 }, panel: { x: x - 50, y: y - 44 - 24, w: cw + 100, h: g.code.height + 44 + 24 + 26 } };
}

// An expressions row: three chips, centred, at y.
function exprChips(ctx, g, y) {
  const a = monoAdvance(ctx, EXP, 500), pad = 18, gap = 26, h = EXP * 1.9;
  const ws = g.exprs.map((e) => e.len * a + pad * 2);
  const total = ws.reduce((n, w) => n + w, 0) + gap * 2;
  let x = 960 - total / 2;
  return ws.map((w) => {
    const r = { x, y, w, h };
    x += w + gap;
    return r;
  });
}
function drawExprChip(ctx, g, k, r) {
  const ex = g.exprs[k];
  fillRR(ctx, r.x, r.y, r.w, r.h, 9, C.panel2);
  fillRR(ctx, r.x, r.y, r.w, r.h, 9, rgba(B[k], 0.1));
  strokeRR(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 9, rgba(B[k], 0.6), 2);
  drawRun(ctx, ex.toks, ex.col, r.x + 18, r.y + r.h / 2 + 1, EXP, (tok) => KIND_COLOR[tok.kind]);
}

function drawOpening(ctx, t, L) {
  const { T, g } = L;
  const code = g.code;
  const { code: LP0, panel: PB } = literalPanel(ctx, g);
  const out = prog(t, T.spec - 0.45, 0.55);                       // the literal leaves for the spec card
  const litA = prog(t, T.js - 0.9, 0.6) * (1 - out);
  const dy = -30 * ease.inCubic(out);
  const LP = { ...LP0, y: LP0.y + dy };
  const flyS = [0, 1, 2, 3].map((i) => clamp((t - (T.fixed - 0.4 + i * 0.12)) / 1.0));
  const flyV = [0, 1, 2].map((k) => clamp((t - (T.exprs - 0.55 + k * 0.12)) / 1.0));
  const chips = exprChips(ctx, g, EXP_Y.split);
  const A = (s) => monoAdvance(ctx, s, 500);

  if (litA > 0) {
    const py = PB.y + dy;
    withAlpha(ctx, litA, () => panel(ctx, { x: PB.x, y: py, w: PB.w, h: PB.h, title: "counter.js", accent: SYN.fn }));
    // the JavaScript engine: a platform tag over the panel's corner
    const eu = prog(t, T.engine - 0.2, 0.45, ease.outBack);
    if (eu > 0) {
      const tx = PB.x + PB.w, ty = py - 60;
      withAlpha(ctx, litA * clamp(eu), () => withScale(ctx, lerp(0.85, 1, eu), tx - 120, ty + 22, () =>
        platformTag(ctx, { x: tx, y: ty, h: 46, text: "JavaScript engine", align: "right", font: sans(25, 650), glow: pulse(t, T.parses - 0.2, 1.5) })));
    }
    // the engine parses it: a scan line runs down the code
    const su = clamp((t - (T.parses - 0.15)) / 1.5);
    if (su > 0 && su < 1) {
      const y = LP.y + su * code.height;
      withAlpha(ctx, litA * Math.sin(Math.PI * su), () => {
        const gr = ctx.createLinearGradient(0, y - 44, 0, y + 6);
        gr.addColorStop(0, rgba(PLAT, 0));
        gr.addColorStop(1, rgba(PLAT, 0.2));
        ctx.fillStyle = gr;
        ctx.fillRect(PB.x + 8, y - 44, PB.w - 16, 50);
        ctx.fillStyle = rgba(PLAT, 0.8);
        ctx.fillRect(PB.x + 8, y + 4, PB.w - 16, 2);
      });
    }
    // binding washes, outlined as the split begins
    const hot = window(t, T.split - 0.35, T.exprs + 0.2, 0.35, 0.4);
    for (let k = 0; k < 3; k++) {
      const e = g.exprs[k];
      const r = rectAt(ctx, code, LP, e.line, e.col - 2, e.len + 3);
      const gone = flyV[k] > 0 ? 0.3 : 1;
      withAlpha(ctx, litA, () => {
        fillRR(ctx, r.x - 3, r.y, r.w + 6, r.h, 7, rgba(B[k], (0.14 + 0.08 * hot) * gone));
        if (hot > 0) withAlpha(ctx, hot * gone, () => strokeRR(ctx, r.x - 3, r.y, r.w + 6, r.h, 7, rgba(B[k], 0.8), 2));
      });
    }
    // tagged template literal: html and the backticks, underlined
    const tagU = window(t, T.tagged - 0.25, T.split + 0.2, 0.4, 0.5);
    const hr = (() => { const h = code.find("html"); return rectAt(ctx, code, LP, h.line, h.col, h.len); })();
    if (tagU > 0) withAlpha(ctx, tagU * litA, () => fillRR(ctx, hr.x - 5, hr.y, hr.w + 8, hr.h, 7, rgba(C.accent, 0.2)));
    const brightS = window(t, T.split - 0.35, T.fixed + 0.3, 0.35, 0.3);
    drawCodeAt(ctx, code, LP, (tok) => {
      const r = g.role.get(tok);
      let a = 1, color;
      if (r.kind === "head") a = 0.5;
      else if (r.kind === "static") {
        a = flyS[r.i] > 0 ? 0.16 : 1;
        if (brightS > 0 && flyS[r.i] <= 0) color = blendHex(KIND_COLOR[tok.kind], C.white, brightS * 0.7);
      } else if (r.kind === "expr") a = flyV[r.k] > 0 ? 0.16 : 1;
      else if (r.kind === "delim") color = B[r.k];
      else if (r.kind === "tick" && tagU > 0) return { alpha: litA, color: blendHex(SYN.punct, C.white, tagU), weight: 700 };
      else if (r.kind === "tag" && tagU > 0) return { alpha: litA, color: blendHex(SYN.fn, C.white, tagU) };
      return { alpha: a * litA, color };
    });
    const bar = (r, u, inset) => withAlpha(ctx, u * litA, () => withGlow(ctx, rgba(C.accent, 0.9), 12, () =>
      fillRR(ctx, r.x + inset, r.y + r.h - 1, r.w - 2 * inset, 4, 2, C.accent)));
    if (tagU > 0) {
      bar(hr, tagU, 1);
      for (let n = 0; n < 2; n++) {
        const b = code.find("`", n);
        bar(rectAt(ctx, code, LP, b.line, b.col, b.len), tagU, 4);
      }
      const b = code.find("`", 0);
      const r = rectAt(ctx, code, LP, b.line, b.col, b.len);
      text(ctx, "tagged template literal", r.x + r.w + 36 + 16 * (1 - ease.outCubic(clamp(tagU))), r.y + r.h / 2 + 1,
        { font: sans(32, 650), color: C.accent, baseline: "middle", alpha: tagU * litA });
    }
  }

  // ---- flights: the fixed strings, down into the strings array
  const SG = stringsArray(ctx, { x: L.arr.x, y: ARR_Y.split, size: ARR, alpha: 0 });
  const aS = A(ARR);
  for (let i = 3; i >= 0; i--) {
    const u = flyS[i];
    if (u <= 0 || u >= 1) continue;
    const e = ease.inOutCubic(u);
    const c = SG.cells[i];
    const x0 = c.x + (c.w - literalText(g.strings[i]).length * aS) / 2;
    const ty = c.y + c.h / 2 + 1;
    withAlpha(ctx, smooth(0.62, 1, u), () => {
      fillRR(ctx, c.x, c.y, c.w, c.h, 9, C.panel2);
      strokeRR(ctx, c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1, 9, C.border, 1.2);
    });
    for (const d of g.dims[i]) text(ctx, d.text, x0 + d.off * aS, ty, { font: mono(ARR, 500), color: C.text3, baseline: "middle", alpha: smooth(0.8, 1, u) });
    for (const f of g.frags[i]) {
      const src = { x: LP0.x + f.col * A(LIT), y: LP0.y + (code.baseline(0, f.line) - g.mid * code.size) };
      const dst = { x: x0 + f.off * aS, y: ty };
      const p = arc(src, dst, e, (dst.x - src.x) * 0.1);
      const size = lerp(LIT, ARR, e);
      const w = f.len * A(size), h = size * 1.5, px = size * 0.32;
      const lead = (code.lines[f.line].slice(f.col).match(/^ */)[0].length) * A(size);
      plate(ctx, p.x + lead - px, p.y - h / 2, w - lead + 2 * px, h, { alpha: smooth(0, 0.12, u) * (1 - smooth(0.75, 1, u)), stroke: rgba(C.text3, 0.5) });
      drawRun(ctx, f.toks, f.col, p.x, p.y, size, (tok) => blendHex(KIND_COLOR[tok.kind], C.text, smooth(0.1, 0.8, u)));
    }
  }

  // ---- flights: the expressions, down into their row; then the row itself
  const rowA = 1 - prog(t, T.spec - 0.45, 0.5);
  for (let k = 2; k >= 0; k--) {
    const u = flyV[k];
    if (u <= 0) continue;
    const cell = chips[k];
    if (u >= 1) {
      withAlpha(ctx, rowA, () => drawExprChip(ctx, g, k, cell));
      continue;
    }
    const ex = g.exprs[k];
    const e = ease.inOutCubic(u);
    const sr = rectAt(ctx, code, LP0, ex.line, ex.col, ex.len);
    const pad = 12;
    const from = { x: sr.x - pad, y: sr.y - 2, w: sr.w + 2 * pad, h: sr.h + 4 };
    const box = mix(from, cell, e);
    const ctr0 = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    const ctr1 = { x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 };
    const pc = arc(ctr0, ctr1, e, (ctr1.x - ctr0.x) * -0.1);
    box.x = pc.x - box.w / 2;
    box.y = pc.y - box.h / 2;
    const boxA = smooth(0, 0.15, u);
    plate(ctx, box.x, box.y, box.w, box.h, { fill: C.panel2, alpha: boxA });
    withAlpha(ctx, boxA, () => {
      fillRR(ctx, box.x, box.y, box.w, box.h, 9, rgba(B[k], 0.1));
      strokeRR(ctx, box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1, 9, rgba(B[k], 0.6), 2);
    });
    const size = lerp(LIT, EXP, e);
    drawRun(ctx, ex.toks, ex.col, pc.x - (ex.len * A(size)) / 2, pc.y + 1, size, (tok) => KIND_COLOR[tok.kind]);
  }
  const lab = sans(28, 600);
  const labS = prog(t, T.strings - 0.25, 0.4) * (1 - prog(t, T.spec - 0.45, 0.4));
  text(ctx, "fixed strings", SG.x - 4, ARR_Y.split - FR - 22, { font: lab, color: C.text2, alpha: labS });
  const labE = prog(t, T.exprs - 0.1, 0.4) * rowA;
  text(ctx, "expressions", chips[0].x - 4, EXP_Y.split - 24, { font: lab, color: C.text2, alpha: labE });
}

// ================================================ the strings array (all stages)

function drawArray(ctx, t, L) {
  const { T, arr } = L;
  const inU = prog(t, T.fixed - 0.55, 0.4);
  const outU = prog(t, T.values - 0.45, 0.5);
  const a = inU * (1 - outU);
  if (a <= 0) return;
  const landed = [0, 1, 2, 3].map((i) => (t >= T.fixed - 0.4 + i * 0.12 + 1.0 ? 1 : 0));
  const SG = stringsArray(ctx, { x: arr.x, y: arr.y, size: ARR, alpha: 0 });

  // glows: accent when the same array comes back and when "that array" is
  // named; gold as the cache key; white for "never changes"; lime when raw is checked
  const sameG = Math.max(pulse(t, T.every - 0.3, 1.4), pulse(t, T.thatArray - 0.2, 1.1), pulse(t, T.feature - 0.3, 1.2));
  const keyG = window(t, T.cache - 0.25, T.raw - 0.4, 0.45, 0.4);
  const neverG = pulse(t, T.never - 0.25, 1.6);
  const rawG = window(t, T.checks - 0.2, T.json - 0.2, 0.4, 0.4);
  withAlpha(ctx, a, () => {
    fillRR(ctx, SG.x - FR, SG.y - FR, SG.w + 2 * FR, SG.h + 2 * FR, 14, rgba(C.panel, 0.55));
    strokeRR(ctx, SG.x - FR + 0.5, SG.y - FR + 0.5, SG.w + 2 * FR - 1, SG.h + 2 * FR - 1, 14, rgba(C.border2, 0.7), 1.5);
    const glow = (u, color) => {
      if (u <= 0) return;
      withAlpha(ctx, u, () => withGlow(ctx, rgba(color, 0.9), 26, () =>
        strokeRR(ctx, SG.x - FR, SG.y - FR, SG.w + 2 * FR, SG.h + 2 * FR, 14, rgba(color, 0.85), 2.5)));
    };
    glow(sameG, C.accent);
    glow(keyG * (1 - neverG), GOLD);
    glow(neverG, C.white);
    glow(rawG * 0.6, PLAT);
    SG.cells.forEach((c, i) => {
      if (landed[i]) return;
      ctx.save();
      ctx.setLineDash([7, 7]);
      strokeRR(ctx, c.x + 1, c.y + 1, c.w - 2, c.h - 2, 9, rgba(C.text3, 0.55), 1.5);
      ctx.restore();
    });
    stringsArray(ctx, { x: arr.x, y: arr.y, size: ARR, cellAlpha: landed });
  });

  // label: "strings", and the spec's name for it
  const labU = prog(t, T.spec + 0.2, 0.5) * a;
  const lf = sans(28, 600);
  text(ctx, "strings", SG.x - 4, SG.y - FR - 22, { font: lf, color: C.text2, alpha: labU });
  const tagU = prog(t, T.once + 0.9, 0.45, ease.outCubic) * (1 - prog(t, T.key - 0.4, 0.4));
  if (tagU > 0) {
    const lw = measure(ctx, "strings", lf);
    withAlpha(ctx, tagU * a, () => platformTag(ctx, { x: SG.x + lw + 18, y: SG.y - FR - 22 - 29, h: 40, text: "template object", glyph: "doc", font: sans(23, 650) }));
  }

  // the lock: frozen, from the spec beat on
  const lk = prog(t, T.frozenW - 0.3, 0.5, ease.outBack);
  if (lk > 0) {
    const cx = SG.x + SG.w + FR + 38, cy = SG.y + SG.h / 2;
    const glowU = pulse(t, T.frozenW - 0.1, 1.2);
    const shut = prog(t, T.frozenW - 0.05, 0.35);
    withAlpha(ctx, clamp(lk) * a, () => withScale(ctx, lerp(0.6, 1, clamp(lk)), cx, cy, () => {
      if (glowU > 0) withGlow(ctx, rgba(C.white, 0.8 * glowU), 20 * glowU, () => lockGlyph(ctx, cx, cy - 4, 1, C.text, shut));
      else lockGlyph(ctx, cx, cy - 4, 1, C.text, shut);
    }));
  }

  // the cache key tag (episode 1's), over the array's right end
  const keyU = prog(t, T.cache - 0.3, 0.5, ease.outBack) * (1 - prog(t, T.raw - 0.45, 0.4));
  if (keyU > 0) {
    const f = sans(26, 650), h = 48;
    const w = 18 + 48 + 14 + measure(ctx, "cache key", f) + 20;
    const x = SG.x + SG.w - w, y = SG.y - FR - h - 14;
    withAlpha(ctx, clamp(keyU) * a, () => withScale(ctx, clamp(keyU, 0, 1.2), x + w / 2, y + h, () => {
      fillRR(ctx, x, y, w, h, h / 2, rgba(GOLD, 0.12));
      strokeRR(ctx, x + 1, y + 1, w - 2, h - 2, h / 2 - 1, rgba(GOLD, 0.75), 2);
      drawKey(ctx, x + 18 + 10, y + h / 2, 0.95, GOLD);
      text(ctx, "cache key", x + 18 + 48 + 14, y + h / 2 + 1, { font: f, color: GOLD, baseline: "middle" });
    }));
  }

  // "never changes", centred over the array
  const nv = window(t, T.never - 0.3, T.raw - 0.45, 0.4, 0.4);
  if (nv > 0) text(ctx, "never changes", SG.x + SG.w / 2, SG.y - FR - 30, { font: sans(30, 700), color: C.text, align: "center", baseline: "middle", alpha: nv * a });
}

// ============================================ 2. spec / once / frozen / same

function drawSpec(ctx, t, L) {
  const { T, O, g, arr } = L;
  const cin = prog(t, T.spec - 0.25, 0.7, ease.outCubic);
  const cout = prog(t, T.key - 0.45, 0.5, ease.inCubic);
  const ca = cin * (1 - cout);
  if (ca > 0) {
    const settle = (on, next) => on * (1 - 0.62 * next);
    const hl = [
      Math.max(settle(prog(t, T.once - 0.1, 0.6), prog(t, T.frozen - 0.2, 0.5)), 0.9 * pulse(t, T.created - 0.15, 1.1)),
      settle(prog(t, T.frozenW - 0.4, 0.5), prog(t, T.same - 0.15, 0.5)),
      prog(t, T.sameW - 0.2, 0.6),
    ];
    const wipe = [prog(t, T.once - 0.1, 0.8), prog(t, T.frozenW - 0.4, 0.5), prog(t, T.sameW - 0.2, 0.9)];
    specCard(ctx, {
      x: CARD.x, y: CARD.y - 36 * (1 - cin) - 40 * cout, w: CARD.w, alpha: ca,
      source: "ECMA-262", section: "13.2.8.4", title: "GetTemplateObject ( templateLiteral )", label: "Note 2",
      quote: NOTE, size: 31, glow: pulse(t, T.promise - 0.2, 1.3) * 0.8,
      hl: NOTE_HL.map((s, i) => ({ text: s, u: hl[i], wipe: wipe[i] })),
    });
  }

  const out = prog(t, T.key - 0.45, 0.5);
  const bottom = arr.y + arr.h + FR;

  // once: the literal (small, lower left) and its one array
  const lu = prog(t, T.once - 0.35, 0.5, ease.outCubic) * (1 - out);
  if (lu > 0) {
    drawCodeAt(ctx, g.code, { ...LIT_CTX, y: LIT_CTX.y + 16 * (1 - lu) }, (tok) => {
      const r = g.role.get(tok);
      if (r.kind === "delim") return { color: B[r.k], alpha: 0.9 };
      if (r.kind === "head") return { alpha: 0.5 };
      return { alpha: 0.9 };
    }, lu);
    const b = g.code.find("`", 0);
    const r = rectAt(ctx, g.code, LIT_CTX, b.line, b.col, b.len);
    const from = { x: r.x + r.w / 2, y: r.y - 12 }, to = { x: r.x + r.w / 2, y: bottom + 10 };
    const glowU = pulse(t, T.created - 0.1, 1.2);
    withAlpha(ctx, 1 - out, () => {
      arrow(ctx, from, to, { color: C.text2, width: 3, progress: prog(t, T.once + 0.25, 0.6), head: 13, glow: glowU });
      const tu = prog(t, T.exactly - 0.2, 0.45, ease.outCubic);
      text(ctx, "one array per literal", from.x + 26 + 12 * (1 - tu), (from.y + to.y) / 2, { font: sans(30, 650), color: C.text, baseline: "middle", alpha: tu });
    });
  }

  // same: counter(0), counter(1), both pointing at the one array
  const callT = [T.sameW - 0.35, T.arrayW - 0.1];
  CALLS.forEach((c, n) => {
    const u = prog(t, callT[n], 0.45, ease.outBack) * (1 - out);
    if (u <= 0) return;
    const f = mono(30, 550);
    const w = measure(ctx, c.label, f) + 40, h = 56;
    const x = c.x - w / 2, y = CALL_Y;
    withAlpha(ctx, clamp(u), () => withScale(ctx, lerp(0.8, 1, clamp(u)), c.x, y + h / 2, () => {
      fillRR(ctx, x, y, w, h, 12, C.panel2);
      strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 12, C.border2, 1.5);
      text(ctx, c.label, c.x, y + h / 2 + 1, { font: f, color: C.text, align: "center", baseline: "middle" });
    }));
    const au = prog(t, callT[n] + 0.25, 0.55);
    withAlpha(ctx, 1 - out, () => arrow(ctx, { x: c.x, y: y - 10 }, { x: c.x + (n === 0 ? -40 : 40), y: bottom + 10 },
      { color: C.accent, width: 3, progress: au, head: 13, glow: pulse(t, T.every - 0.2, 1.2) }));
  });
  const bu = prog(t, T.passed - 0.2, 0.5, ease.outCubic) * (1 - out);
  if (bu > 0) {
    evalBadge(ctx, { x: 1335, y: 700, align: "center", expr: "counter(0).strings === counter(1).strings", result: String(truth().counter.sameStrings), alpha: bu, resultU: prog(t, T.every, 0.4) });
  }

  // …and another literal with the same text gets an array of its own
  const fu = prog(t, T.that - 0.3, 0.5, ease.outCubic) * (1 - prog(t, T.key + 0.5, 0.5));
  if (fu > 0) {
    const x = 1010, y = 800 + 14 * (1 - fu), w = 680;
    const two = O.two;
    const h = 46 + 14 + two.height + 66;
    withAlpha(ctx, fu, () => {
      panel(ctx, { x, y, w, h, title: "same text, another literal", titleFont: sans(22, 600), header: 46 });
      two.draw(ctx, x + 24, y + 46 + 10);
      const res = String(O.P.otherLiteralSameText);
      const ey = y + 46 + 12 + two.height + 26;
      const f = mono(23, 550);
      const sw = text(ctx, "g(1).strings === f(1).strings", x + 24, ey, { font: f, color: C.text, baseline: "middle" });
      text(ctx, "→", x + 24 + sw + 16, ey, { font: sans(25, 500), color: C.text3, baseline: "middle" });
      text(ctx, res, x + 24 + sw + 52, ey + 1, { font: mono(23, 700), color: res === "false" ? C.bad : C.ok, baseline: "middle" });
    });
  }
}

// ===================================== 3. key / nobuild / already

function drawKeyStage(ctx, t, L) {
  const { T, O, g, arr } = L;
  // the template cache, with the counter's array as its key
  const tin = prog(t, T.lits - 0.2, 0.55, ease.outCubic);
  const tout = prog(t, T.nobuild - 0.35, 0.5);
  const ta = tin * (1 - tout);
  if (ta > 0.001) {
    const K = 1.3, w = 640, x = 960 - w / 2, y = 450;
    const eu = prog(t, T.cache + 0.1, 0.45);
    let ct;
    const lift = 20 * (1 - tin) - 20 * tout;
    withAlpha(ctx, ta, () => withScale(ctx, K, 960, y + lift, () => {
      ct = cacheTable(ctx, { x, y: y + lift, w, entries: [{ key: "counter strings", u: eu, hl: pulse(t, T.cache + 0.3, 1.3) }], glow: pulse(t, T.cache, 1.2) * 0.8 });
    }));
    const toS = (p) => ({ x: 960 + (p.x - 960) * K, y: y + lift + (p.y - (y + lift)) * K });
    const kp = toS(ct.rows[0].keyPort);
    const left = toS({ x, y }).x;
    const a = { x: left - 70, y: arr.y + arr.h + FR + 8 }, b = { x: left - 10, y: kp.y };
    withAlpha(ctx, ta, () => cable(ctx, a, { x: a.x, y: b.y - 60 }, { x: b.x - 50, y: b.y }, b,
      { color: GOLD, width: 3, progress: prog(t, T.cache - 0.1, 0.55), head: 12 }));
    // the lookup, from lit-html.ts
    const lk = O.lookup;
    const lw = lk.width(ctx);
    const lx = 960 - lw / 2, ly = y + lift + ct.h * K + 50;
    const lu = prog(t, T.cache + 0.4, 0.45) * ta;
    withAlpha(ctx, lu, () => {
      text(ctx, "lit-html.ts", lx, ly - 8, { font: sans(21, 600), color: C.text3 });
      const rs = lk.find("result.strings");
      const r = lk.rect(ctx, lx, ly, rs.line, rs.col, rs.len);
      fillRR(ctx, r.x - 4, r.y, r.w + 8, r.h, 6, rgba(GOLD, 0.18));
      lk.draw(ctx, lx, ly);
    });
  }

  // what never changes, and what does: the expressions come back under the array
  const ex = prog(t, T.separated - 0.3, 0.5, ease.outCubic) * (1 - prog(t, T.raw - 0.5, 0.45));
  if (ex > 0) {
    const chips = exprChips(ctx, g, EXP_Y.key + 14 * (1 - ex));
    withAlpha(ctx, ex, () => chips.forEach((r, k) => drawExprChip(ctx, g, k, r)));
    const cu = prog(t, T.what2 - 0.25, 0.45);
    const cg = pulse(t, T.what2 - 0.2, 1.4);
    if (cu > 0) {
      const f = sans(30, 700);
      const x = chips[2].x + chips[2].w + 30, y = EXP_Y.key + chips[0].h / 2 + 1;
      withAlpha(ctx, cu * ex, () => {
        if (cg > 0) withGlow(ctx, rgba(C.white, 0.7 * cg), 16 * cg, () => text(ctx, "changes", x, y, { font: f, color: C.text, baseline: "middle" }));
        else text(ctx, "changes", x, y, { font: f, color: C.text, baseline: "middle" });
      });
    }
  }

  // no build step: code → [build step] → browser, the build step crossed out
  const fin = prog(t, T.nobuild - 0.2, 0.6, ease.outCubic);
  const fout = prog(t, T.raw - 0.5, 0.5);
  const fa = fin * (1 - fout);
  if (fa <= 0) return;
  const y = FLOW_Y + 20 * (1 - fin);
  const file = { x: 130, y: y - 80, w: 270, h: 160 };
  const bld = { x: 560, y: y - 105, w: 640, h: 210 };
  const brw = { x: 1360, y: y - 105, w: 440, h: 210 };
  const crossU = prog(t, T.build - 0.15, 0.5);
  const bypass = prog(t, T.already - 0.1, 0.8);
  const jobFly = prog(t, T.already + 0.25, 0.9, ease.inOutCubic);
  withAlpha(ctx, fa, () => {
    panel(ctx, { x: file.x, y: file.y, w: file.w, h: file.h, title: "counter.js", accent: SYN.fn, header: 42, titleFont: sans(22, 600) });
    for (let i = 0; i < 3; i++) fillRR(ctx, file.x + 26 + (i === 1 ? 26 : 0), file.y + 66 + i * 26, [150, 170, 110][i], 9, 4.5, rgba(C.text3, 0.45));
    // the build step
    withAlpha(ctx, lerp(1, 0.4, crossU), () => {
      ctx.save();
      ctx.setLineDash([12, 9]);
      strokeRR(ctx, bld.x, bld.y, bld.w, bld.h, 18, C.text3, 2);
      ctx.restore();
      text(ctx, "build step", bld.x + 26, bld.y + 38, { font: sans(28, 650), color: C.text2, baseline: "middle" });
    });
    // the browser
    const bg = pulse(t, T.already + 0.9, 1.4);
    fillRR(ctx, brw.x, brw.y, brw.w, brw.h, 18, C.panel);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(brw.x, brw.y, brw.w, brw.h, 18);
    ctx.clip();
    ctx.fillStyle = rgba(PLAT, 0.12);
    ctx.fillRect(brw.x, brw.y, brw.w, 54);
    ctx.fillStyle = rgba(PLAT, 0.45);
    ctx.fillRect(brw.x, brw.y + 53, brw.w, 1.5);
    ctx.restore();
    if (bg > 0) withAlpha(ctx, bg, () => withGlow(ctx, rgba(PLAT, 0.8), 26, () => strokeRR(ctx, brw.x, brw.y, brw.w, brw.h, 18, PLAT, 2.5)));
    strokeRR(ctx, brw.x + 0.75, brw.y + 0.75, brw.w - 1.5, brw.h - 1.5, 18, rgba(PLAT, 0.55), 1.5);
    browserGlyph(ctx, brw.x + 38, brw.y + 27, 1);
    text(ctx, "the browser", brw.x + 66, brw.y + 28, { font: sans(27, 700), color: PLAT, baseline: "middle" });
    text(ctx, "JavaScript engine", brw.x + brw.w / 2, brw.y + 96, { font: sans(27, 600), color: C.text2, align: "center", baseline: "middle", alpha: lerp(0.6, 1, bypass) });
    // arrows: file → build → browser, then the bypass
    withAlpha(ctx, lerp(1, 0.25, bypass), () => {
      arrow(ctx, { x: file.x + file.w + 14, y }, { x: bld.x - 14, y }, { color: C.text3, width: 2.5, progress: prog(t, T.nobuild, 0.5) });
      arrow(ctx, { x: bld.x + bld.w + 14, y }, { x: brw.x - 14, y }, { color: C.text3, width: 2.5, progress: prog(t, T.nobuild + 0.3, 0.5) });
    });
    if (bypass > 0) {
      cable(ctx, { x: file.x + file.w / 2, y: file.y + file.h + 10 }, { x: file.x + file.w / 2, y: bld.y + bld.h + 110 },
        { x: brw.x + brw.w / 2, y: bld.y + bld.h + 110 }, { x: brw.x + brw.w / 2, y: brw.y + brw.h + 10 },
        { color: PLAT, width: 3.5, progress: bypass, head: 14 });
    }
    // the build step, crossed out (under its job, which survives: it moves into the engine)
    if (crossU > 0) withAlpha(ctx, lerp(1, 0.55, bypass), () => cross(ctx, bld.x + bld.w / 2, bld.y + bld.h / 2 + 10, 150, C.bad, crossU));
    // the job, separating static from dynamic, moves into the engine
    const jf = sans(26, 600);
    const jl = [{ text: "separate ", c: C.text2 }, { text: "static", c: C.text }, { text: " from ", c: C.text2 }, { text: "dynamic", c: C.text }];
    const jw = jl.reduce((n, p) => n + measure(ctx, p.text, jf), 0) + 44, jh = 58;
    const j0 = { x: bld.x + bld.w / 2 - jw / 2, y: bld.y + bld.h / 2 - jh / 2 + 20 };
    const j1 = { x: brw.x + brw.w / 2 - jw / 2, y: brw.y + 132 };
    const jp = { x: lerp(j0.x, j1.x, jobFly), y: lerp(j0.y, j1.y, jobFly) - Math.sin(Math.PI * jobFly) * 60 };
    const sG = pulse(t, T.never - 0.25, 1.6), dG = pulse(t, T.what2 - 0.2, 1.4);
    withAlpha(ctx, 1, () => {
      plate(ctx, jp.x, jp.y, jw, jh, { fill: C.panel2, stroke: jobFly > 0 ? rgba(PLAT, 0.6) : C.border2, r: 12 });
      let x = jp.x + 22;
      for (const p of jl) {
        const lit = p.text === "static" ? sG : p.text === "dynamic" ? dG : 0;
        const draw = () => text(ctx, p.text, x, jp.y + jh / 2 + 1, { font: jf, color: lit > 0.3 ? C.white : p.c, baseline: "middle" });
        if (lit > 0) withGlow(ctx, rgba(C.white, 0.8 * lit), 14 * lit, draw);
        else draw();
        x += measure(ctx, p.text, jf);
      }
    });
    const nb = prog(t, T.build + 0.2, 0.45, ease.outCubic);
    text(ctx, "no build step", bld.x + bld.w / 2, bld.y - 34 - 10 * (1 - nb), { font: sans(34, 700), color: C.text, align: "center", baseline: "middle", alpha: nb });
  });
}

// =============================================== 4. raw / trust / json

// strings.raw: the same four strings, exactly as written (the counter has no escapes)
function drawRawRow(ctx, t, L) {
  const { T, O, arr } = L;
  const P = O.P;
  const out = prog(t, T.values - 0.45, 0.5);
  const ru = prog(t, T.rawW - 0.3, 0.6, ease.outCubic) * (1 - out);
  // "one more feature": its place, waiting
  const slot = prog(t, T.feature - 0.2, 0.4) * (1 - ru);
  if (slot > 0) {
    const y = arr.y + arr.h + FR * 2 + 54;
    withAlpha(ctx, slot * (1 - out), () => {
      ctx.save();
      ctx.setLineDash([10, 9]);
      strokeRR(ctx, arr.x - FR + 1, y - FR + 1, arr.w + 2 * FR - 2, arr.h + 2 * FR - 2, 14, rgba(C.text3, 0.6), 1.5);
      ctx.restore();
    });
  }
  if (ru <= 0) return;
  const y = arr.y + arr.h + FR * 2 + 54 - 30 * (1 - ru);
  const raw = truth().counter.result0.raw;
  withAlpha(ctx, ru, () => {
    fillRR(ctx, arr.x - FR, y - FR, arr.w + 2 * FR, arr.h + 2 * FR, 14, rgba(C.panel, 0.55));
    strokeRR(ctx, arr.x - FR + 0.5, y - FR + 0.5, arr.w + 2 * FR - 1, arr.h + 2 * FR - 1, 14, rgba(C.border2, 0.7), 1.5);
    const rg = window(t, T.checks - 0.2, T.json - 0.2, 0.4, 0.4);
    if (rg > 0) withAlpha(ctx, rg, () => withGlow(ctx, rgba(PLAT, 0.9), 22, () => strokeRR(ctx, arr.x - FR, y - FR, arr.w + 2 * FR, arr.h + 2 * FR, 14, PLAT, 2.5)));
    stringsArray(ctx, { x: arr.x, y, size: ARR, strings: raw });
    const lw = text(ctx, "strings.raw", arr.x - 4, y - FR - 22, { font: mono(28, 600), color: C.text2 });
    if (P.rawEnumerable === false) platformTag(ctx, { x: arr.x + lw + 18, y: y - FR - 22 - 29, h: 40, text: "non-enumerable", glyph: null, font: sans(23, 650) });
    if (P.rawFrozen) lockGlyph(ctx, arr.x + arr.w + FR + 38, y + arr.h / 2 - 4, 0.85, C.text2, 1);
  });
  L.rawRowY = y;
}

// "exactly as written": cooked vs raw, for a literal with an escape (truth `escape`)
function drawEscape(ctx, t, L) {
  const { T, O } = L;
  const P = O.P;
  const eu = prog(t, T.exactly2 - 0.35, 0.5, ease.outCubic) * (1 - prog(t, T.trust - 0.75, 0.4));
  if (eu <= 0) return;
  const x = 600, y = 600 + 16 * (1 - eu);
  withAlpha(ctx, eu, () => {
    O.esc.draw(ctx, x, y);
    const rows = [
      { label: "strings[0]", s: P.escape.cooked, note: "\\t became a tab" },
      { label: "strings.raw[0]", s: P.escape.raw, note: "as written" },
    ];
    rows.forEach((r, i) => {
      const u = prog(t, T.exactly2 + 0.05 + i * 0.35, 0.4);
      const cy = y + 110 + i * 84;
      withAlpha(ctx, u, () => {
        text(ctx, r.label, x, cy + 1, { font: mono(24, 500), color: C.text3, baseline: "middle" });
        const c = drawStringCell(ctx, x + 228, cy, r.s);
        text(ctx, r.note, x + 228 + c.w + 22, cy + 1, { font: sans(26, 600), color: C.text2, baseline: "middle" });
      });
    });
  });
}

// A string drawn character by character in a cell: a tab as a boxed arrow,
// a backslash escape (as written) boxed.
function drawStringCell(ctx, x, cy, s) {
  const size = 34, a = monoAdvance(ctx, size, 500), h = size * 1.7;
  const parts = [];
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\t") parts.push({ text: "⇥", tab: true, n: 2 });
    else if (s[i] === "\\" && s[i + 1] === "t") { parts.push({ text: "\\t", esc: true, n: 2 }); i++; }
    else parts.push({ text: s[i], n: 1 });
  }
  const n = parts.reduce((k, p) => k + p.n, 0);
  const w = n * a + 40;
  fillRR(ctx, x, cy - h / 2, w, h, 10, C.panel2);
  strokeRR(ctx, x + 0.5, cy - h / 2 + 0.5, w - 1, h - 1, 10, C.border, 1.2);
  let px = x + 20;
  for (const p of parts) {
    if (p.tab || p.esc) {
      fillRR(ctx, px - 1, cy - size * 0.62, p.n * a + 2, size * 1.24, 6, rgba(C.accent, 0.25));
      text(ctx, p.text, px + (p.n * a) / 2, cy + 1, { font: mono(size, 600), color: p.tab ? C.text2 : C.white, align: "center", baseline: "middle" });
    } else text(ctx, p.text, px, cy + 1, { font: mono(size, 500), color: C.text, baseline: "middle" });
    px += p.n * a;
  }
  return { w, h };
}

// lit-html's check: trustFromTemplateString
function drawTrust(ctx, t, L) {
  const { T, O } = L;
  const out = prog(t, T.values - 0.45, 0.5);
  const tu = prog(t, T.trust - 0.15, 0.6, ease.outCubic) * (1 - out);
  if (tu <= 0) return;
  const code = O.trust;
  const cw = code.width(ctx);
  const pw = cw + 72 + 56, ph = code.height + 44 + 40;
  // centred while it's the focus; right, to make room for the JSON result
  const px = lerp(960 - pw / 2, TRUST.x, prog(t, T.json - 1.0, 0.8)), py = TRUST.y + 20 * (1 - tu);
  const cx = px + 36, cy = py + 44 + 20;
  const retU = window(t, T.trusted - 0.35, T.checks - 0.3, 0.4, 0.5);
  const ifU = prog(t, T.checks - 0.3, 0.45);
  const cond = code.find("!isArray(tsa) || !tsa.hasOwnProperty('raw')");
  const hasRaw = code.find("tsa.hasOwnProperty('raw')");
  const rc = code.rect(ctx, cx, cy, hasRaw.line, hasRaw.col, hasRaw.len);
  const lineEnd = code.rect(ctx, cx, cy, hasRaw.line, code.lines[hasRaw.line].length, 0);
  L.trustGeo = { rc, px, py, pw, ph };
  const hit = pulse(t, T.cant - 0.05, 0.9);
  withAlpha(ctx, tu, () => {
    panel(ctx, { x: px, y: py, w: pw, h: ph, title: "lit-html.ts", accent: C.accent });
    const lineRect = (l0, l1) => {
      const a = code.rect(ctx, cx, cy, l0, 0, 1), b = code.rect(ctx, cx, cy, l1, 0, 1);
      return { x: cx - 14, y: a.y - 2, w: cw + 28, h: b.y + b.h - a.y + 4 };
    };
    if (retU > 0) {
      const r = lineRect(9, 11);
      withAlpha(ctx, retU, () => fillRR(ctx, r.x, r.y, r.w, r.h, 8, rgba(C.accent, 0.14)));
    }
    if (ifU > 0) {
      const r = code.rect(ctx, cx, cy, cond.line, cond.col, cond.len);
      withAlpha(ctx, ifU, () => {
        fillRR(ctx, r.x - 5, r.y - 1, r.w + 10, r.h + 2, 7, rgba(PLAT, 0.14));
        strokeRR(ctx, rc.x - 2, rc.y - 1, rc.w + 7, rc.h + 2, 7, rgba(PLAT, 0.85), 2);
      });
    }
    if (hit > 0) withAlpha(ctx, hit, () => withGlow(ctx, rgba(C.bad, 0.8), 16, () => strokeRR(ctx, rc.x - 2, rc.y - 1, rc.w + 7, rc.h + 2, 7, C.bad, 3)));
    code.draw(ctx, cx, cy, {
      style: (tok) => {
        if (tok.text === "throw" || tok.text === "as") return { color: SYN.keyword };
        if (tok.text === "…") return { color: C.text3 };
        return {};
      },
    });
    // the folded DEV_MODE block
    const fold = code.find("{…}");
    const fr = code.rect(ctx, cx, cy, fold.line, fold.col, fold.len);
    strokeRR(ctx, fr.x - 2, fr.y + 4, fr.w + 4, fr.h - 8, 6, rgba(C.text3, 0.7), 1.5);
    // Trusted Types, by the return
    if (retU > 0) {
      const r = code.rect(ctx, cx, cy, 10, code.lines[10].length, 0);
      withAlpha(ctx, retU, () => platformTag(ctx, { x: r.x + 28, y: r.y + r.h / 2 - 21, h: 42, text: "Trusted Types", font: sans(23, 650) }));
    }
    // the counter's array passes: raw is there
    const ok = prog(t, T.raw2 - 0.1, 0.5), okOut = prog(t, T.json - 0.3, 0.3);
    if (ok > 0 && okOut < 1) withAlpha(ctx, 1 - okOut, () => check(ctx, lineEnd.x + 34, lineEnd.y + lineEnd.h / 2, 34, C.ok, ok));
    // and the JSON one doesn't
    const no = prog(t, T.cant, 0.45);
    if (no > 0) cross(ctx, lineEnd.x + 34, lineEnd.y + lineEnd.h / 2, 30, C.bad, no);
  });
}

// JSON can't carry `raw`: a result parsed from JSON is refused
function drawJson(ctx, t, L) {
  const { T, O } = L;
  const out = prog(t, T.values - 0.45, 0.5);
  const ju = prog(t, T.json - 0.3, 0.55, ease.outCubic) * (1 - out);
  if (ju <= 0) return;
  const x = 76, y = 272;
  withAlpha(ctx, ju, () => {
    text(ctx, "JSON.parse(", x, y, { font: mono(24, 500), color: C.text2, baseline: "middle" });
    text(ctx, `'${JSON_TEXT}'`, x + 24, y + 36, { font: mono(21, 500), color: SYN.string, baseline: "middle" });
    text(ctx, ")", x, y + 72, { font: mono(24, 500), color: C.text2, baseline: "middle" });
  });
  // the object it makes looks like a TemplateResult; it flies at the check,
  // hits, and bounces back
  const f = O.fake;
  const go = prog(t, T.jsonW + 0.05, 0.5, ease.inCubic);
  const back = prog(t, T.cant + 0.05, 0.6, ease.outCubic);
  const home = { x: x + 24, y: y + 136 };
  const rows = [
    { k: "_$litType$", v: String(f._$litType$), vColor: C.text2 },
    { k: "strings", v: JSON.stringify(f.strings), vColor: C.text },
    { k: "values", v: JSON.stringify(f.values), vColor: C.text2 },
  ];
  const K0 = card(ctx, { x: 0, y: 0, title: "from JSON", size: 26, rows, alpha: 0 });
  const tg = L.trustGeo;
  // it stops against the code panel, level with the check
  const target = tg ? { x: TRUST.x - K0.w - 10, y: tg.rc.y + tg.rc.h / 2 - K0.row(1).y - K0.row(1).h / 2 } : { x: 400, y: 400 };
  const pos = back > 0 ? mix(target, { x: home.x, y: home.y + 60 }, back) : mix(home, target, go);
  const rot = back > 0 ? -0.05 * Math.sin(Math.PI * back) : 0;
  withAlpha(ctx, ju, () => {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(rot);
    const K = card(ctx, { x: 0, y: 0, title: "from JSON", color: C.text2, size: 26, rows });
    const nr = prog(t, T.cant + 0.35, 0.4);
    if (nr > 0) {
      const r = K.row(1);
      withAlpha(ctx, nr, () => {
        cross(ctx, r.x + r.w + 32, r.y + r.h / 2, 30, C.bad, nr);
        text(ctx, "no raw", r.x + r.w + 58, r.y + r.h / 2 + 1, { font: sans(26, 650), color: C.bad, baseline: "middle" });
      });
    }
    ctx.restore();
  });

  // the error, in the console (development build message, truth `spoof`)
  const eu = prog(t, T.cant + 0.2, 0.5, ease.outCubic) * (1 - out);
  if (eu > 0) {
    const msg = O.P.spoof.message;
    const cut = msg.indexOf(" with a 'raw' field");
    const lines = cut > 0 ? ["Error: " + msg.slice(0, cut), msg.slice(cut + 1) + " …"] : ["Error: " + msg];
    const { x: cx, w: cw, h: ch } = CONSOLE;
    const cy = CONSOLE.y + 20 * (1 - eu);
    withAlpha(ctx, eu, () => {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 10;
      fillRR(ctx, cx, cy, cw, ch, 14, "#1b1f2b");
      ctx.restore();
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(cx, cy, cw, ch, 14);
      ctx.clip();
      ctx.fillStyle = "#23283a";
      ctx.fillRect(cx, cy, 220, ch);
      ctx.fillStyle = rgba(C.bad, 0.1);
      ctx.fillRect(cx + 220, cy, cw - 220, ch);
      ctx.restore();
      strokeRR(ctx, cx + 0.5, cy + 0.5, cw - 1, ch - 1, 14, "#353c55", 1.5);
      text(ctx, "Console", cx + 28, cy + 40, { font: sans(24, 650), color: C.text, baseline: "middle" });
      text(ctx, "development build", cx + 28, cy + 76, { font: sans(19, 500), color: C.text3, baseline: "middle" });
      const ix = cx + 258, iy = cy + 40;
      fillRR(ctx, ix - 15, iy - 15, 30, 30, 15, C.bad);
      cross(ctx, ix, iy, 20, C.bg, 1);
      lines.forEach((l, i) => text(ctx, l, ix + 38, iy + i * 44, { font: mono(25, 500), color: "#ff9b9b", baseline: "middle" }));
    });
  }
}

// ================================================ 5. values / text / attrs / safe

function drawValues(ctx, t, L) {
  const { T, O } = L;
  const vin = prog(t, T.values - 0.2, 0.6, ease.outCubic);
  if (vin <= 0) return;
  const code = O.call;
  const cw = code.width(ctx);
  const pw = cw + 80, ph = code.height + 44 + 40;
  const px = 960 - pw / 2, py = 96 + 16 * (1 - vin);
  const cx = px + 40, cy = py + 44 + 20;
  const val = code.find('"<img src=x onerror=alert(1)>"');
  const vr = code.rect(ctx, cx, cy, val.line, val.col, val.len);
  const valU = prog(t, T.values + 0.1, 0.4);
  withAlpha(ctx, vin, () => {
    panel(ctx, { x: px, y: py, w: pw, h: ph, title: "page.js", accent: SYN.fn });
    if (valU > 0) withAlpha(ctx, valU, () => {
      fillRR(ctx, vr.x - 5, vr.y, vr.w + 10, vr.h, 7, rgba(C.accent, 0.16));
      strokeRR(ctx, vr.x - 5, vr.y, vr.w + 10, vr.h, 7, rgba(C.accent, 0.8), 2);
    });
    code.draw(ctx, cx, cy);
  });
  text(ctx, "a value that looks like markup", vr.x + vr.w / 2, py + ph + 36, { font: sans(27, 600), color: C.accent, align: "center", baseline: "middle", alpha: vin * prog(t, T.values + 0.4, 0.4) });

  // the page: devtools, the <p> and what's in it
  const tree = O.tree;
  const DV = { x: 1060, y: 390, w: 800, h: 372 };
  const dv = prog(t, T.text - 0.5, 0.6, ease.outCubic);
  const textRow = tree.rows.find((r) => r.kind === "text");
  const land = prog(t, T.nodes - 0.2, 0.35);
  let dt = null;
  if (dv > 0) {
    dt = devtools(ctx, {
      x: DV.x + 30 * (1 - dv), y: DV.y, w: DV.w, h: DV.h, tree, alpha: dv,
      rowStyle: (row) => (row === textRow ? { alpha: land } : row.depth === 0 || (row.depth === 1 && row.kind === "comment") ? { alpha: 0.45 } : {}),
      select: land > 0 ? textRow : null, selectU: land * (1 - prog(t, T.attrs, 0.5)),
    });
    const r = tree.rowRect(ctx, dt.treeX, dt.treeY, textRow);
    withAlpha(ctx, dv * land, () => text(ctx, "#text", r.x + r.w + 22, r.y + r.h / 2 + 1, { font: mono(22, 600), color: C.text3, baseline: "middle" }));
    dt.textRect = r;
  }

  // how a value reaches the DOM: text nodes, setAttribute; never the parser
  const LX = 330;
  const lanes = [
    { y: 450, code: "document.createTextNode(value)", at: T.text - 0.2, label: "text" },
    { y: 570, code: "element.setAttribute(name, value)", at: T.attrs - 0.15, label: "attributes" },
  ];
  const chipGeo = lanes.map((ln) => apiChip(ctx, { x: LX, y: ln.y, code: ln.code, size: 28, alpha: 0 }));
  const fly = clamp((t - (T.text + 0.05)) / 1.3);
  lanes.forEach((ln, i) => {
    const u = prog(t, ln.at, 0.45, ease.outBack);
    if (u <= 0) return;
    const glow = i === 0 ? pulse(t, T.text + 0.35, 0.9) : pulse(t, T.attrs + 0.2, 1.0);
    withAlpha(ctx, clamp(u), () => {
      text(ctx, ln.label, LX - 26, ln.y + chipGeo[i].h / 2 + 1, { font: sans(28, 650), color: C.text2, align: "right", baseline: "middle" });
      withScale(ctx, lerp(0.9, 1, clamp(u)), LX, ln.y + 28, () => apiChip(ctx, { x: LX, y: ln.y, code: ln.code, size: 28, glow }));
    });
  });

  // the HTML parser: struck out, first centre stage ("never parsed as HTML"),
  // then in its own lane under the other two; unsafeHTML is the way in
  const np = prog(t, T.never2 - 0.25, 0.5, ease.outCubic);
  if (np > 0) {
    const move = prog(t, T.text - 0.45, 0.8);
    const slot = { x: LX, y: 690 };
    const f = sans(27, 650);
    const g0 = platformTag(ctx, { x: 0, y: 0, h: 54, text: "HTML parser", font: f, alpha: 0 });
    const pos = mix({ x: 960 - g0.w / 2, y: 440 }, slot, move);
    const opt = prog(t, T.unsafe + 0.15, 0.5);                   // unsafeHTML reaches it
    withAlpha(ctx, np, () => {
      text(ctx, "markup", LX - 26, pos.y + 28, { font: sans(28, 650), color: C.text2, align: "right", baseline: "middle", alpha: move });
      const gtag = platformTag(ctx, { x: pos.x, y: pos.y, h: 54, text: "HTML parser", font: f, glow: pulse(t, T.unsafe + 0.45, 1.0) });
      const k = prog(t, T.never2 + 0.2, 0.4) * (1 - opt);
      if (k > 0) {
        ctx.save();
        ctx.strokeStyle = C.bad;
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(gtag.x - 10, gtag.y + gtag.h / 2);
        ctx.lineTo(gtag.x - 10 + (gtag.w + 20) * k, gtag.y + gtag.h / 2);
        ctx.stroke();
        ctx.restore();
      }
      const nl = prog(t, T.never2 + 0.35, 0.4) * (1 - move);
      text(ctx, "never parsed as HTML", 960, 540, { font: sans(32, 650), color: C.text, align: "center", baseline: "middle", alpha: nl });
      const nv = move * (1 - opt);
      text(ctx, "not for values", gtag.x + gtag.w + 24, gtag.y + gtag.h / 2 + 1, { font: sans(26, 600), color: C.text3, baseline: "middle", alpha: nv });
      L.parserTag = gtag;
    });
  }

  // the value travels: through createTextNode, into the page as a text node
  if (fly > 0 && fly < 1 && dt) {
    const a = { x: vr.x + vr.w / 2, y: vr.y + vr.h / 2 };
    const c0 = chipGeo[0];
    const m = { x: c0.x + c0.w / 2, y: c0.y + c0.h / 2 };     // through createTextNode
    const b = { x: dt.textRect.x + dt.textRect.w / 2, y: dt.textRect.y + dt.textRect.h / 2 };
    const leg = fly < 0.5 ? 0 : 1;
    const lu = ease.inOutCubic(leg === 0 ? fly / 0.5 : (fly - 0.5) / 0.5);
    const p = leg === 0 ? arc(a, m, lu, 40) : arc(m, b, lu, -60);
    withAlpha(ctx, Math.min(1, fly * 6) * (1 - smooth(0.9, 1, fly)), () => {
      const f = mono(28, 500);
      const s = '"<img src=x onerror=alert(1)>"';
      const w = measure(ctx, s, f);
      plate(ctx, p.x - w / 2 - 12, p.y - 23, w + 24, 46, { fill: C.panel2, stroke: rgba(C.accent, 0.6) });
      text(ctx, s, p.x, p.y + 1, { font: f, color: DOMC.text, align: "center", baseline: "middle" });
    });
  }

  // nothing turned into markup: no <img> (truth `imgs`)
  const nb = prog(t, T.markup - 0.35, 0.5, ease.outCubic);
  if (nb > 0 && dt) {
    evalBadge(ctx, { x: DV.x + DV.w / 2, y: DV.y + DV.h + 30, align: "center", expr: "box.querySelectorAll('img').length", result: String(O.P.textValue.imgs), resultColor: C.ok, alpha: nb, resultU: prog(t, T.markup + 0.05, 0.4) });
  }

  // unless you opt in, on purpose: unsafeHTML, the way into the parser
  const us = prog(t, T.unsafe - 0.3, 0.5, ease.outBack);
  if (us > 0 && L.parserTag) {
    const f = mono(30, 550);
    const s = "unsafeHTML(value)";
    const w = measure(ctx, s, f) + 50, h = 64;
    const x = LX, y = 840;
    withAlpha(ctx, clamp(us), () => withScale(ctx, lerp(0.85, 1, clamp(us)), x + w / 2, y + h / 2, () => {
      fillRR(ctx, x, y, w, h, 14, C.panel2);
      strokeRR(ctx, x + 0.75, y + 0.75, w - 1.5, h - 1.5, 14, C.border2, 1.5);
      text(ctx, s, x + w / 2, y + h / 2 + 1, { font: f, color: SYN.fn, align: "center", baseline: "middle" });
    }));
    const gt = L.parserTag;
    withAlpha(ctx, clamp(us), () => arrow(ctx, { x: x + w / 2 + 60, y: y - 8 }, { x: gt.x + gt.w / 2 + 30, y: gt.y + gt.h + 8 },
      { color: C.text2, width: 3, head: 12, progress: prog(t, T.unsafe, 0.45), bend: -10 }));
    text(ctx, "on purpose only", x + w + 30, y + h / 2 + 1, { font: sans(28, 650), color: C.text, baseline: "middle", alpha: prog(t, T.unsafe + 0.2, 0.4) });
  }
}
