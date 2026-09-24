// literal: the counter's tagged template literal comes apart into its strings
// array and its values array; html() wraps them in a TemplateResult; calling
// counter(1) makes a second TemplateResult that shares the very same strings
// array, which is why that array can be the template cache's key.
//
// Layout: the literal starts centre stage (where the code scene left it); the
// strings array spans the top, the values array sits below. From {call} on,
// the literal shrinks to the lower left as context, html(strings, ...values)
// sits left of centre, and the TemplateResults sit centre-right and right,
// each above its own values array.

import { B, C, SYN, rgba } from "../kit/theme.js";
import { Code, KIND_COLOR } from "../kit/code.js";
import { COUNTER_SRC, OBJ, counterValues, literalPieces, literalText, stringsArray, templateResultCard, valuesArray } from "../kit/lit.js";
import { chip, fillRR, measure, mono, monoAdvance, ring, sans, setFont, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { truth } from "../timing.js";
import { clamp, ease, lerp, mix, prog, pulse, window } from "../util.js";
import { blendHex, cable, drawKey, smooth } from "./literal-draw.js";

export const transition = "fade";

// The literal: lines 2-6 of the example, `const counter = (count) => html\``
// through `</button>\`;` (the function head and the `;` are drawn dim).
const SRC = COUNTER_SRC.split("\n").slice(2, 7).join("\n");

const LIT = 36;        // the literal, in focus
const ARR = 28;        // the strings and values arrays
const CARD = 30;       // TemplateResult cards
const CALL = 40;       // html(strings, ...values), as it forms
const STR_Y = 170;     // top of the strings array
const VAL_Y = 836;     // top of the values arrays
const LIT_CY = 520;    // centre line of the literal while it's the focus
const CARD_Y = 390;    // top of the TemplateResult cards
const CARD_X0 = 1148;  // the first TemplateResult, while it's the only one
const CARD_X = [930, 1420];                      // ... and the two, side by side
const CALL_A = { x: 960, y: 520, k: 1 };         // centre of the call as it forms
const CALL_B = { x: 440, y: 520, k: 1 };         // ... once a result is out (slides left)
const SMALL = 20;      // the literal as context, lower left, from "call" on
const LIT_P2 = { x: 60, y: 640, k: SMALL / LIT };

let G = null;
function geo(ctx) {
  if (G) return G;
  const code = new Code(SRC, { size: LIT });
  const statics = code.statics(0);
  const strings = truth().counter.result0.strings;
  const inR = (tok, r) => tok.line === r.line && tok.col >= r.col && tok.col + tok.text.length <= r.col + r.len;
  // what each token of the literal is: the function head, the tag, a
  // backtick, part of static piece i, a ${ } delimiter, or expression k
  const role = new Map();
  for (const tok of code.tokens) {
    let r;
    if (tok.bind) r = { kind: tok.kind === "bindOpen" || tok.kind === "bindClose" ? "delim" : "expr", k: tok.bind.index };
    else if (tok.kind === "backtick") r = { kind: "tick" };
    else if (tok.tpl === 0) r = { kind: "static", i: statics.findIndex((rs) => rs.some((q) => inR(tok, q))) };
    else if (tok.kind === "fn") r = { kind: "tag" };
    else r = { kind: "head" };
    role.set(tok, r);
  }
  // Each static piece's fragments (one per source line), and where each one
  // lands inside its cell's text ('\n  <span class="' etc).
  const frags = statics.map((ranges, i) => {
    const segs = [];
    let off = 1; // after the opening quote
    strings[i].split("\n").forEach((seg, j) => {
      if (j > 0) off += 2; // "\n" is shown as two characters
      if (seg) segs.push({ off, text: seg });
      off += seg.length;
    });
    return ranges.map((r, j) => {
      const src = code.lines[r.line].slice(r.col, r.col + r.len);
      if (segs[j]?.text !== src) console.warn(`literal: static ${i}.${j} "${src}" != "${segs[j]?.text}"`);
      return { ...r, off: segs[j]?.off ?? 1, toks: code.tokens.filter((t) => t.kind !== "ws" && inR(t, r)) };
    });
  });
  // the parts of each cell's text that aren't in the source: quotes and \n
  const dims = strings.map((s) => {
    const out = [];
    let off = 0;
    for (const p of literalPieces(s)) {
      if (p.dim) out.push({ off, text: p.text });
      off += p.text.length;
    }
    return out;
  });
  // the three expressions, without their ${ and }
  const exprs = [0, 1, 2].map((k) => {
    const b = code.binding(k);
    return {
      line: b.start.line, col: b.start.col + 2, len: b.end.col - b.start.col - 3,
      toks: code.tokens.filter((t) => t.bind?.index === k && t.kind !== "bindOpen" && t.kind !== "bindClose" && t.kind !== "ws"),
    };
  });
  // JetBrains Mono: distance from the "middle" baseline down to the alphabetic one, per px
  ctx.save();
  setFont(ctx, mono(100, 500));
  ctx.textBaseline = "middle";
  const mid = ctx.measureText("M").actualBoundingBoxDescent / 100;
  ctx.restore();
  const card = templateResultCard(ctx, { x: 0, y: 0, alpha: 0, size: CARD });
  const call = new Code("html(strings, ...values)", { size: CALL });
  G = { code, statics, strings, role, frags, dims, exprs, mid, cardW: card.w, cardH: card.h, call };
  return G;
}

// A Code drawn with its top-left at (P.x, P.y), scaled by P.k.
function drawCodeAt(ctx, code, P, style) {
  ctx.save();
  ctx.translate(P.x, P.y);
  ctx.scale(P.k, P.k);
  code.draw(ctx, 0, 0, { style });
  ctx.restore();
}
// A character range of a Code placed at P, in screen px.
function rectAt(ctx, code, P, line, col, len) {
  const r = code.rect(ctx, 0, 0, line, col, len);
  return { x: P.x + r.x * P.k, y: P.y + r.y * P.k, w: r.w * P.k, h: r.h * P.k };
}
// The "middle" text line of a Code's line at P.
function midY(code, P, line, midK) {
  return P.y + (code.baseline(0, line) - midK * code.size) * P.k;
}
// Placement of a Code of width w, height h (at scale k) centred on (cx, cy).
function centred(ctx, code, cx, cy, k) {
  return { x: cx - (code.cols * monoAdvance(ctx, code.size, 500) * k) / 2, y: cy - (code.height * k) / 2, k };
}

// Draws a run of tokens with its first character at (x, y) (baseline "middle").
function drawRun(ctx, toks, col0, x, y, size, color, alpha = 1) {
  if (alpha <= 0.001) return;
  const a = monoAdvance(ctx, size, 500);
  ctx.save();
  setFont(ctx, mono(size, 480));
  ctx.textBaseline = "middle";
  ctx.globalAlpha *= alpha;
  for (const tok of toks) {
    ctx.fillStyle = color(tok);
    ctx.fillText(tok.text, x + (tok.col - col0) * a, y);
  }
  ctx.restore();
}

// A rounded plate with a soft shadow (things in flight).
function plate(ctx, x, y, w, h, { fill = C.panel2, stroke = null, alpha = 1, r = 9 } = {}) {
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 6;
    fillRR(ctx, x, y, w, h, r, fill);
    ctx.restore();
    if (stroke) strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r, stroke, 1.5);
  });
}

export function draw(F, S) {
  const { ctx, t } = F;
  const g = geo(ctx);
  const { code } = g;
  const adv = (s) => monoAdvance(ctx, s, 500);

  // ---------------------------------------------------------------- timing
  const T = {
    glide: S.start + 0.55,
    html: S.word(0, "html") - 0.15,
    tick: S.word(0, "backtick") - 0.15,
    tagged: S.word(0, "tagged") - 0.2,
    split: S.m("split"),
    lists: S.word(0, "two") - 0.3,
    strings: S.m("strings") - 0.1,
    values: S.m("values") - 0.1,
    call: S.m("call") - 0.15,
    both: S.word(0, "both") - 0.35,
    result: S.m("result") - 0.1,
    object: S.m("object") - 0.2,
    rs: S.word(1, "strings") - 0.15,
    rv: S.word(1, "values") - 0.15,
    rn: S.word(1, "number") - 0.15,
    rh: S.word(1, "html", 1) - 0.25,
    name: S.m("name") - 0.1,
    nothing: S.m("nothing") - 0.1,
    again: S.m("again") - 0.1,
    c1: S.word(2, "counter") - 0.25,
    one: S.word(2, "one") - 0.35,
    newv: S.m("newvalues") - 0.15,
    same: S.m("same") - 0.1,
    ident: S.m("identical") - 0.1,
    rule: S.m("rule") - 0.2,
    once: S.word(3, "one") - 0.25,
    every: S.word(3, "every") - 0.2,
    key: S.word(3, "array", 2) - 0.15,   // "the array itself": it lights up
    tagk: S.word(3, "cache") - 0.25,      // "cache key": it gets the tag
    meaning: S.m("meaning") - 0.15,
  };

  // --------------------------------------------------------------- layout
  // the literal: from where the code scene left it (size 31 in its panel) to centre stage
  const glide = prog(t, T.glide, 1.1);
  const P0 = { x: 960 - 34 * adv(31), y: 208 + 2 * 31 * 1.55, k: 31 / LIT };
  const P1 = centred(ctx, code, 960, LIT_CY, 1);
  const litMove = prog(t, T.call - 0.3, 0.8);   // to the lower left, as context
  const LP = mix(mix(P0, P1, glide), LIT_P2, litMove);

  // the strings array (one, for the whole scene)
  const strW = stringsArray(ctx, { x: 0, y: STR_Y, size: ARR, alpha: 0 }).w;
  const strX = 960 - strW / 2;
  const SG = stringsArray(ctx, { x: strX, y: STR_Y, size: ARR, alpha: 0 });

  // TemplateResult cards
  const cw = g.cardW, ch = g.cardH;
  const again = prog(t, T.again, 0.9);
  const cardC = [{ x: lerp(CARD_X0, CARD_X[0], again), y: CARD_Y }, { x: CARD_X[1], y: CARD_Y }];

  // values arrays, each under its card
  const vals = [counterValues(0), counterValues(1)];
  const VA = vals.map((values, n) => {
    const w = valuesArray(ctx, { x: 0, y: 0, values, size: ARR, alpha: 0 }).w;
    return valuesArray(ctx, { x: cardC[n].x + cw / 2 - w / 2, y: VAL_Y, values, size: ARR, alpha: 0 });
  });
  const V0 = VA[0];

  // html(strings, ...values): forms where the literal was, then moves left
  const callMove = prog(t, T.object, 0.8);
  const callC = mix(CALL_A, CALL_B, callMove);
  const CP = centred(ctx, g.call, callC.x, callC.y, callC.k);

  // ------------------------------------------------------ progress values
  const lists = prog(t, T.lists, 0.5);
  const flyS = [0, 1, 2, 3].map((i) => clamp((t - (T.strings + i * 0.2)) / 1.1));
  const flyV = [0, 1, 2].map((k) => clamp((t - (T.values + k * 0.18)) / 1.05));
  const landS = flyS.map((u) => (u >= 1 ? 1 : 0));
  const landV = flyV.map((u) => (u >= 1 ? 1 : 0));
  const callU = prog(t, T.call, 0.8);           // the literal turns into the call
  const bright = prog(t, T.rule, 0.6);            // the rule: the literal's static parts light up
  const callFade = 1 - prog(t, T.rule, 0.45);

  // --------------------------------------------------------- the arrays
  // "two lists": empty slots first, then the kit's arrays as pieces land
  withAlpha(ctx, lists, () => {
    SG.cells.forEach((c, i) => {
      if (flyS[i] > 0.7) return;
      ctx.save();
      ctx.setLineDash([7, 7]);
      strokeRR(ctx, c.x + 1, c.y + 1, c.w - 2, c.h - 2, 9, rgba(C.text3, 0.55), 1.5);
      ctx.restore();
    });
    V0.cells.forEach((c, k) => {
      if (flyV[k] > 0.7) return;
      ctx.save();
      ctx.setLineDash([7, 7]);
      strokeRR(ctx, c.x + 1, c.y + 1, c.w - 2, c.h - 2, 9, rgba(B[k], 0.45), 1.5);
      ctx.restore();
    });
  });
  arrayFrame(ctx, SG, lists);
  arrayFrame(ctx, V0, lists);
  // the strings array's glow: "the very same object", then "the array itself" (cache key)
  const strGlow = Math.max(pulse(t, T.same + 0.75, 1.3), window(t, T.key, S.end + 5, 0.5, 0.3));
  const strGlowColor = t > T.key ? OBJ.cache : C.accent;
  if (strGlow > 0) {
    withAlpha(ctx, strGlow, () => withGlow(ctx, rgba(strGlowColor, 0.9), 26, () =>
      strokeRR(ctx, SG.x - FR, SG.y - FR, SG.w + 2 * FR, SG.h + 2 * FR, 14, rgba(strGlowColor, 0.85), 2.5)));
  }
  stringsArray(ctx, { x: strX, y: STR_Y, size: ARR, alpha: lists, cellAlpha: landS });
  valuesArray(ctx, { x: V0.x, y: VAL_Y, values: vals[0], size: ARR, alpha: lists, cellAlpha: landV });

  // the second values array: pops in, its cells staggered, all three lit ("the values are new")
  const newA = prog(t, T.newv, 0.3);
  const newHl = window(t, T.newv + 0.35, T.same, 0.3, 0.5);
  if (newA > 0) {
    const V1 = VA[1];
    const pop = prog(t, T.newv, 0.5, ease.outBack);
    arrayFrame(ctx, V1, newA);
    withScale(ctx, lerp(0.8, 1, pop), V1.x + V1.w / 2, V1.y + V1.h / 2, () => {
      valuesArray(ctx, { x: V1.x, y: VAL_Y, values: vals[1], size: ARR, alpha: newA,
        cellAlpha: [0, 1, 2].map((k) => prog(t, T.newv + k * 0.12, 0.3)), hl: [newHl, newHl, newHl] });
    });
  }

  // row labels
  const lab = sans(26, 600);
  const labS = prog(t, S.word(0, "strings") - 0.2, 0.4);
  text(ctx, "strings", SG.x - 6, SG.y - 32, { font: lab, color: C.text2, alpha: labS });
  const labV = prog(t, S.word(0, "values") - 0.2, 0.4) * (1 - prog(t, T.again, 0.4));
  text(ctx, "values", V0.x - 6, V0.y - 32, { font: lab, color: C.text2, alpha: labV });
  text(ctx, "count = 0", V0.x + V0.w + 22, V0.y + V0.h / 2 + 1, { font: mono(24, 500), color: C.text3, baseline: "middle", alpha: labV * prog(t, S.word(0, "expressions") - 0.1, 0.4) });

  // ---------------------------------------------------- the literal itself
  const litA = prog(t, S.start - 0.4, 0.3);
  if (litA > 0) {
    // binding washes (as the code scene left them); outlined at "splits"; dim once the values leave
    for (let k = 0; k < 3; k++) {
      const e = g.exprs[k];
      const r = rectAt(ctx, code, LP, e.line, e.col - 2, e.len + 3);
      const hot = window(t, T.split + 0.3, T.values + k * 0.18 + 0.2, 0.4, 0.4);
      const gone = flyV[k] > 0 ? 0.35 : 1;
      withAlpha(ctx, litA * (1 - litMove), () => {
        fillRR(ctx, r.x - 3, r.y, r.w + 6, r.h, 7, rgba(B[k], (0.16 + 0.08 * hot) * gone));
        if (hot > 0) withAlpha(ctx, hot, () => strokeRR(ctx, r.x - 3, r.y, r.w + 6, r.h, 7, rgba(B[k], 0.8), 2));
      });
    }
    // the tag and the backticks: washed, recoloured and underlined
    const tagU = window(t, T.html, T.split + 0.4, 0.4, 0.5);
    const tickU = window(t, T.tick, T.split + 0.4, 0.4, 0.5);
    const breathe = 0.85 + 0.15 * Math.sin((t - T.html) * 3);
    const hr = (() => { const h = code.find("html"); return rectAt(ctx, code, LP, h.line, h.col, h.len); })();
    if (tagU > 0) withAlpha(ctx, tagU * litA, () => fillRR(ctx, hr.x - 5, hr.y, hr.w + 8, hr.h, 7, rgba(C.accent, 0.2)));
    const ghost = 0.16;
    // as context (lower left): dim; "call counter again" nudges it; the rule lights its strings
    const nudge = pulse(t, T.c1 - 0.2, 1.1);
    const ctxAlpha = (r) => {
      let a;
      if (r.kind === "static" || r.kind === "tick" || r.kind === "tag") a = lerp(0.42, 0.95, bright);
      else if (r.kind === "expr" || r.kind === "delim") a = lerp(0.42, 0.3, bright);
      else a = 0.3;
      return Math.min(1, a + 0.45 * nudge);
    };
    drawCodeAt(ctx, code, LP, (tok) => {
      const r = g.role.get(tok);
      let a = 1, color;
      if (r.kind === "head") a = lerp(1, 0.45, prog(t, T.html - 0.3, 0.6));
      else if (r.kind === "static") a = flyS[r.i] > 0 ? ghost : 1;
      else if (r.kind === "expr") a = flyV[r.k] > 0 ? ghost : 1;
      else if (r.kind === "delim") color = B[r.k];
      else if (r.kind === "tick" && tickU > 0) return { alpha: litA, color: blendHex(SYN.punct, "#ffffff", tickU), weight: 700 };
      else if (r.kind === "tag" && tagU > 0) return { alpha: litA, color: blendHex(SYN.fn, "#ffffff", tagU) };
      return { alpha: lerp(a, ctxAlpha(r), litMove) * litA, color };
    });
    // underlines: html, then the two backticks
    const bar = (r, u, inset) => withAlpha(ctx, u * breathe * litA, () => withGlow(ctx, rgba(C.accent, 0.9), 12, () =>
      fillRR(ctx, r.x + inset, r.y + r.h - 1, r.w - 2 * inset, 4, 2, C.accent)));
    if (tagU > 0) bar(hr, tagU, 1);
    if (tickU > 0) {
      for (let n = 0; n < 2; n++) {
        const b = code.find("`", n);
        bar(rectAt(ctx, code, LP, b.line, b.col, b.len), tickU, 4);
      }
    }
    // "tagged template literal"
    const lbl = window(t, T.tagged, T.split + 0.4, 0.45, 0.5);
    if (lbl > 0) {
      const b = code.find("`", 0);
      const r = rectAt(ctx, code, LP, b.line, b.col, b.len);
      text(ctx, "tagged template literal", r.x + r.w + 40 + 16 * (1 - ease.outCubic(clamp(lbl))), r.y + r.h / 2 + 1,
        { font: sans(34, 650), color: C.accent, baseline: "middle", alpha: lbl * litA });
    }
  }

  // ------------------------------------------------ flights: strings, up
  const aS = adv(ARR);
  for (let i = 3; i >= 0; i--) {
    const u = flyS[i];
    if (u <= 0 || u >= 1) continue;
    const e = ease.inOutCubic(u);
    const c = SG.cells[i];
    const x0 = c.x + (c.w - literalText(g.strings[i]).length * aS) / 2;
    const ty = c.y + c.h / 2 + 1;
    // the cell forms under the arriving text: box, then quotes and \n
    withAlpha(ctx, smooth(0.62, 1, u), () => {
      fillRR(ctx, c.x, c.y, c.w, c.h, 9, C.panel2);
      strokeRR(ctx, c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1, 9, C.border, 1.2);
    });
    for (const d of g.dims[i]) text(ctx, d.text, x0 + d.off * aS, ty, { font: mono(ARR, 500), color: C.text3, baseline: "middle", alpha: smooth(0.8, 1, u) });
    for (const f of g.frags[i]) {
      const src = { x: LP.x + f.col * adv(LIT) * LP.k, y: midY(code, LP, f.line, g.mid) };
      const dst = { x: x0 + f.off * aS, y: ty };
      const p = arc(src, dst, e, (dst.x - src.x) * 0.1);
      const size = lerp(LIT * LP.k, ARR, e);
      const w = f.len * adv(size), h = size * 1.5, px = size * 0.32;
      // leading spaces aren't part of the plate
      const lead = (code.lines[f.line].slice(f.col).match(/^ */)[0].length) * adv(size);
      plate(ctx, p.x + lead - px, p.y - h / 2, w - lead + 2 * px, h, { alpha: smooth(0, 0.12, u) * (1 - smooth(0.75, 1, u)), stroke: rgba(C.text3, 0.5) });
      drawRun(ctx, f.toks, f.col, p.x, p.y, size, (tok) => blendHex(KIND_COLOR[tok.kind], C.text, smooth(0.1, 0.8, u)));
    }
  }

  // ---------------------------------- flights: expressions, down, evaluated
  // (drawn last-first, so the one further along is on top)
  for (let k = 2; k >= 0; k--) {
    const u = flyV[k];
    if (u <= 0 || u >= 1) continue;
    const e = ease.inOutCubic(u);
    const ex = g.exprs[k];
    const sr = rectAt(ctx, code, LP, ex.line, ex.col, ex.len);
    const cell = V0.cells[k];
    const pad = 12;
    const from = { x: sr.x - pad, y: sr.y - 2, w: sr.w + 2 * pad, h: sr.h + 4 };
    const box = mix(from, cell, e);
    const ctr0 = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
    const ctr1 = { x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 };
    const pc = arc(ctr0, ctr1, e, (ctr1.x - ctr0.x) * -0.12);
    box.x = pc.x - box.w / 2;
    box.y = pc.y - box.h / 2;
    const boxA = smooth(0, 0.15, u);
    plate(ctx, box.x, box.y, box.w, box.h, { fill: C.panel, alpha: boxA * (1 - smooth(0.7, 1, u)) });
    withAlpha(ctx, boxA, () => {
      fillRR(ctx, box.x, box.y, box.w, box.h, 9, rgba(B[k], 0.1));
      strokeRR(ctx, box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1, 9, rgba(B[k], 0.55), 2);
    });
    const size = lerp(LIT * LP.k, ARR, e);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, 9);
    ctx.clip();
    const exW = ex.len * adv(size);
    drawRun(ctx, ex.toks, ex.col, pc.x - exW / 2, pc.y + 1, size, (tok) => blendHex(KIND_COLOR[tok.kind], B[k], smooth(0, 0.3, u)), 1 - smooth(0.15, 0.42, u));
    ctx.restore();
    text(ctx, vals[0][k], pc.x, pc.y + 1, { font: mono(size, 500), color: B[k], align: "center", baseline: "middle", alpha: smooth(0.38, 0.68, u) });
  }

  // ------------------------------------------ html(strings, ...values)
  const callA = callU > 0 ? callFade : 0;
  if (callA > 0) {
    const both = window(t, T.both, T.result + 0.5, 0.35, 0.5);
    const argsA = prog(t, T.call + 0.4, 0.45);
    // the `html` token travels from the literal into the call
    const h = code.find("html");
    // (from where the literal's own html is when the call starts: the literal is moving too)
    const L0 = mix(P1, LIT_P2, prog(T.call, T.call - 0.3, 0.8));
    const hFrom = { x: L0.x + h.col * adv(LIT) * L0.k, y: L0.y, k: (LIT / CALL) * L0.k };
    const hp = callU < 1 ? mix(hFrom, CP, ease.inOutCubic(callU)) : CP;
    // "html does almost nothing": the function, ringed
    const fnU = window(t, T.result, T.object + 0.3, 0.4, 0.4);
    if (fnU > 0) {
      const f = g.call.find("html");
      ring(ctx, { ...rectAt(ctx, g.call, CP, f.line, f.col, f.len), color: C.accent, u: fnU * callA, r: 8, pad: 5 });
    }
    // washes on the two arguments ("with both")
    if (both > 0) {
      for (const name of ["strings", "values"]) {
        const f = g.call.find(name);
        const r = rectAt(ctx, g.call, CP, f.line, f.col, f.len);
        withAlpha(ctx, both * callA, () => fillRR(ctx, r.x - 5, r.y - 2, r.w + 10, r.h + 4, 8, rgba(C.accent, 0.22)));
      }
    }
    const pulseOne = pulse(t, T.one - 0.45, 0.9);
    const argStyle = (tok) => (tok.kind === "fn" ? { hide: true } : { alpha: callA * argsA, color: tok.text === "strings" || tok.text === "values" ? C.text : undefined });
    if (pulseOne > 0) withGlow(ctx, rgba(C.accent, 0.8 * pulseOne), 24 * pulseOne, () => drawCodeAt(ctx, g.call, CP, argStyle));
    else drawCodeAt(ctx, g.call, CP, argStyle);
    drawCodeAt(ctx, g.call, hp, (tok) => (tok.kind === "fn" ? { alpha: callA } : { hide: true }));
    // connectors: the two arrays go into the call
    if (both > 0) {
      const fs = g.call.find("strings"), fv = g.call.find("values");
      const rs = rectAt(ctx, g.call, CP, fs.line, fs.col, fs.len);
      const rv = rectAt(ctx, g.call, CP, fv.line, fv.col, fv.len);
      const u = prog(t, T.both, 0.6);
      const sx = rs.x + rs.w / 2, vx = rv.x + rv.w / 2;
      cable(ctx, { x: sx, y: SG.y + SG.h + FR }, { x: sx, y: SG.y + SG.h + 110 }, { x: sx, y: rs.y - 110 }, { x: sx, y: rs.y - 8 },
        { color: rgba(C.accent, 0.9), progress: u, alpha: both, width: 2.5, dash: [8, 7] });
      const v0c = V0.x + V0.w / 2;
      cable(ctx, { x: v0c, y: V0.y - FR }, { x: v0c, y: V0.y - 120 }, { x: vx, y: rv.y + rv.h + 110 }, { x: vx, y: rv.y + rv.h + 8 },
        { color: rgba(C.accent, 0.9), progress: u, alpha: both, width: 2.5, dash: [8, 7] });
    }
  }

  // ------------------------------------------------ the TemplateResults
  const nameGlow = window(t, T.name, T.nothing + 0.4, 0.4, 0.6) * (0.8 + 0.2 * Math.sin((t - T.name) * 4));
  const results = [
    { pop: T.object + 0.3, s: prog(t, T.rs, 0.6), v: prog(t, T.rv, 0.6), glow: nameGlow, pulse: pulse(t, T.every, 1.2) },
    { pop: T.one - 0.2, s: prog(t, T.same, 0.9), v: prog(t, T.newv + 0.3, 0.5), glow: 0, pulse: pulse(t, T.every + 0.4, 1.2) },
  ];
  results.forEach((R, n) => {
    const a = prog(t, R.pop, 0.25);
    if (a <= 0) return;
    // each result leaves the call small, and grows as it settles; #1 arcs over #0
    const callRight = CP.x + g.call.cols * adv(CALL) * CP.k;
    const from = { x: callRight + 24, y: callC.y };
    const to = { x: cardC[n].x + cw / 2, y: cardC[n].y + ch / 2 };
    let grow, c;
    if (n === 0) {
      grow = lerp(0.3, 1, prog(t, R.pop, 0.8, ease.inOutCubic));
      c = mix(from, to, prog(t, R.pop, 0.8, ease.outCubic));
    } else {
      const u = clamp((t - R.pop) / 1.1);
      grow = lerp(0.3, 1, smooth(0.62, 1, u));
      c = arc(from, to, ease.inOutCubic(u), -(to.x - from.x) * 0.5);
    }
    const pos = { x: c.x - cw / 2, y: c.y - ch / 2 };
    const kg = templateResultCard(ctx, { x: pos.x, y: pos.y, size: CARD, alpha: 0 });
    refArrows(ctx, kg, SG, VA[n], { s: R.s, v: R.v, side: n, glow: R.pulse });
    let K;
    withScale(ctx, grow, pos.x + cw / 2, pos.y + ch / 2, () => {
      K = templateResultCard(ctx, { x: pos.x, y: pos.y, size: CARD, alpha: a, glow: 0.45 * R.glow });
    });
    if (n === 0) {
      if (R.glow > 0) {
        // "That object is called a template result": the title, ringed
        withAlpha(ctx, R.glow, () => withGlow(ctx, rgba(OBJ.result, 0.9), 18, () =>
          strokeRR(ctx, K.x + 6, K.y + 5, K.w - 12, 38, 9, rgba(OBJ.result, 0.95), 2.5)));
      }
      rowHighlights(ctx, K, [window(t, T.rn, T.name, 0.3, 0.5), window(t, T.rs, T.rv + 0.25, 0.3, 0.5), window(t, T.rv, T.rn, 0.3, 0.5)]);
      // 1 = HTML
      const htmlU = window(t, T.rh, T.again, 0.4, 0.35);
      if (htmlU > 0) {
        const r = K.row(0);
        chip(ctx, { x: r.x - 22 - 12 * (1 - ease.outCubic(clamp(htmlU))), y: r.y + r.h / 2 - 20, text: "1 = HTML", align: "right", color: C.text, bg: C.panel3, border: C.border2, font: mono(24, 550), h: 40, alpha: htmlU });
      }
    }
    // counter(0), over its card as it moves aside
    if (n === 0) text(ctx, "counter(0)", pos.x + cw / 2, pos.y - 22, { font: mono(28, 550), color: C.text2, align: "center", alpha: prog(t, T.again + 0.2, 0.45) });
  });
  // counter(1): the label marks the spot before the card flies in
  text(ctx, "counter(1)", cardC[1].x + cw / 2, cardC[1].y - 22, { font: mono(28, 550), color: C.text2, align: "center", alpha: prog(t, T.c1, 0.45) });

  // ------------------------------------------------ === badge
  const bad = prog(t, T.ident, 0.5, ease.outCubic);
  if (bad > 0) {
    const s = "counter(0).strings === counter(1).strings";
    const res = String(truth().counter.sameStrings);
    const sz = 26, pad = 22, gap = 16;
    const tw = s.length * adv(sz), aw = measure(ctx, "→", sans(28, 500)), rw = res.length * adv(sz);
    const w = pad + tw + gap + aw + gap + rw + pad;
    const y = VAL_Y + V0.h / 2;
    const x = 60;
    withAlpha(ctx, bad, () => {
      fillRR(ctx, x, y - 32, w, 64, 14, C.panel2);
      strokeRR(ctx, x + 0.5, y - 31.5, w - 1, 63, 14, C.border2, 1.5);
      text(ctx, s, x + pad, y + 1, { font: mono(sz, 550), color: C.text, baseline: "middle" });
      const tv = prog(t, T.ident + 0.55, 0.4);
      text(ctx, "→", x + pad + tw + gap, y, { font: sans(28, 500), color: C.text3, baseline: "middle", alpha: tv });
      text(ctx, res, x + pad + tw + gap + aw + gap, y + 1, { font: mono(sz, 700), color: C.ok, baseline: "middle", alpha: tv });
    });
  }

  // ------------------------------------------------ the rule: literal -> strings array
  if (bright > 0) {
    const P = LIT_P2;
    const ax = P.x + 29 * adv(SMALL);
    const top = { x: ax, y: P.y - 6 };
    const bot = { x: ax, y: SG.y + SG.h + FR };
    cable(ctx, top, { x: ax, y: top.y - 40 }, { x: ax, y: bot.y + 40 }, bot, { color: rgba(C.text2, 0.9), width: 3, progress: prog(t, T.once, 0.6), head: 12 });
    const l1 = prog(t, T.once + 0.3, 0.4), l2 = prog(t, T.every, 0.4);
    text(ctx, "made once", ax + 26, (top.y + bot.y) / 2 - 18, { font: sans(28, 650), color: C.text, baseline: "middle", alpha: l1 });
    text(ctx, "reused every run", ax + 26, (top.y + bot.y) / 2 + 20, { font: sans(28, 500), color: C.text2, baseline: "middle", alpha: l2 });
  }

  // ------------------------------------------------ cache key
  const keyU = prog(t, T.tagk, 0.5, ease.outBack);
  if (keyU > 0) {
    // a tag: key glyph + "cache key", hanging over the array's right end
    const f = sans(26, 650), h = 48;
    const w = 18 + 48 + 14 + measure(ctx, "cache key", f) + 20;
    const x = SG.x + SG.w - w, y = SG.y - FR - h - 16;
    withAlpha(ctx, clamp(keyU), () => {
      withScale(ctx, clamp(keyU, 0, 1.2), x + w / 2, y + h, () => {
        fillRR(ctx, x, y, w, h, h / 2, rgba(OBJ.cache, 0.12));
        strokeRR(ctx, x + 1, y + 1, w - 2, h - 2, h / 2 - 1, rgba(OBJ.cache, 0.75), 2);
        drawKey(ctx, x + 18 + 10, y + h / 2, 0.95, OBJ.cache);
        text(ctx, "cache key", x + 18 + 48 + 14, y + h / 2 + 1, { font: f, color: OBJ.cache, baseline: "middle" });
      });
    });
  }

  // ------------------------------------------------ captions
  const noth = window(t, T.nothing, T.again, 0.4, 0.4);
  text(ctx, "nothing parsed · no DOM touched", 960, 985, { font: sans(32, 500), color: C.text2, align: "center", baseline: "middle", alpha: noth });
  const mean = prog(t, T.meaning, 0.45);
  text(ctx, "same strings array → same template", 960, 985, { font: sans(34, 650), color: C.text, align: "center", baseline: "middle", alpha: mean });
}

// A point on the quadratic arc from a to b (bend: px, perpendicular to the chord).
function arc(a, b, u, bend) {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const dx = b.x - a.x, dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const c = { x: mx - (dy / len) * bend, y: my + (dx / len) * bend };
  return {
    x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u * u * b.x,
    y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u * u * b.y,
  };
}

// Arrows from a TemplateResult card's strings and values ports to the arrays.
// Card 0's strings arrow rises between the cards; card 1's goes round its right side.
function refArrows(ctx, K, SG, V, { s, v, side, glow }) {
  const col = rgba(C.accent, 0.9);
  const ps = K.ports.strings, pv = K.ports.values;
  if (s > 0) {
    const a = { x: ps.x + 9, y: ps.y };
    if (side === 0) {
      const end = { x: K.x + K.w + 66, y: SG.y + SG.h + FR };
      cable(ctx, a, { x: end.x + 10, y: a.y }, { x: end.x, y: end.y + 120 }, end, { color: col, width: 3, progress: s, glow });
    } else {
      const end = { x: Math.min(SG.x + SG.w - 50, K.x + K.w - 40), y: SG.y + SG.h + FR };
      cable(ctx, a, { x: 1905, y: a.y }, { x: 1890, y: end.y + 70 }, end, { color: col, width: 3, progress: s, glow });
    }
  }
  if (v > 0) {
    const a = { x: pv.x + 9, y: pv.y };
    const end = { x: V.x + V.w - 40, y: V.y - FR };
    cable(ctx, a, { x: a.x + 60, y: a.y }, { x: end.x, y: end.y - 110 }, end, { color: col, width: 3, progress: v, glow });
  }
}

// A quiet frame around an array (cells() geometry): the array as one object,
// for arrows to point at.
const FR = 14;
function arrayFrame(ctx, A, alpha) {
  withAlpha(ctx, alpha, () => {
    fillRR(ctx, A.x - FR, A.y - FR, A.w + 2 * FR, A.h + 2 * FR, 14, rgba(C.panel, 0.55));
    strokeRR(ctx, A.x - FR + 0.5, A.y - FR + 0.5, A.w + 2 * FR - 1, A.h + 2 * FR - 1, 14, rgba(C.border2, 0.7), 1.5);
  });
}

// Highlights card rows (drawn over the card, like a highlighter).
function rowHighlights(ctx, K, us) {
  us.forEach((u, i) => {
    if (u <= 0 || !K) return;
    const r = K.row(i);
    withAlpha(ctx, u, () => {
      fillRR(ctx, r.x, r.y + 3, r.w, r.h - 6, 8, rgba(C.accent, 0.16));
      strokeRR(ctx, r.x, r.y + 3, r.w, r.h - 6, 8, rgba(C.accent, 0.7), 2);
    });
  });
}
