// parser: lit-html hands one HTML string to a <template>'s innerHTML and the
// browser's parser does the work; the result is inert (a separate document
// with no browsing context); `<?` used to become a comment, and since June
// 2026 HTML has real processing instructions; lit-html's markers still come
// out as comments, and the tokenizer (replayed step by step from the spec
// in parser-tokenizer.js) shows why, ending on the comment lit-html looks
// for.
//
// Four parts, each drawn by its own function from the scene's marks:
//   A  html … irregular      the string → innerHTML → the parser → <template>
//   B  inert … elements      two documents; what doesn't happen in inert DOM
//   C  markers … pi          the tag open state, before and after; streaming
//   D  still … exact         the tokenizer walking <?lit$480592716$>

import { platformTruth, truth } from "../timing.js";
import { B, C, DOMC, SYN, blend, rgba } from "../kit/theme.js";
import { along, arrow, check, chip, cross, fillRR, measure, mono, monoAdvance, panel, ring, sans, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { Code } from "../kit/code.js";
import { Tree } from "../kit/tree.js";
import { clamp, ease, lerp, mix, prog, pulse, window } from "../util.js";
import { STATE, nodeOf, targetClass, tokenize } from "./parser-tokenizer.js";
import { PLAT, evalBadge, platformTag } from "./intro-platform.js";
import {
  GOLD, charCells, domTree, frostOver, frosted, inertIcon, linked, monoPieces, parseTemplate, piecesLen, quoteRule, sentence, sentenceW,
  specPanel, tagText,
} from "./parser-kit.js";

export const transition = "fade";

const PI_COLOR = "#9db4ff";       // processing instruction nodes (DOM tag colour)
const LINK = PLAT;                // terms that are links in the spec (the platform accent)

// ------------------------------------------------------------------ model

let M = null;
function model() {
  if (M) return M;
  const P = platformTruth().parser;
  const T1 = truth();
  const marker = P.marker;                     // lit$480592716$
  const src = `<?${marker}>`;                  // lit-html's nodeMarker
  const walk = tokenize(src);
  const lit = P.results.find((r) => r.src === src);
  const prof = P.results.find((r) => r.src.startsWith("<?marker"));
  // the replay must produce what Chromium produced
  const ok = P.results.every((r) => {
    const n = nodeOf(tokenize(r.src).tokens[0]);
    return n.node === r.node && n.data === r.data && (n.target ?? null) === (r.target ?? null);
  }) && marker === T1.marker && src === `<${T1.markerMatch}>`;
  const legacyLit = tokenize(src, { legacy: true }).tokens[0];
  const legacyProf = tokenize(prof.src, { legacy: true }).tokens[0];
  // the counter's template content (truth), and two irregular examples from
  // the HTML Standard, parsed by this browser
  const content = new Tree(T1.counter.prepare.parsed, { size: 28, whitespace: "hide", inline: true });
  const ex = EXAMPLES.map((e) => ({ ...e, tree: domTree(parseTemplate(e.src), { size: 24, whitespace: "hide", inline: true, lineHeight: 1.45 }) }));
  M = {
    P, marker, src, walk, lit, prof, ok, legacyLit, legacyProf, content, ex,
    html: htmlLines(T1.counter.prepare.html, marker),
    chrome: /Chrome\/(\d+)/.exec(platformTruth().userAgent)?.[1] ?? null,
  };
  return M;
}

// Irregular HTML, copied from the HTML Standard's own examples: the
// unquoted attribute value syntax, and a list whose </li> end tags are
// omitted (the <ol> example; its first two items).
const EXAMPLES = [
  { src: "<input value=yes>", lines: ["<input value=yes>"] },
  { src: "<ol>\n <li>Switzerland\n <li>United Kingdom\n</ol>", lines: ["<ol>", " <li>Switzerland", " <li>United Kingdom", "</ol>"] },
];

// The annotated HTML (truth counter.prepare.html) as display lines of
// coloured pieces; markers in their binding's colour, in order.
function htmlLines(html, m) {
  const lines = html.split("\n");
  if (lines[0] === "") lines.shift();
  let k = 0;
  return lines.map((line) => {
    const out = [];
    let i = 0, inTag = false;
    const push = (t, color) => out.push({ text: t, color });
    while (i < line.length) {
      const pi = `<?${m}>`;
      if (line.startsWith(pi, i)) { push(pi, B[k++]); i += pi.length; continue; }
      if (line.startsWith(m, i)) { push(m, B[k++]); i += m.length; continue; }
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
}

// Source HTML (not DOM) coloured like the code views: tags, attribute
// names, values (quoted or not), text.
function srcPieces(line) {
  const out = [];
  let i = 0, inTag = false;
  while (i < line.length) {
    const c = line[i];
    if (!inTag) {
      if (c === "<") {
        const t = /^<(\/|\?)?([a-zA-Z][\w-]*)?/.exec(line.slice(i));
        out.push({ text: "<" + (t[1] ?? ""), color: SYN.htmlPunct });
        if (t[2]) out.push({ text: t[2], color: SYN.tag });
        i += t[0].length;
        inTag = true;
        continue;
      }
      let j = i;
      while (j < line.length && line[j] !== "<") j++;
      out.push({ text: line.slice(i, j), color: SYN.text });
      i = j;
      continue;
    }
    if (c === ">") { out.push({ text: ">", color: SYN.htmlPunct }); inTag = false; i++; continue; }
    if (c === " ") { out.push({ text: " ", color: SYN.text }); i++; continue; }
    if (c === "=") {
      out.push({ text: "=", color: SYN.htmlPunct });
      i++;
      let j = i;
      if (line[j] === '"') { j = line.indexOf('"', j + 1) + 1; }
      else while (j < line.length && !/[\s>]/.test(line[j])) j++;
      out.push({ text: line.slice(i, j), color: SYN.attrValue });
      i = j;
      continue;
    }
    let j = i;
    while (j < line.length && !/[\s=>]/.test(line[j])) j++;
    out.push({ text: line.slice(i, j), color: SYN.attr });
    i = j;
  }
  return out;
}

// ------------------------------------------------------------------ timing

let TT = null, TT_KEY = null;
function times(S) {
  if (TT && TT_KEY === S.start) return TT;
  const m = (k) => S.m(k);
  const w = (p, x, n = 0) => S.word(p, x, n);
  const T = {
    // A
    html: m("html"), noparser: m("noparser"),
    one: w(0, "one"), sets: w(0, "sets"), innerW: w(0, "inner"),
    native: m("native"), parserW: w(0, "parser"), nativeW: w(0, "native"), fast: w(0, "fast"),
    irregular: m("irregular"), spec: w(0, "spec"), including: w(0, "including"), irregularW: w(0, "irregular"), pages: w(0, "pages"),
    // B
    inert: m("inert"), inertW: w(1, "inert"), contents: w(1, "contents"),
    separate: w(1, "separate"), browsing: w(1, "browsing"),
    scripts: m("scripts"), images: m("images"), elements: m("elements"), upgrade: w(1, "upgrade"),
    // C
    markers: m("markers"), question0: w(2, "question", 0), comment: m("comment"), anything: w(2, "anything"),
    intoComment: w(2, "into", 0), news: m("news"), processing0: w(2, "processing", 0), streaming: w(2, "streaming"),
    place: w(2, "place"), pi: m("pi"), specW: w(2, "spec"), chrome: w(2, "chrome"), becomes: w(2, "becomes"),
    // D
    still: m("still"), comments: w(3, "comments"), dollar: m("dollar"), name0: w(3, "name", 0), can: w(3, "can"),
    letters: w(3, "letters"), digits: w(3, "digits"), hyphens: w(3, "hyphens"), underscores: w(3, "underscores"),
    dollarW: w(3, "dollar"), invalidW: w(3, "invalid"), fallback: m("fallback"),
    turn: w(3, "turn"), what: w(3, "what"), commentW: w(3, "comment", 0), question: w(3, "question"),
    exact: m("exact"), exactly: w(3, "exactly"), looks: w(3, "looks"),
  };
  // the walk: when each step of the replay happens (see walkTimes)
  T.walkIn = T.comments + 0.55;
  T.errorLine = T.invalidW - 0.15;
  T.convertLine = T.fallback + 0.2;
  T.token = T.turn - 0.15;
  T.fill = T.what - 0.1;
  T.reconsumeLine = T.commentW + 0.05;
  T.bogus0 = T.commentW + 0.8;
  TT = T;
  TT_KEY = S.start;
  return T;
}

// The time of each step of the walk (index into model().walk.steps).
let WT = null, WT_KEY = null;
function walkTimes(T) {
  if (WT && WT_KEY === T.still) return WT;
  const steps = M.walk.steps;
  const out = [];
  let k = 0;
  steps.forEach((s, n) => {
    let t;
    if (n === 0) t = T.dollar + 0.05;                       // '<'
    else if (n === 1) t = T.dollar + 0.65;                  // '?'
    else if (n === 2) t = T.name0 - 0.05;                   // 'l': reconsume
    else if (s.state === "piTarget" && !s.error) t = T.letters - 0.08 + 0.32 * (n - 3);   // l i t
    else if (s.error) t = T.dollarW - 0.12;                 // '$': invalid
    else if (s.state === "bogus" && !s.emit) t = T.bogus0 + 0.12 * k++;
    else t = T.bogus0 + 0.12 * k + 0.22;                    // '>': emit
    out.push(t);
  });
  WT = out;
  WT_KEY = T.still;
  return out;
}

// ------------------------------------------------------------------ the scene

export function draw(F, S) {
  const { ctx, t } = F;
  model();
  const T = times(S);
  drawA(ctx, t, T);
  drawTemplateBox(ctx, t, T);      // made in A, the inert document in B
  drawB(ctx, t, T);
  drawC(ctx, t, T);
  drawD(ctx, t, T);
  if (!M.ok) text(ctx, "parser: tokenizer replay does not match truth", 60, 1050, { font: mono(24, 700), color: C.bad });
}

// ================================================================== A: the string, innerHTML, the parser

// The string frame: centred and large, then the left column.
const STR_C = { size: 30, x: 420, y: 420 };
const STR_L = { size: 22, x: 96, y: 246 };
const CODE_SIZE = 28;
let CODE = null;
// lit-html.ts, Template.createElement (the two lines, as written)
const createCode = () => (CODE ??= new Code("const el = d.createElement('template');\nel.innerHTML = html as unknown as string;", { size: CODE_SIZE }));

const PARSER = { x: 1000, y: 180, w: 860, h: 206 };
const TPL_A = { x: 1000, y: 446, w: 860, k: 23 / 28 };
const TPL_M = { x: 430, y: 290, w: 1060 };        // centred while "inert" is the news
const TPL_B = { x: 800, y: 196, w: 1060, k: 1 };

function strState(t, T) {
  return mix(STR_C, STR_L, prog(t, T.native - 0.1, 0.9));
}

function drawA(ctx, t, T) {
  const out = 1 - prog(t, T.inert - 0.2, 0.5);
  if (out <= 0.001 || t < T.html - 0.6) return;
  withAlpha(ctx, out, () => {
    const focusDim = lerp(1, 0.45, prog(t, T.irregular + 0.2, 0.6));
    const P = strState(t, T);
    const adv = monoAdvance(ctx, P.size, 480);
    const lh = P.size * 1.5;
    const lines = M.html;
    const cols = Math.max(...lines.map((l) => piecesLen(l)));
    const w = cols * adv, h = lines.length * lh;

    // ---- the frame: "html · one string"
    const fin = prog(t, T.html - 0.5, 0.55, ease.outCubic);
    const fx = P.x - 36, fy = P.y - 46 - 10, fw = w + 72, fh = h + 46 + 26;
    withAlpha(ctx, fin * focusDim, () => withScale(ctx, lerp(0.94, 1, fin), fx + fw / 2, fy + fh / 2, () => {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      fillRR(ctx, fx, fy, fw, fh, 14, rgba(C.panel, 0.95));
      ctx.restore();
      const g = pulse(t, T.one - 0.15, 1.2);
      strokeRR(ctx, fx + 0.5, fy + 0.5, fw - 1, fh - 1, 14, blend(C.border2, C.accent, g), 1.5 + g);
      text(ctx, "html", fx + 22, fy + 27, { font: mono(24, 600), color: C.text2, baseline: "middle" });
      text(ctx, "one string", fx + fw - 22, fy + 27, { font: sans(22, 500 + 150 * g), color: blend(C.text3, C.text, g), baseline: "middle", align: "right" });
      lines.forEach((l, i) => monoPieces(ctx, l, P.x, P.y + i * lh + lh / 2, P.size));
    }));

    // ---- "lit-html doesn't parse HTML itself"
    const np = prog(t, T.noparser - 0.1, 0.45) * (1 - prog(t, T.native - 0.2, 0.4));
    if (np > 0) {
      const y = fy - 62;
      withAlpha(ctx, np, () => {
        const lw = text(ctx, "lit-html", fx, y, { font: sans(34, 700), color: C.text, baseline: "middle" });
        const c = chip(ctx, { x: fx + lw + 26, y: y - 22, h: 44, text: "HTML parser", font: sans(24, 600), color: C.text3, bg: rgba(C.text3, 0.08), border: rgba(C.text3, 0.4) });
        const su = prog(t, T.noparser + 0.5, 0.35);
        ctx.fillStyle = rgba(C.bad, 0.9);
        ctx.fillRect(c.x + 10, y - 1, (c.w - 20) * su, 3);
        cross(ctx, c.x + c.w + 30, y, 30, C.bad, prog(t, T.noparser + 0.75, 0.35));
      });
    }

    // ---- lit-html.ts: Template.createElement
    const code = createCode();
    const cw = code.width(ctx) + 64, chh = 40 + code.height + 18;
    const cpos = mix({ x: 960 - cw / 2, y: fy + fh + 44 }, { x: 60, y: 436 }, prog(t, T.native - 0.1, 0.9));
    const ci = prog(t, T.sets - 0.2, 0.45);
    if (ci > 0) {
      withAlpha(ctx, ci * focusDim, () => {
        panel(ctx, { x: cpos.x, y: cpos.y, w: cw, h: chh, title: "lit-html.ts", titleFont: mono(20, 500), titleColor: C.text3, header: 40 });
        text(ctx, "Template.createElement", cpos.x + cw - 18, cpos.y + 21, { font: mono(18, 450), color: C.text4, baseline: "middle", align: "right" });
        const cx = cpos.x + 32, cy = cpos.y + 48;
        const hl = window(t, T.innerW - 0.2, T.native + 1.2, 0.35, 0.5);
        if (hl > 0) {
          const f = code.find("innerHTML");
          const r = code.rect(ctx, cx, cy, f.line, f.col, f.len);
          withAlpha(ctx, hl, () => fillRR(ctx, r.x - 5, r.y - 2, r.w + 10, r.h + 4, 7, rgba(PLAT, 0.22)));
        }
        code.draw(ctx, cx, cy, { style: (tok) => ({ alpha: tok.line === 0 ? 1 : prog(t, T.sets + 0.35, 0.4) }) });
      });
    }

    // ---- the browser's parser, and what it makes
    const pu = prog(t, T.parserW - 0.35, 0.5, ease.outBack);
    if (pu > 0) {
      const { x, y, w: pw, h: ph } = PARSER;
      withAlpha(ctx, clamp(pu), () => withScale(ctx, lerp(0.85, 1, pu), x + pw / 2, y + ph / 2, () => {
        const glow = 0.6 * pulse(t, T.parserW, 1.2) + 0.5 * pulse(t, T.spec, 1.2);
        panel(ctx, { x, y, w: pw, h: ph, border: rgba(PLAT, 0.5) });
        fillRR(ctx, x, y, pw, ph, 16, rgba(PLAT, 0.05));
        if (glow > 0) withGlow(ctx, rgba(PLAT, 0.7 * glow), 28 * glow, () => strokeRR(ctx, x, y, pw, ph, 16, rgba(PLAT, glow), 2.5));
        platformTag(ctx, { x: x + 34, y: y + 26, text: "the browser", h: 40, font: sans(22, 650) });
        text(ctx, "HTML parser", x + 40, y + 116, { font: sans(52, 700), color: C.text, baseline: "middle" });
        const chips = [
          { t0: T.nativeW - 0.15, label: "native code" },
          { t0: T.fast - 0.15, label: "fast" },
        ];
        let cx = x + 40;
        chips.forEach((c) => {
          const u = prog(t, c.t0, 0.35, ease.outBack);
          const r = chip(ctx, { x: cx, y: y + 150, h: 40, text: c.label, font: sans(22, 600), color: C.text, bg: rgba(PLAT, 0.1), border: rgba(PLAT, 0.5), alpha: clamp(u) });
          cx += r.w + 14;
        });
        // "follows the spec exactly"
        const su = prog(t, T.spec - 0.15, 0.4, ease.outBack);
        if (su > 0) {
          const sx = x + pw - 34, sy = y + 26;
          withAlpha(ctx, clamp(su), () => withScale(ctx, lerp(0.8, 1, su), sx - 110, sy + 22, () => {
            const g = platformTag(ctx, { x: sx, y: sy, text: "HTML Standard", glyph: "doc", align: "right", h: 44, font: sans(23, 650) });
            text(ctx, "followed exactly", g.x + g.w / 2, sy + 72, { font: sans(21, 500), color: C.text3, align: "center", baseline: "middle", alpha: prog(t, T.spec + 0.25, 0.4) });
          }));
        }
      }));
      // innerHTML → the parser
      const au = prog(t, T.parserW - 0.1, 0.6);
      if (au > 0) {
        const f = code.find("innerHTML");
        const r = code.rect(ctx, cpos.x + 32, cpos.y + 48, f.line, f.col, f.len);
        const a0 = { x: cpos.x + cw + 12, y: r.y + r.h / 2 }, a1 = { x: PARSER.x - 14, y: PARSER.y + PARSER.h / 2 + 20 };
        arrow(ctx, a0, a1, { color: PLAT, width: 3.5, progress: au, bend: -40, alpha: focusDim });
        // the string travels along it
        const fly = prog(t, T.parserW + 0.15, 0.8, ease.inOutCubic);
        if (fly > 0 && fly < 1) {
          const p = along(a0, a1, fly, -40);
          chip(ctx, { x: p.x, y: p.y - 19, h: 38, align: "center", text: "html", font: mono(22, 600), color: C.text, bg: C.panel3, border: C.border2, r: 8, alpha: Math.min(1, Math.sin(Math.PI * fly) * 2.5) });
        }
      }
    }
  });
  // irregular HTML
  drawIrregular(ctx, t, T, out);
}

// The template element's box: made under the parser (A), then the inert
// template document's panel (B).
function tplRect(t, T) {
  const u = prog(t, T.inert - 0.05, 0.9);
  const v = prog(t, T.separate - 0.65, 0.65);
  const k = lerp(TPL_A.k, TPL_B.k, u);
  const h = 70 + (1 + M.content.rows.length) * M.content.lh * k + 28;
  const a = { x: TPL_A.x, y: TPL_A.y, w: TPL_A.w };
  const b = { x: TPL_B.x, y: TPL_B.y, w: TPL_B.w };
  return { ...mix(mix(a, TPL_M, u), b, v), h: lerp(h, h + 24, u), k };
}

function drawTemplateBox(ctx, t, T) {
  const appear = prog(t, T.parserW + 0.75, 0.5, ease.outBack);
  const out = 1 - prog(t, T.markers + 0.3, 0.5);
  if (appear <= 0 || out <= 0) return;
  const r = tplRect(t, T);
  const tree = M.content;
  const k = r.k;
  const head = 60;
  const doc = prog(t, T.separate + 0.05, 0.5);          // becomes the inert template document
  const frost = prog(t, T.inertW - 0.3, 0.8);
  const sweep = prog(t, T.parserW + 1.0, 1.1, ease.inOutSine);
  withAlpha(ctx, clamp(appear) * out, () => withScale(ctx, lerp(0.9, 1, appear), r.x + r.w / 2, r.y + r.h / 2, () => {
    panel(ctx, { x: r.x, y: r.y, w: r.w, h: r.h, border: rgba(DOMC.tag, 0.45) });
    // header: "<template>", then the inert document's title
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(r.x, r.y, r.w, r.h, 16);
    ctx.clip();
    ctx.fillStyle = C.panel2;
    ctx.fillRect(r.x, r.y, r.w, head);
    ctx.fillStyle = C.border;
    ctx.fillRect(r.x, r.y + head - 1, r.w, 1);
    ctx.restore();
    const fly = prog(t, T.separate - 0.3, 0.8);   // the element moves to the page's document
    if (fly < 1) tagText(ctx, "template", r.x + 24, r.y + head / 2 + 1, 32, 1 - clamp(fly * 3));
    if (doc > 0) text(ctx, "inert template document", r.x + 24, r.y + head / 2 + 1, { font: sans(28, 650), color: C.text, baseline: "middle", alpha: doc });
    // chips: inert, no browsing context
    let cx = r.x + r.w - 20;
    const ic = prog(t, T.inertW - 0.2, 0.4, ease.outBack);
    if (ic > 0) {
      const c = chip(ctx, { x: cx, y: r.y + head / 2 - 19, h: 38, align: "right", text: "inert", font: sans(23, 650), color: C.text2, bg: rgba(C.text2, 0.1), border: rgba(C.text2, 0.45), alpha: clamp(ic) });
      cx -= c.w + 12;
    }
    const nb = prog(t, T.browsing - 0.35, 0.4, ease.outBack);
    if (nb > 0) chip(ctx, { x: cx, y: r.y + head / 2 - 19, h: 38, align: "right", text: "no browsing context", font: sans(23, 650), color: C.bad, bg: rgba(C.bad, 0.1), border: rgba(C.bad, 0.5), alpha: clamp(nb) });

    // the content: #document-fragment and its tree, swept in as it's parsed
    const x0 = r.x + 26, y0 = r.y + head + 14;
    const lh = tree.lh * k;
    const sweepY = lerp(y0, y0 + (1 + tree.rows.length) * lh, sweep);
    const rowA = (i) => clamp((sweepY - (y0 + i * lh)) / (lh * 0.9));
    const hlFrag = window(t, T.contents - 0.15, T.separate + 1.4, 0.3, 0.5);
    const markHl = prog(t, T.markers - 0.25, 0.35);
    const drawContent = (c) => {
      withAlpha(c, rowA(0), () => {
        if (hlFrag > 0) withAlpha(c, hlFrag, () => fillRR(c, x0 - 8, y0 + 4, measure(c, "#document-fragment", mono(28 * k, 450)) + 16, lh - 8, 8, rgba(C.accent, 0.2)));
        text(c, "#document-fragment", x0, y0 + lh / 2 + 1, { font: mono(28 * k, 450), color: hlFrag > 0 ? blend(C.text3, C.text, hlFrag) : C.text3, baseline: "middle" });
      });
      c.save();
      c.translate(x0 + 2 * tree.adv(c) * k, y0 + lh);
      c.scale(k, k);
      tree.draw(c, 0, 0, {
        rowStyle: (row) => ({ alpha: rowA(row.index + 1) }),
        style: (seg, row) => {
          if (seg.role === "attrValue") return { color: row.node.name === "span" ? B[0] : B[2] };
          if (seg.role === "comment") return { color: B[1] };
          return {};
        },
      });
      c.restore();
    };
    frosted(ctx, frost, drawContent);
    frostOver(ctx, { x: r.x + 8, y: r.y + head + 6, w: r.w - 16, h: r.h - head - 14 }, frost);
    // "those question mark markers": the comment, lit
    if (markHl > 0) {
      const row = tree.rows.find((q) => q.kind === "comment");
      const rr = tree.rowRect(ctx, 0, 0, row);
      const rx = x0 + 2 * tree.adv(ctx) * k + rr.x * k, ry = y0 + lh + rr.y * k;
      ring(ctx, { x: rx, y: ry, w: rr.w * k, h: rr.h * k, r: 8, color: B[1], u: markHl });
    }
    // parse sweep line
    if (sweep > 0 && sweep < 1) {
      withAlpha(ctx, Math.sin(Math.PI * sweep), () => withGlow(ctx, rgba(C.accent, 0.9), 14, () => fillRR(ctx, r.x + 16, sweepY - 1.5, r.w - 32, 3, 1.5, C.accent)));
    }
  }));
  // the arrow from the parser
  const au = prog(t, T.parserW + 0.6, 0.4) * (1 - prog(t, T.inert - 0.2, 0.4));
  if (au > 0) arrow(ctx, { x: PARSER.x + PARSER.w / 2, y: PARSER.y + PARSER.h + 8 }, { x: PARSER.x + PARSER.w / 2, y: TPL_A.y - 10 }, { color: PLAT, width: 3.5, progress: au, head: 12 });
}

// "including all the irregular ways real pages write HTML": two of the
// spec's examples, and the DOM this browser's parser made of them.
function drawIrregular(ctx, t, T, out) {
  const u0 = prog(t, T.including - 0.2, 0.45);
  if (u0 <= 0 || out <= 0) return;
  const x = 60, y = 628;
  withAlpha(ctx, out, () => {
    text(ctx, "irregular HTML, from the spec's examples", x + 4, y, { font: sans(24, 600), color: C.text2, baseline: "middle", alpha: u0 });
    let yy = y + 46;
    M.ex.forEach((e, n) => {
      const u = prog(t, (n === 0 ? T.irregularW - 0.25 : T.pages - 0.35), 0.45, ease.outCubic);
      const size = 24, lh = size * 1.45;
      const h = Math.max(e.lines.length, e.tree.rows.length) * lh;
      if (u > 0) withAlpha(ctx, u, () => {
        // the source, as written
        fillRR(ctx, x, yy - 6, 360, h + 12, 10, rgba(C.panel2, 0.8));
        e.lines.forEach((l, i) => monoPieces(ctx, srcPieces(l), x + 18, yy + i * lh + lh / 2, size));
        // → the DOM
        const ym = yy + Math.min(h, 2 * lh) / 2;
        arrow(ctx, { x: x + 378, y: ym }, { x: x + 452, y: ym }, { color: C.text3, width: 3, progress: prog(t, (n === 0 ? T.irregularW : T.pages - 0.1), 0.35), head: 10 });
        withAlpha(ctx, prog(t, (n === 0 ? T.irregularW + 0.15 : T.pages), 0.4), () => {
          fillRR(ctx, x + 470, yy - 6, 390, h + 12, 10, rgba(C.panel, 0.9));
          strokeRR(ctx, x + 470.5, yy - 5.5, 389, h + 11, 10, rgba(DOMC.tag, 0.35), 1.2);
          e.tree.draw(ctx, x + 488, yy - (e.tree.lh - lh) / 2);
        });
      });
      yy += h + 34;
    });
  });
}

// ================================================================== B: two documents

function drawB(ctx, t, T) {
  const inU = prog(t, T.separate - 0.25, 0.45);
  const out = 1 - prog(t, T.markers - 0.1, 0.5);
  if (inU <= 0 || out <= 0) return;
  const L = { x: 60, y: TPL_B.y, w: 640, h: tplRect(t, T).h };
  withAlpha(ctx, out, () => {
    // the page's document, with the template element in it
    withAlpha(ctx, inU, () => {
      panel(ctx, { x: L.x, y: L.y, w: L.w, h: L.h, title: "document", titleFont: sans(28, 650), titleColor: C.text, header: 60, border: rgba(DOMC.tag, 0.45) });
      const bc = prog(t, T.browsing - 0.2, 0.4, ease.outBack);
      if (bc > 0) platformTag(ctx, { x: L.x + L.w - 20, y: L.y + 11, h: 38, align: "right", text: "browsing context", font: sans(22, 650), alpha: clamp(bc) });
    });
    // the element flies over from the box's header
    const fly = prog(t, T.separate - 0.3, 0.8);
    const r = tplRect(t, T);
    const from = { x: r.x + 24, y: r.y + 31 };
    const to = { x: L.x + 64, y: L.y + 188 };
    const p = along(from, to, ease.inOutCubic(fly), -60);
    const size = lerp(32, 40, fly);
    if (fly > 0) {
      const w = tagText(ctx, "template", p.x, p.y, size, clamp(fly * 3));
      text(ctx, "el", to.x, to.y + 50, { font: mono(24, 500), color: C.text3, baseline: "middle", alpha: prog(t, T.separate + 0.5, 0.4) });
      // .content → the fragment
      const cu = prog(t, T.separate + 0.35, 0.7);
      if (cu > 0) {
        const a0 = { x: to.x + w + 22, y: to.y }, a1 = { x: r.x + 22, y: r.y + 60 + 14 + M.content.lh * r.k / 2 };
        withGlow(ctx, rgba(PLAT, 0.6), 8, () => {
          ctx.beginPath();
          ctx.arc(a0.x, a0.y, 7, 0, Math.PI * 2);
          ctx.fillStyle = PLAT;
          ctx.globalAlpha *= clamp(cu * 3);
          ctx.fill();
        });
        arrow(ctx, a0, a1, { color: PLAT, width: 3.5, progress: cu, bend: -30 });
        text(ctx, ".content", lerp(a0.x, a1.x, 0.42), lerp(a0.y, a1.y, 0.42) - 40, { font: mono(26, 550), color: PLAT, align: "center", baseline: "middle", alpha: prog(t, T.separate + 0.7, 0.4) });
      }
    }
    // what JavaScript sees (truth parser.inert)
    const I = M.P.inert;
    const lines = [
      { t0: T.separate + 0.4, expr: "el.content.ownerDocument === document", val: String(I.contentOwnerIsPage) },
      { t0: T.browsing - 0.1, expr: "el.content.ownerDocument.defaultView", val: I.contentOwnerHasWindow ? "Window" : "null" },
    ];
    lines.forEach((ln, i) => {
      const u = prog(t, ln.t0, 0.45);
      if (u <= 0) return;
      evalBadge(ctx, { x: L.x + 14 * (1 - u), y: L.y + L.h + 30 + i * 74, expr: ln.expr, result: ln.val, resultColor: SYN.keyword, alpha: u, resultU: prog(t, ln.t0 + 0.35, 0.35), h: 58 });
    });
    // what doesn't happen in inert content
    const facts = [
      { kind: "script", label: "scripts don't run", t0: T.scripts - 0.2 },
      { kind: "image", label: "images don't load", t0: T.images - 0.2 },
      { kind: "element", label: "custom elements don't upgrade", t0: T.elements - 0.2 },
    ];
    const s = 100, y0 = 766;
    const xs = [60, 620, 1180];
    facts.forEach((f, i) => {
      const u = prog(t, f.t0, 0.45, ease.outBack);
      if (u <= 0) return;
      inertIcon(ctx, f.kind, xs[i], y0, s, u, prog(t, f.t0 + 0.45, 0.35));
      text(ctx, f.label, xs[i] + s + 26 - 12 * (1 - clamp(u)), y0 + s / 2 + 1, { font: sans(32, 600), color: C.text, baseline: "middle", alpha: clamp(u) });
    });
    // truth: the copy made by importNode does upgrade
    const iu = prog(t, T.upgrade + 0.25, 0.45);
    if (iu > 0 && M.P.inert.elementUpgradedAfterImport) {
      text(ctx, "(the copy from importNode does)", xs[2] + s + 26, y0 + s / 2 + 44, { font: sans(22, 500), color: C.text3, baseline: "middle", alpha: iu });
    }
  });
}

// ================================================================== C: `<?` before and after

// The spec panel ("HTML Standard · Tokenization"): C's size, then the
// walk's (centred), then lifted to make room for the DOM when the comment
// token is emitted.
const PANEL_C = { x: 60, y: 104, w: 1800, h: 380 };
const PANEL_W = { x: 60, y: 112, w: 1800, h: 768 };
const PANEL_E = { x: 60, y: 24, w: 1800, h: 768 };
function panelRect(t, T) {
  const grow = prog(t, T.walkIn - 0.25, 0.8);
  const lift = prog(t, walkTimes(T).at(-1) - 0.3, 0.6);
  return mix(mix(PANEL_C, PANEL_W, grow), PANEL_E, lift);
}

const LINKS = [
  ["invalid-processing-instruction-target", C.bad],
  ["unexpected-question-mark-instead-of-tag-name", C.bad],
  ["Convert the temporary buffer to a comment", LINK],
  ["processing instruction target state", LINK],
  ["processing instruction open state", LINK],
  ["bogus comment state", LINK],
  ["tag open state", LINK],
  ["data state", LINK],
  ["Reconsume", LINK],
  ["temporary buffer", LINK],
];

// The tag open state's `?` case: the old text, then the new.
const TAG_OPEN_OLD = [
  "This is an unexpected-question-mark-instead-of-tag-name parse error.",
  "Create a comment token whose data is the empty string.",
  "Reconsume in the bogus comment state.",
];

function drawC(ctx, t, T) {
  const inU = prog(t, T.comment - 0.15, 0.5);
  const endC = prog(t, T.walkIn - 0.3, 0.45);   // C's rows give way to the walk
  const endX = prog(t, T.walkIn - 0.7, 0.35);   // its excerpt, a little earlier
  drawMarkerIntro(ctx, t, T);
  if (inU <= 0) return;
  const R = panelRect(t, T);

  // ---- the panel (it stays, and grows, for D)
  withAlpha(ctx, inU, () => {
    const glow = 0.7 * pulse(t, T.specW - 0.2, 1.2);
    specPanel(ctx, { x: R.x, y: R.y, w: R.w, h: R.h, source: "HTML Standard", title: "Tokenization", glow });
    // the date of the rule shown
    const news = prog(t, T.news + 0.35, 0.5);
    const dateA = (1 - news) * (1 - endX), dateB = news * (1 - endX);
    if (dateA > 0) chip(ctx, { x: R.x + R.w - 22, y: R.y + 12, h: 38, align: "right", text: "until June 2026", font: sans(22, 600), color: C.text2, bg: rgba(C.text2, 0.08), border: rgba(C.text2, 0.4), alpha: dateA });
    if (dateB > 0) chip(ctx, { x: R.x + R.w - 22, y: R.y + 12, h: 38, align: "right", text: "since June 2026", font: sans(22, 650), color: PLAT, bg: rgba(PLAT, 0.1), border: rgba(PLAT, 0.55), alpha: dateB });
  });

  // ---- the tag open state's `?` case
  withAlpha(ctx, inU * (1 - endX), () => {
    const x = R.x + 60, y = R.y + 118;
    // the quote's rule (as specCard draws it), beside the <dd>
    const nLines = t < T.news + 0.6 ? TAG_OPEN_OLD.length : M.walk.steps[1].rule.length;
    quoteRule(ctx, x + 14, y + 96, y + 96 + nLines * 46, prog(t, T.comment + 0.9, 0.4));
    text(ctx, STATE.tagOpen, x, y, { font: sans(44, 700), color: C.text, baseline: "middle" });
    text(ctx, "U+003F QUESTION MARK (?)", x, y + 62, { font: mono(28, 550), color: C.text2, baseline: "middle", alpha: prog(t, T.comment + 0.4, 0.4) });
    // old text: struck out and faded as the new one arrives
    TAG_OPEN_OLD.forEach((s, i) => {
      const u = prog(t, T.comment + 0.9 + 0.35 * i, 0.4) * (1 - prog(t, T.news + 0.6, 0.4));
      if (u <= 0) return;
      const yy = y + 118 + i * 46;
      const list = linked(s, LINKS);
      const w = sentence(ctx, list, x + 40, yy, 31, { alpha: u });
      const st = prog(t, T.news + 0.2, 0.35);
      if (st > 0) withAlpha(ctx, u, () => fillRR(ctx, x + 40, yy - 1, w * st, 3, 1.5, rgba(C.text2, 0.8)));
    });
    const NEW = M.walk.steps[1].rule;
    NEW.forEach((s, i) => {
      const u = prog(t, T.news + 0.95 + 0.3 * i, 0.45);
      if (u <= 0) return;
      const list = linked(s, LINKS);
      const yy = y + 118 + i * 46;
      // "real processing instructions": the new state, lit
      if (i === 1) {
        const pz = pulse(t, T.processing0 - 0.15, 1.3);
        if (pz > 0) {
          const w0 = sentenceW(ctx, list.slice(0, 1), 31), w1 = sentenceW(ctx, list.slice(1, 2), 31);
          withAlpha(ctx, pz, () => fillRR(ctx, x + 40 + w0 - 6, yy - 22, w1 + 12, 44, 8, rgba(LINK, 0.2)));
        }
      }
      sentence(ctx, list, x + 40 + 20 * (1 - u), yy, 31, { alpha: u });
    });
  });

  // ---- below the panel: examples, streaming, results
  withAlpha(ctx, 1 - endC, () => {
    drawOldExamples(ctx, t, T);
    drawStreaming(ctx, t, T);
    drawResults(ctx, t, T);
  });
}

// "And those question mark markers?": the node marker, big, alone.
function drawMarkerIntro(ctx, t, T) {
  const u = prog(t, T.markers + 0.45, 0.5, ease.outCubic);
  const move = prog(t, T.comment - 0.1, 0.9);
  if (u <= 0 || move >= 1) return;
  const size = lerp(84, 40, move);
  const adv = monoAdvance(ctx, size, 560);
  const n = M.src.length;
  const x = lerp(960 - (n * adv) / 2, ROW.x, move), y = lerp(560, ROW.y0, move);
  const q = pulse(t, T.question0 + 0.1, 1.0);
  withAlpha(ctx, clamp(u), () => {
    monoPieces(ctx, [{ text: "<", color: B[1] }, { text: "?", color: B[1] }, { text: M.marker, color: B[1] }, { text: ">", color: B[1] }], x, y, size, { weight: 560 });
    if (q > 0) {
      const qx = x + adv;
      withAlpha(ctx, q, () => {
        fillRR(ctx, qx - 6, y - size * 0.66, adv + 12, size * 1.32, 10, rgba(C.text, 0.12));
        withGlow(ctx, rgba(B[1], 0.9), 20, () => text(ctx, "?", qx, y, { font: mono(size, 700), color: "#ffffff", baseline: "middle" }));
      });
    }
  });
}

// The rows under the panel: source (x), arrow, result (rx).
const ROW = { x: 120, y0: 616, dy: 104, size: 40, arrow: [744, 812], rx: 840 };

const srcOfMarker = (color = B[1]) => [{ text: M.src, color }];
const srcOfProfile = () => srcPieces(M.prof.src);

function rowArrow(ctx, y, u, color = C.text3) {
  if (u <= 0) return;
  arrow(ctx, { x: ROW.arrow[0], y }, { x: ROW.arrow[1], y }, { color, width: 3, progress: u, head: 12 });
}

// The comment the tree builder makes, drawn as devtools shows it.
function commentPieces(data) {
  return [{ text: "<!--", color: DOMC.comment }, { text: data, color: DOMC.comment }, { text: "-->", color: DOMC.comment }];
}

// comment: before June 2026, both became comments.
function drawOldExamples(ctx, t, T) {
  const out = 1 - prog(t, T.news + 0.3, 0.45);
  if (out <= 0 || t < T.comment - 0.2) return;
  const y1 = ROW.y0, y2 = ROW.y0 + ROW.dy;
  withAlpha(ctx, out, () => {
    // row 1: the marker (arrived from the intro)
    if (prog(t, T.comment - 0.1, 0.9) >= 1) monoPieces(ctx, srcOfMarker(), ROW.x, y1, ROW.size, { weight: 560 });
    // row 2: "anything" starting with <?
    const a2 = prog(t, T.anything - 0.1, 0.45);
    if (a2 > 0) monoPieces(ctx, srcOfProfile(), ROW.x + 20 * (1 - a2), y2, ROW.size, { alpha: a2, weight: 560 });
    // → comments
    const cu = prog(t, T.intoComment - 0.25, 0.5);
    rowArrow(ctx, y1, cu);
    rowArrow(ctx, y2, cu * (a2 > 0 ? 1 : 0));
    const r1 = prog(t, T.intoComment + 0.05, 0.45, ease.outBack);
    const r2 = prog(t, T.intoComment + 0.2, 0.45, ease.outBack);
    const res = (tok, y, u) => {
      if (u <= 0) return;
      withAlpha(ctx, clamp(u), () => withScale(ctx, lerp(0.85, 1, u), ROW.rx + 200, y, () => {
        monoPieces(ctx, commentPieces(tok.data), ROW.rx, y, ROW.size, { weight: 500 });
        text(ctx, "Comment", ROW.rx, y + 44, { font: sans(22, 600), color: C.text3, baseline: "middle" });
      }));
    };
    res(M.legacyLit, y1, r1);
    res(M.legacyProf, y2, r2);
  });
}

// news: processing instructions, for streaming content into place.
function drawStreaming(ctx, t, T) {
  const u = prog(t, T.processing0 + 0.65, 0.5);
  const out = 1 - prog(t, T.pi + 0.05, 0.45);
  if (u <= 0 || out <= 0) return;
  const size = 36, adv = monoAdvance(ctx, size, 500);
  const x = 420, y1 = 610, y3 = 900;
  const tplLine = `<template for="profile">…</template>`;
  const arrive = prog(t, T.streaming - 0.15, 0.6, ease.outCubic);
  withAlpha(ctx, u * out, () => {
    // the page, as it streams in
    fillRR(ctx, x - 40, y1 - 64, 1160, 390, 16, rgba(C.panel, 0.9));
    strokeRR(ctx, x - 39.5, y1 - 63.5, 1159, 389, 16, C.border, 1.5);
    text(ctx, "a page, streaming in", x - 12, y1 - 36, { font: sans(22, 600), color: C.text3, baseline: "middle" });
    // the marker (the results row takes it over at `pi`)
    if (t < T.pi - 0.1) monoPieces(ctx, srcOfProfile(), x, y1 + 20, size, { weight: 520 });
    text(ctx, "⋮", x + 12, (y1 + y3) / 2 + 10, { font: sans(40, 500), color: C.text3, baseline: "middle", alpha: arrive });
    withAlpha(ctx, arrive, () => monoPieces(ctx, srcPieces(tplLine), x, y3 + 40 * (1 - arrive), size, { weight: 520 }));
    // its content goes to the marker
    const go = prog(t, T.streaming + 0.45, 0.8);
    if (go > 0) {
      const ex = x + tplLine.indexOf("…") * adv + adv / 2;
      const a0 = { x: ex, y: y3 - 26 }, a1 = { x: x + M.prof.src.length * adv + 34, y: y1 + 20 };
      arrow(ctx, a0, a1, { color: PLAT, width: 3.5, progress: go, bend: 90 });
      text(ctx, "into place", a1.x + 110, (a0.y + a1.y) / 2 - 10, { font: sans(26, 600), color: PLAT, baseline: "middle", alpha: prog(t, T.place - 0.2, 0.4) });
    }
  });
}

// pi / still: what this browser's parser makes of each (truth parser.results).
function drawResults(ctx, t, T) {
  const inP = prog(t, T.pi - 0.1, 0.6);
  if (inP <= 0) return;
  const y1 = ROW.y0, y2 = ROW.y0 + ROW.dy + 24;
  // row 1: <?marker name="profile"> moves up from the streaming page
  const from = { x: 420, y: 630 }, to = { x: ROW.x, y: y1 };
  const mv = ease.inOutCubic(inP);
  const p = mix(from, to, mv);
  monoPieces(ctx, srcOfProfile(), p.x, p.y, lerp(36, ROW.size, mv), { weight: lerp(520, 560, mv) });
  // in the spec, and in Chrome
  const badges = [
    { t0: T.specW - 0.15, label: "HTML Standard" },
    { t0: T.chrome - 0.15, label: M.chrome ? `Chrome ${M.chrome}` : "Chrome" },
  ];
  let bx = ROW.rx;
  badges.forEach((b, i) => {
    const u = prog(t, b.t0, 0.4, ease.outBack);
    const g = platformTag(ctx, { x: bx, y: y1 - 92, h: 42, text: b.label, glyph: i === 0 ? "doc" : "browser", font: sans(22, 650), alpha: 0 });
    if (u > 0) withAlpha(ctx, clamp(u), () => withScale(ctx, lerp(0.8, 1, u), bx + g.w / 2, y1 - 71, () =>
      platformTag(ctx, { x: bx, y: y1 - 92, h: 42, text: b.label, glyph: i === 0 ? "doc" : "browser", font: sans(22, 650) })));
    bx += g.w + 14;
  });
  // → a ProcessingInstruction node
  const au = prog(t, T.becomes - 0.3, 0.45);
  rowArrow(ctx, y1, au, PI_COLOR);
  const nu = prog(t, T.becomes + 0.1, 0.45, ease.outBack);
  if (nu > 0) nodeCard(ctx, ROW.rx, y1, "ProcessingInstruction", PI_COLOR, [["target", JSON.stringify(M.prof.target)], ["data", `'${M.prof.data}'`]], nu);

  // row 2 (still): the marker still makes a comment
  const s0 = prog(t, T.still - 0.1, 0.45);
  if (s0 <= 0) return;
  // (the walk's input flies up from here)
  if (t < T.walkIn - 0.4) monoPieces(ctx, srcOfMarker(), ROW.x + 20 * (1 - s0), y2, ROW.size, { alpha: s0, weight: 560 });
  rowArrow(ctx, y2, prog(t, T.comments - 0.6, 0.45), DOMC.comment);
  const cu = prog(t, T.comments - 0.3, 0.45, ease.outBack);
  if (cu > 0) nodeCard(ctx, ROW.rx, y2, "Comment", DOMC.comment, [["data", JSON.stringify(M.lit.data)]], cu);
}

// A DOM node: its interface name in a chip, then its fields.
function nodeCard(ctx, x, y, kind, color, fields, u) {
  withAlpha(ctx, clamp(u), () => withScale(ctx, lerp(0.85, 1, u), x, y, () => {
    const c = chip(ctx, { x, y: y - 24, h: 48, text: kind, font: mono(26, 600), color, bg: rgba(color, 0.12), border: rgba(color, 0.6), r: 10 });
    let fx = x + c.w + 22;
    fields.forEach(([k, v]) => {
      fx += text(ctx, `${k}: `, fx, y + 1, { font: mono(24, 450), color: C.text3, baseline: "middle" });
      fx += text(ctx, v, fx, y + 1, { font: mono(24, 550), color: C.text, baseline: "middle" }) + 28;
    });
  }));
}

// ================================================================== D: the tokenizer, step by step

// Positions inside the panel are offsets from its top (oy), which moves.
const IN = { size: 84, cw: 72, gap: 10, dy: 90 };          // the input row
const EX = { x: 130, dy: 316 };                             // the spec excerpt
const RC = { x: 1236, w: 590 };                             // the right column: buffer, legend, token
const BUF = { dy: 272, h: 150 };                            // the temporary buffer
const LEG = { dy: 462 };                                    // the legend
const TOK = { dy0: 604, dy1: 272, h: 142 };                 // the comment token (moves up)
const OUT = { y: 904 };                                     // the DOM, under the panel

const cellH = () => IN.size * 1.26;
function inputX() {
  const n = M.src.length;
  return 960 - (n * IN.cw + (n - 1) * IN.gap) / 2;
}
const cellCenter = (i, oy) => ({ x: inputX() + i * (IN.cw + IN.gap) + IN.cw / 2, y: oy + IN.dy + cellH() / 2 });

// The last step done at t (-1 before the first).
function walkAt(t, WTs) {
  let k = -1;
  for (let n = 0; n < WTs.length; n++) if (WTs[n] <= t) k = n;
  return k;
}

function drawD(ctx, t, T) {
  const inU = prog(t, T.walkIn - 0.4, 0.6);
  if (inU <= 0) return;
  const WTs = walkTimes(T);
  const k = walkAt(t, WTs);
  const oy = panelRect(t, T).y;
  drawInput(ctx, t, T, WTs, k, inU, oy);
  drawExcerpt(ctx, t, T, WTs, k, oy);
  drawBuffer(ctx, t, T, WTs, k, oy);
  drawLegend(ctx, t, T, WTs, oy);
  drawToken(ctx, t, T, WTs, oy);
  drawOutput(ctx, t, T, WTs, oy);
}

// The input: <?lit$480592716$>, one big cell per character, flown in from
// the results row; a ring and a pointer on the next input character.
function drawInput(ctx, t, T, WTs, k, inU, oy) {
  const steps = M.walk.steps;
  const n = M.src.length;
  const x0 = inputX();
  const fly = prog(t, T.walkIn - 0.4, 0.85, ease.inOutCubic);
  const srcAdv = monoAdvance(ctx, ROW.size, 560);
  const fromY = ROW.y0 + ROW.dy + 24;                        // drawResults' row 2
  // when each character is consumed (a step on it that doesn't reconsume)
  const consumedAt = new Array(n).fill(Infinity);
  steps.forEach((s, j) => { if (!s.reconsume) consumedAt[s.i] = Math.min(consumedAt[s.i], WTs[j]); });
  // and what it became part of
  const fate = new Array(n).fill("read");
  steps.forEach((s) => {
    if (s.state === "piTarget" && !s.error && !s.reconsume) fate[s.i] = "buffer";
    if (s.state === "bogus" && !s.emit) fate[s.i] = "comment";
  });
  const caretAt = (j) => (j < 0 ? 0 : steps[j].reconsume ? steps[j].i : steps[j].i + 1);
  const cur = Math.min(n - 1, caretAt(k));
  const prev = Math.min(n - 1, caretAt(k - 1));
  const mv = k >= 0 ? prog(t, WTs[k], k >= 7 ? 0.1 : 0.22, ease.inOutCubic) : 1;
  const caretI = lerp(prev, cur, mv);
  const done = k === steps.length - 1 ? prog(t, WTs[k] + 0.05, 0.3) : 0;
  const readHl = window(t, T.what - 0.05, T.commentW + 0.6, 0.3, 0.4);   // "what it has read": ?lit
  const bad = window(t, WTs[6] + 0.2, T.convertLine + 0.4, 0.3, 0.5);   // the '$' that ends the target

  const cells = [];
  for (let i = 0; i < n; i++) {
    const used = t >= consumedAt[i] + 0.1;
    let color = C.text, fill = C.panel2, border = C.border2, chAlpha = 1;
    if (used) {
      chAlpha = 0.42;
      if (fate[i] === "comment") { fill = rgba(DOMC.comment, 0.08); border = rgba(DOMC.comment, 0.45); color = DOMC.comment; chAlpha = 0.8; }
    }
    if (i === 5 && bad > 0) { border = blend(C.border2, C.bad, bad); fill = rgba(C.bad, 0.12 * bad); color = blend(C.text, C.bad, bad); chAlpha = 1; }
    if (i >= 1 && i <= 4 && readHl > 0) { fill = rgba(C.accent, 0.1 + 0.16 * readHl); chAlpha = lerp(chAlpha, 1, readHl); }
    cells.push({ ch: M.src[i], color, fill, border, chAlpha });
  }
  // flying in: each character from its place in the results row
  if (fly < 1) {
    withAlpha(ctx, clamp(fly * 4) * (1 - clamp((fly - 0.9) * 10)), () => {
      for (let i = 0; i < n; i++) {
        const u = clamp(fly * 1.25 - i * 0.015);
        const a = { x: ROW.x + i * srcAdv + srcAdv / 2, y: fromY }, b = cellCenter(i, oy);
        const p = along(a, b, ease.inOutCubic(u), -40);
        text(ctx, M.src[i], p.x, p.y, { font: mono(lerp(ROW.size, IN.size, u), 560), color: blend(B[1], C.text, u), align: "center", baseline: "middle" });
      }
    });
  }
  if (fly < 0.9) return;
  const iy = oy + IN.dy;
  withAlpha(ctx, clamp((fly - 0.9) * 10) * inU, () => {
    text(ctx, "input", x0 - 28, iy + cellH() / 2, { font: sans(26, 600), color: C.text3, baseline: "middle", align: "right" });
    charCells(ctx, { x: x0, y: iy, cells, size: IN.size, cw: IN.cw, ch: cellH(), gap: IN.gap });
  });
  // the caret
  const ca = prog(t, T.walkIn + 0.5, 0.4) * (1 - done);
  if (ca <= 0) return;
  const cx = x0 + caretI * (IN.cw + IN.gap);
  const hop = k >= 0 && steps[k].reconsume ? pulse(t, WTs[k], 0.45) : 0;   // reconsume: read again
  withAlpha(ctx, ca, () => {
    withGlow(ctx, rgba(C.accent, 0.9), 18, () => strokeRR(ctx, cx - 5, iy - 5 - 10 * hop, IN.cw + 10, cellH() + 10, 15, C.accent, 3));
    const py = iy + cellH() + 14;
    ctx.save();
    ctx.fillStyle = C.accent;
    ctx.beginPath();
    ctx.moveTo(cx + IN.cw / 2, py);
    ctx.lineTo(cx + IN.cw / 2 - 12, py + 15);
    ctx.lineTo(cx + IN.cw / 2 + 12, py + 15);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  });
}

// The spec's text for the step: the state reading the character (the
// section heading), the case that matched (dt), and what to do (dd).
function drawExcerpt(ctx, t, T, WTs, k, oy) {
  const steps = M.walk.steps;
  const a = prog(t, T.walkIn + 0.3, 0.5) * (1 - prog(t, T.exact + 0.5, 0.5) * 0.55);
  if (a <= 0) return;
  // consecutive steps with the same text are one display group
  const same = (p, q) => p && q && p.state === q.state && p.when === q.when && p.rule.join() === q.rule.join();
  let g = k;
  while (g > 0 && same(steps[g - 1], steps[g])) g--;
  const s = steps[k] ?? null;
  const gT = k >= 0 ? WTs[g] : T.walkIn;
  const heading = s ? STATE[s.state] : STATE.data;
  const prevS = g > 0 ? steps[g - 1] : null;
  const prevHeading = k < 0 ? null : prevS ? STATE[prevS.state] : STATE.data;
  const hu = k >= 0 && prevHeading !== heading ? prog(t, gT, 0.3, ease.outCubic) : 1;
  const x = EX.x, y = oy + EX.dy;
  const errorTint = s && s.error ? prog(t, T.errorLine, 0.3) : 0;
  const HF = sans(54, 700);
  withAlpha(ctx, a, () => {
    if (hu < 1 && prevHeading) text(ctx, prevHeading, x, y - 26 * hu, { font: HF, color: C.text, baseline: "middle", alpha: 1 - hu });
    text(ctx, heading, x + 26 * (1 - hu), y, { font: HF, color: blend(C.text, "#ffb3b3", errorTint), baseline: "middle", alpha: hu });
    if (!s) {
      text(ctx, "Consume the next input character:", x, y + 70, { font: sans(32, 500), color: C.text3, baseline: "middle", alpha: prog(t, T.walkIn + 0.6, 0.4) });
      return;
    }
    text(ctx, s.when, x, y + 70, { font: mono(30, 550), color: C.text2, baseline: "middle", alpha: prog(t, gT, 0.25) });
    // the '$' step's three sentences arrive with the narration
    const at = s.error ? [T.errorLine, T.convertLine, T.reconsumeLine] : s.rule.map((_, i) => gT + 0.08 + 0.14 * i);
    // the quote's rule, as long as the sentences shown
    const shown = at.filter((a0) => t >= a0).length;
    if (shown > 0) quoteRule(ctx, x + 16, y + 107, y + 107 + 54 * (shown - 1 + prog(t, at[shown - 1], 0.3)), prog(t, at[0], 0.3));
    s.rule.forEach((line, i) => {
      const u = prog(t, at[i], 0.35);
      if (u <= 0) return;
      const list = linked(line, LINKS);
      const yy = y + 134 + i * 54;
      if (s.error && i === 1) {
        const pz = pulse(t, T.token, 1.2);
        if (pz > 0) {
          const w = sentenceW(ctx, list.slice(0, 1), 35);
          withAlpha(ctx, pz, () => fillRR(ctx, x + 34, yy - 25, w + 12, 50, 8, rgba(LINK, 0.18)));
        }
      }
      sentence(ctx, list, x + 40 + 16 * (1 - u), yy, 35, { alpha: u });
    });
  });
}

// The right column's content fades when the bogus comment state takes
// over, and the comment token moves up into its place.
const rcOut = (t, T) => prog(t, T.reconsumeLine + 0.1, 0.45);
const tokenY = (t, T, oy) => oy + lerp(TOK.dy0, TOK.dy1, prog(t, T.reconsumeLine + 0.2, 0.6));

// The temporary buffer: "" → "l" → "li" → "lit".
const bufText = { size: 64 };
const bufOrigin = (oy) => ({ x: RC.x + 34, y: oy + BUF.dy + 100 });

function drawBuffer(ctx, t, T, WTs, k, oy) {
  const steps = M.walk.steps;
  const u = prog(t, WTs[1] - 0.05, 0.4, ease.outBack);
  const out = rcOut(t, T);
  if (u <= 0 || out >= 1) return;
  const buf = steps[Math.max(k, 1)].buffer;
  const size = bufText.size, adv = monoAdvance(ctx, size, 560);
  const { x, y } = bufOrigin(oy);
  const by = oy + BUF.dy;
  // the step that appended character j
  const appendStep = (j) => steps.findIndex((q) => q.state === "piTarget" && !q.reconsume && !q.error && q.buffer.length === j + 1);
  withAlpha(ctx, clamp(u) * (1 - out), () => withScale(ctx, lerp(0.9, 1, u), RC.x + RC.w / 2, by + BUF.h / 2, () => {
    fillRR(ctx, RC.x, by, RC.w, BUF.h, 14, C.panel2);
    strokeRR(ctx, RC.x + 0.5, by + 0.5, RC.w - 1, BUF.h - 1, 14, C.border2, 1.5);
    text(ctx, "temporary buffer", RC.x + 22, by + 30, { font: sans(26, 600), color: C.text3, baseline: "middle" });
    text(ctx, '"', x, y, { font: mono(size, 450), color: C.text3, baseline: "middle" });
    let grow = 0;
    for (let j = 0; j < buf.length; j++) {
      const st = appendStep(j);
      const f = prog(t, WTs[st], 0.3, ease.inOutCubic);
      grow += f;
      const dst = { x: x + adv * (1 + j) + adv / 2, y };
      const p = f < 1 ? along(cellCenter(steps[st].i, oy), dst, f, -50) : dst;
      text(ctx, buf[j], p.x, p.y, { font: mono(lerp(IN.size, size, f), 600), color: C.text, align: "center", baseline: "middle" });
    }
    text(ctx, '"', x + adv * (1 + grow), y, { font: mono(size, 450), color: C.text3, baseline: "middle" });
  }));
}

// What a target may use (the processing instruction target state's ASCII
// alphanumeric, hyphen-minus and low line cases), named as the narration
// names them; then the '$' that isn't one.
const LEGEND = [
  { key: "letters", chars: "A–Z a–z", w: 150 },
  { key: "digits", chars: "0–9", w: 110 },
  { key: "hyphens", chars: "-", w: 110 },
  { key: "underscores", chars: "_", w: 110 },
];

function drawLegend(ctx, t, T, WTs, oy) {
  const u = prog(t, T.can - 0.2, 0.45);
  const out = rcOut(t, T);
  if (u <= 0 || out >= 1) return;
  const steps = M.walk.steps;
  const y = oy + LEG.dy, x0 = RC.x + 2;
  const f = mono(28, 600);
  withAlpha(ctx, u * (1 - out), () => {
    text(ctx, "a target may use", x0, y, { font: sans(24, 600), color: C.text3, baseline: "middle" });
    const named = { letters: T.letters, digits: T.digits, hyphens: T.hyphens, underscores: T.underscores };
    let x = x0;
    LEGEND.forEach((l) => {
      const nu = prog(t, named[l.key] - 0.15, 0.3);
      // a flash each time a character of this class goes into the buffer
      let hit = 0;
      steps.forEach((s, j) => {
        if (s.state === "piTarget" && !s.reconsume && !s.error && targetClass(s.ch) === l.key) hit = Math.max(hit, pulse(t, WTs[j], 0.5));
      });
      withAlpha(ctx, Math.max(0.35, nu), () => {
        const box = () => fillRR(ctx, x, y + 24, l.w, 54, 10, rgba(PLAT, 0.08 + 0.2 * hit));
        if (hit > 0) withGlow(ctx, rgba(PLAT, 0.8 * hit), 18, box);
        else box();
        strokeRR(ctx, x + 1, y + 25, l.w - 2, 52, 9, rgba(PLAT, 0.4 + 0.5 * Math.max(hit, pulse(t, named[l.key] - 0.15, 0.8))), 2);
        text(ctx, l.chars, x + l.w / 2, y + 52, { font: f, color: C.text, align: "center", baseline: "middle" });
        text(ctx, l.key, x + l.w / 2, y + 102, { font: sans(22, 550), color: C.text2, align: "center", baseline: "middle", alpha: nu });
      });
      x += l.w + 12;
    });
    // '$': not one of them
    const du = prog(t, WTs[6] + 0.15, 0.4, ease.outBack);
    if (du > 0) {
      const w = 56, dx = x + 4;
      withAlpha(ctx, clamp(du), () => withScale(ctx, lerp(0.6, 1, du), dx + w / 2, y + 51, () => {
        fillRR(ctx, dx, y + 24, w, 54, 10, rgba(C.bad, 0.14));
        strokeRR(ctx, dx + 1, y + 25, w - 2, 52, 9, rgba(C.bad, 0.85), 2);
        text(ctx, "$", dx + w / 2, y + 52, { font: f, color: C.bad, align: "center", baseline: "middle" });
      }));
      const cu = prog(t, WTs[6] + 0.4, 0.35);
      if (cu > 0) {
        withAlpha(ctx, clamp(cu * 3), () => {
          fillRR(ctx, dx + w - 16, y + 6, 32, 32, 16, C.bg);
          strokeRR(ctx, dx + w - 16, y + 6, 32, 32, 16, rgba(C.bad, 0.9), 2.5);
        });
        cross(ctx, dx + w, y + 22, 20, C.bad, cu);
      }
    }
  });
}

// The comment token: "convert the temporary buffer to a comment" makes it
// ("?" + "lit"); the bogus comment state appends the rest; '>' emits it.
const TOK_SIZE = 44;
const tokenOrigin = (t, T, oy) => ({ x: RC.x + 142, y: tokenY(t, T, oy) + 96 });

function drawToken(ctx, t, T, WTs, oy) {
  const steps = M.walk.steps;
  const u = prog(t, T.token, 0.45, ease.outBack);
  if (u <= 0) return;
  const by = tokenY(t, T, oy);
  const size = TOK_SIZE, adv = monoAdvance(ctx, size, 560);
  const { x, y } = tokenOrigin(t, T, oy);
  const emitU = prog(t, WTs[steps.length - 1] + 0.05, 0.5);
  const gone = 1 - clamp(emitU * 4);                           // emitted: the data leaves
  const conv = steps.find((s) => s.error);
  const base = conv.comment.data;                             // "?lit"
  const appends = steps.map((s, j) => ({ s, j })).filter(({ s }) => s.state === "bogus" && !s.emit);
  withAlpha(ctx, clamp(u) * (1 - emitU), () => withScale(ctx, lerp(0.9, 1, u), RC.x + RC.w / 2, by + TOK.h / 2, () => {
    fillRR(ctx, RC.x, by, RC.w, TOK.h, 14, rgba(DOMC.comment, 0.07));
    strokeRR(ctx, RC.x + 0.5, by + 0.5, RC.w - 1, TOK.h - 1, 14, rgba(DOMC.comment, 0.55), 1.8);
    text(ctx, "comment token", RC.x + 22, by + 30, { font: sans(26, 600), color: DOMC.comment, baseline: "middle" });
    text(ctx, "data:", RC.x + 22, y, { font: mono(28, 450), color: C.text3, baseline: "middle" });
    text(ctx, '"', x - adv, y, { font: mono(size, 450), color: C.text3, baseline: "middle", alpha: gone });
    // "?": the spec's own, first
    const qu = prog(t, T.fill + 0.25, 0.35, ease.outBack) * gone;
    const qp = pulse(t, T.question - 0.1, 1.1);
    if (qu > 0) {
      withScale(ctx, lerp(0.4, 1, qu) * (1 + 0.25 * qp), x + adv / 2, y, () => {
        if (qp > 0) withAlpha(ctx, qp, () => fillRR(ctx, x - 4, y - size * 0.7, adv + 8, size * 1.4, 8, rgba(C.text, 0.16)));
        text(ctx, base[0], x + adv / 2, y, { font: mono(size, 650), color: blend(DOMC.comment, "#ffffff", qp), align: "center", baseline: "middle", alpha: clamp(qu) });
      });
    }
    // "lit": copies of the buffer's characters
    const bo = bufOrigin(oy);
    const bAdv = monoAdvance(ctx, bufText.size, 560);
    for (let j = 1; j < base.length; j++) {
      const f = prog(t, T.fill + 0.08 * j, 0.5, ease.inOutCubic);
      if (f <= 0) continue;
      const src = { x: bo.x + bAdv * j + bAdv / 2, y: bo.y };
      const p = along(src, { x: x + adv * j + adv / 2, y }, f, 40);
      text(ctx, base[j], p.x, p.y, { font: mono(lerp(bufText.size, size, f), 600), color: blend(C.text, DOMC.comment, f), align: "center", baseline: "middle", alpha: gone });
    }
    // appended by the bogus comment state, straight from the input
    let grow = 1 + 3 * prog(t, T.fill + 0.16, 0.5, ease.inOutCubic);
    appends.forEach(({ s, j }, n) => {
      const f = prog(t, WTs[j], 0.22, ease.outCubic);
      if (f <= 0) return;
      grow += f;
      const p = along(cellCenter(s.i, oy), { x: x + adv * (base.length + n) + adv / 2, y }, f, -30);
      text(ctx, s.ch, p.x, p.y, { font: mono(lerp(IN.size, size, f), 600), color: DOMC.comment, align: "center", baseline: "middle", alpha: clamp(f * 3) * gone });
    });
    if (qu > 0) text(ctx, '"', x + adv * grow, y, { font: mono(size, 450), color: C.text3, baseline: "middle", alpha: gone });
  }));
}

// The DOM: the comment node the tree builder makes from the token, and what
// lit-html compares it with.
function drawOutput(ctx, t, T, WTs, oy) {
  const steps = M.walk.steps;
  const e0 = WTs[steps.length - 1] + 0.1;
  const u = prog(t, e0, 0.6, ease.inOutCubic);
  if (u <= 0) return;
  const data = M.lit.data;                                   // truth: ?lit$480592716$
  const size = 56, adv = monoAdvance(ctx, size, 520);
  const w = (data.length + 7) * adv;
  const cx = 640, y = OUT.y;
  const x = cx - w / 2;
  const from = tokenOrigin(t, T, oy);
  const p = along(from, { x: x + 4 * adv, y }, u, 60);
  const sz = lerp(TOK_SIZE, size, u);
  const lx = p.x - 4 * monoAdvance(ctx, sz, 520);
  const wrap = prog(t, e0 + 0.45, 0.35);
  monoPieces(ctx, [{ text: "<!--", color: DOMC.comment, alpha: wrap }, { text: data, color: DOMC.comment }, { text: "-->", color: DOMC.comment, alpha: wrap }], lx, p.y, sz, { weight: 520 });
  text(ctx, "Comment node", cx, y - 78, { font: sans(26, 600), color: C.text3, align: "center", baseline: "middle", alpha: prog(t, e0 + 0.5, 0.4) });
  // the gold ring: the mystery comment from episode 1
  const ru = prog(t, T.exact + 0.05, 0.45);
  if (ru > 0) ring(ctx, { x: x - 4, y: y - size * 0.62, w: w + 8, h: size * 1.24, r: 10, color: GOLD, u: ru * (0.82 + 0.18 * Math.sin((t - T.exact) * 4)), pad: 12, width: 3.5 });
  // data = '?' + marker
  const bu = prog(t, T.exactly - 0.05, 0.4);
  if (bu > 0) {
    const d0 = x + 4 * adv, yb = y + size * 0.74;
    withAlpha(ctx, bu, () => {
      const seg = (a, b, label, color) => {
        ctx.fillStyle = color;
        ctx.fillRect(d0 + a * adv + 3, yb, (b - a) * adv - 6, 3);
        text(ctx, label, d0 + ((a + b) / 2) * adv, yb + 32, { font: mono(28, 600), color, align: "center", baseline: "middle" });
      };
      seg(0, 1, "'?'", "#ffffff");
      seg(1, data.length, "marker", GOLD);
    });
  }
  // lit-html.ts: markerMatch
  const cu = prog(t, T.exact + 0.3, 0.5);
  if (cu <= 0) return;
  const code = matchCode();
  const cw = code.width(ctx) + 64, ch = 44 + code.height + 18;
  const px = 1860 - cw, py = OUT.y - ch / 2 + 6;
  withAlpha(ctx, cu, () => {
    panel(ctx, { x: px, y: py, w: cw, h: ch, title: "lit-html.ts", titleFont: mono(20, 500), titleColor: C.text3, header: 40 });
    const f = code.find("data === markerMatch");
    const r = code.rect(ctx, px + 32, py + 50, f.line, f.col, f.len);
    withAlpha(ctx, prog(t, T.looks - 0.4, 0.4), () => fillRR(ctx, r.x - 5, r.y - 2, r.w + 10, r.h + 4, 7, rgba(C.ok, 0.2)));
    code.draw(ctx, px + 32, py + 50);
    check(ctx, px + cw - 40, r.y + r.h / 2, 30, C.ok, prog(t, T.looks - 0.2, 0.45));
  });
}

let MATCH = null;
// lit-html.ts: the marker comment test (two lines of the file; "…" marks
// the lines between them).
const matchCode = () => (MATCH ??= new Code("const markerMatch = '?' + marker;\n…\nif (data === markerMatch) {", { size: 28 }));
