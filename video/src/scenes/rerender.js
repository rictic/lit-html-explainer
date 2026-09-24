// rerender: the click calls render(counter(1), document.body). The root part
// is found on the body, the template is a cache hit, and the part already
// shows an instance of it, so prepare and create are skipped. Update then
// makes exactly two DOM writes (the class, and the text node's data); the
// event part keeps the new function without touching the listener. Nothing
// else is touched, and the same values again write nothing.
//
// Act 1 (click .. straight): browser + devtools move to a right-hand column;
// the new TemplateResult and the three lookups fill the left.
// Act 2 (straight .. end): the instance's three parts as lanes, each value
// compared with the part's last value, the writes drawn into the devtools
// tree and counted.

import { B, C, rgba } from "../kit/theme.js";
import { arrow, along, check, cross, fillRR, measure, mono, panel, ring, sans, strokeRR, text, withAlpha, withGlow } from "../kit/draw.js";
import { browserWindow, cursor, devtools } from "../kit/browser.js";
import { Code } from "../kit/code.js";
import { Tree } from "../kit/tree.js";
import { card } from "../kit/objects.js";
import { OBJ, counterValues, miniStrings, templateResultCard, valuesArray } from "../kit/lit.js";
import { truth } from "../timing.js";
import { clamp, ease, lerp, mix, prog, pulse, window } from "../util.js";
import { counterPage, strike, tag } from "./rerender-helpers.js";

export const transition = "fade";

// ------------------------------------------------------------ cached layout

let TREES = null;
function trees() {
  if (TREES) return TREES;
  const opts = { size: 26, whitespace: "hide", inline: true };
  const t0 = new Tree(truth().counter.render0.body, opts);
  const t1 = new Tree(truth().counter.render1.body, opts);
  const row = (tr, pred) => tr.rows.find(pred);
  const rows = (tr) => ({
    empty: row(tr, (r) => r.kind === "comment" && r.node.data === ""),
    span: row(tr, (r) => r.node.name === "span" && r.kind === "open"),
    marker: row(tr, (r) => r.kind === "comment" && r.node.data.startsWith("?lit$")),
    text: row(tr, (r) => r.kind === "text"),
    button: row(tr, (r) => r.node.name === "button"),
  });
  TREES = { t0, t1, r0: rows(t0), r1: rows(t1) };
  return TREES;
}

const CODES = new Map();
const code = (src, size) => {
  const k = `${size}|${src}`;
  if (!CODES.has(k)) CODES.set(k, new Code(src, { size }));
  return CODES.get(k);
};
// One line of code, vertically centred on yc. Returns its width.
function codeLine(ctx, src, x, yc, { size = 30, alpha = 1, style = null } = {}) {
  const c = code(src, size);
  c.draw(ctx, x, yc - c.lh / 2, { alpha, style });
  return c.width(ctx);
}

// Geometry: the browser and devtools start large (like the opening) and
// move to a right-hand column when the explanation starts.
const BR1 = { x: 90, y: 190, w: 820, h: 610 }, BR2 = { x: 1300, y: 122, w: 560, h: 330 };
const DT1 = { x: 960, y: 190, w: 870, h: 610 }, DT2 = { x: 1300, y: 482, w: 560, h: 528 };

// Act 2 lanes: one part card per binding (card tops), and where the
// comparisons and DOM calls go.
const CARD_X = 84, CARD_W = 440, CARD_SIZE = 26;
const LANE_C = [338, 548, 752];                  // lane centres
const LANE_H = [153, 107.5, 153];                // card heights at CARD_SIZE
const ACT_X = 570;
const VALUES2 = { x: CARD_X - 4, y: 116 };       // the values array in act 2

export function draw(F, S) {
  const { ctx, t } = F;
  const { t0, t1, r0, r1 } = trees();

  // ---------------------------------------------------------------- times
  const pressT = S.word(0, "click") + 0.08;
  const mv = prog(t, S.m("again") - 0.2, 0.9);
  const act1 = window(t, S.m("again") + 0.1, S.m("straight") - 0.15, 0.4, 0.45);
  const act2 = prog(t, S.m("straight") + 0.05, 0.6);
  // the two DOM writes land here
  const setT = S.m("set") + 0.45;
  const dataT = S.m("data") + 0.5;
  const setU = prog(t, setT, 0.35);
  const dataU = prog(t, dataT, 0.35);
  // the same values again
  const againT = S.m("samevalue") - 0.1;
  const again = prog(t, againT, 0.5);
  const restU = prog(t, S.m("rest") - 0.1, 0.6);

  // --------------------------------------------------------- right column
  const br = mix(BR1, BR2, mv), dt = mix(DT1, DT2, mv);
  const enter = prog(t, S.start - 0.3, 0.6, ease.outCubic);
  const press = pulse(t, pressT - 0.08, 0.24);
  const page = browserWindow(ctx, { ...br, alpha: enter, url: "localhost:8000/counter.html" });
  const flash = Math.max(pulse(t, setT - 0.05, 0.9), pulse(t, dataT - 0.05, 0.9));
  const app = counterPage(ctx, page, {
    text: dataU > 0 ? "1" : "0", prevText: "0", textU: dataU, odd: setU, press,
    scale: lerp(0.85, 0.6, mv), alpha: enter, flash: 0.8 * flash,
  });

  // devtools: the page's DOM. The two changed rows crossfade from render 0's
  // DOM to render 1's as each write lands.
  const sel = t >= dataT ? r0.text : t >= setT ? r0.span : null;
  const selU = Math.max(window(t, setT - 0.1, S.m("b"), 0.2, 0.4), window(t, dataT - 0.1, S.m("c"), 0.2, 0.4));
  const staticA = lerp(1, 0.3, restU);
  const D = devtools(ctx, {
    ...dt, tree: t0, alpha: enter, select: sel, selectU: selU,
    rowStyle: (row) => (row === r0.span ? { alpha: (1 - setU) * staticA } : row === r0.text ? { alpha: 1 - dataU } : { alpha: staticA }),
  });
  withAlpha(ctx, enter, () => {
    t1.draw(ctx, D.treeX, D.treeY, {
      rowStyle: (row) => (row === r1.span ? { alpha: setU } : row === r1.text ? { alpha: dataU } : { hide: true }),
      style: (seg, row) => (row === r1.span && seg.attr !== 0 ? { alpha: staticA } : {}),
    });
  });
  const valueRect = t1.rowRect(ctx, D.treeX, D.treeY, r1.span, { from: 5, to: 6 });
  const spanRowRect = t1.rowRect(ctx, D.treeX, D.treeY, r1.span);
  const textRect = t1.rowRect(ctx, D.treeX, D.treeY, r1.text);
  const btnRect = t0.rowRect(ctx, D.treeX, D.treeY, r0.button);
  ring(ctx, { ...valueRect, color: B[0], u: pulse(t, setT, 1.4), pad: 5, r: 6 });
  ring(ctx, { ...textRect, color: B[1], u: pulse(t, dataT, 1.4), pad: 5, r: 6 });
  // the root part's comment, when render finds the part
  const emptyRect = t0.rowRect(ctx, D.treeX, D.treeY, r0.empty);
  ring(ctx, { ...emptyRect, color: OBJ.root, u: window(t, S.m("render") + 0.5, S.m("hit"), 0.35, 0.5), pad: 5, r: 6 });

  // the cursor clicks, then leaves as the windows move
  const cin = prog(t, S.start - 0.2, 0.75, ease.inOutCubic);
  const cout = prog(t, S.m("again") - 0.5, 0.4);
  if (cout < 1) {
    const from = { x: br.x + br.w + 90, y: br.y + br.h + 70 };
    const p = mix(from, { x: app.button.x + 40, y: app.button.y + 8 }, cin);
    const ripple = t >= pressT ? clamp((t - pressT) / 0.5) : 0;
    cursor(ctx, p.x, p.y, { press, alpha: enter * (1 - cout), ripple: ripple < 1 ? ripple : 0 });
  }

  // the values array: beside the TemplateResult in act 1, above the lanes in act 2
  const vIn = prog(t, S.m("values") - 0.15, 0.45, ease.outBack);
  const vMove = prog(t, S.m("straight") - 0.1, 0.8);
  const vPos = mix({ x: 512, y: 350 }, VALUES2, vMove);
  const vals = counterValues(1);
  const VG = valuesArray(ctx, { x: VALUES2.x, y: VALUES2.y, values: vals, size: 28, alpha: 0 });

  if (act1 > 0) drawAct1(ctx, t, S, act1, mv >= 1 ? app.button : null);
  if (act2 > 0) drawAct2(ctx, t, S, { act2, D, VG, setT, dataT, again, againT, restU, valueRect, textRect, btnRect, spanRowRect });

  if (vIn > 0) {
    const hlNew = pulse(t, S.m("values") + 0.2, 1.4);
    const F = flights(t, S, againT);
    const cellA = F.map((f) => (f.u > 0 && f.u < 1 ? 0.3 : 1));
    valuesArray(ctx, { x: vPos.x, y: vPos.y, values: vals, size: 28, alpha: vIn * Math.max(act1, act2), hl: [hlNew, hlNew, hlNew], cellAlpha: cellA });
    withAlpha(ctx, act1 * vIn, () =>
      text(ctx, "new values", vPos.x + 440, vPos.y + 27, { font: sans(26, 650), color: C.accent, baseline: "middle", alpha: prog(t, S.m("values") + 0.15, 0.4) }));
    withAlpha(ctx, act2, () =>
      text(ctx, "instance._update(values)", vPos.x + 440, vPos.y + 27, { font: mono(26, 500), color: C.text3, baseline: "middle" }));
  }
}

// When each value flies from the values array to its lane: in the update,
// and again when the same values are rendered a second time.
function flights(t, S, againT) {
  const starts = [S.m("a") - 0.15, S.m("b") - 0.15, S.m("c") - 0.15];
  return starts.map((a, k) => {
    const u1 = prog(t, a, 0.7);
    const u2 = prog(t, againT + 0.15 * k, 0.6);
    return { u: t >= againT ? u2 : u1, second: t >= againT };
  });
}

// ------------------------------------------------------------------ act 1

function drawAct1(ctx, t, S, a, btn) {
  withAlpha(ctx, a, () => {
    // counter(1) -> a new TemplateResult
    const callU = prog(t, S.m("again") - 0.05, 0.4);
    const cardU = prog(t, S.word(0, "makes") - 0.1, 0.45, ease.outBack);
    const cw = codeLine(ctx, "counter(1)", 84, 150, { size: 34, alpha: callU });
    // the click handler runs: render(counter(count + 1), document.body)
    const hu = window(t, S.m("again") + 0.75, S.m("strings") - 0.3, 0.3, 0.5);
    if (hu > 0 && btn) {
      const a0 = { x: btn.x - 82, y: btn.y - 4 }, a1 = { x: 84 + cw + 22, y: 150 };
      arrow(ctx, a0, a1, { color: B[2], width: 2.5, bend: 90, progress: prog(t, S.m("again") + 0.75, 0.6), alpha: hu, dash: [9, 8] });
      const mid = along(a0, a1, 0.62, 90);
      text(ctx, "the click handler runs", mid.x, mid.y + 58, { font: sans(24, 600), color: B[2], align: "center", baseline: "middle", alpha: hu * prog(t, S.m("again") + 1.1, 0.4) });
    }
    if (cardU <= 0) return;
    const cx = 84, cy = 190;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(lerp(0.9, 1, cardU), lerp(0.9, 1, cardU));
    ctx.translate(-cx, -cy);
    const card = templateResultCard(ctx, { x: cx, y: cy, alpha: clamp(cardU), size: 28 });
    ctx.restore();

    // strings: the same array as before
    const sU = prog(t, S.m("strings") - 0.15, 0.5);
    const sp = card.ports.strings;
    const box = { x: 512, y: 262, w: 262, h: 58 };
    if (sU > 0) {
      arrow(ctx, sp, { x: box.x - 10, y: box.y + box.h / 2 }, { color: rgba(OBJ.result, 0.9), width: 2.5, progress: sU, bend: -16 });
      withAlpha(ctx, prog(t, S.m("strings") + 0.1, 0.35), () => {
        fillRR(ctx, box.x, box.y, box.w, box.h, 10, C.panel2);
        strokeRR(ctx, box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1, 10, C.border2, 1.5);
        miniStrings(ctx, box.x + 20, box.y + 15, C.text2, 1.15);
        text(ctx, "strings", box.x + 96, box.y + box.h / 2 + 1, { font: mono(28, 500), color: C.text, baseline: "middle" });
      });
      const same = prog(t, S.word(0, "same") - 0.05, 0.5);
      check(ctx, box.x + box.w + 34, box.y + box.h / 2, 30, C.ok, same);
      text(ctx, "same array as counter(0)", box.x + box.w + 62, box.y + box.h / 2 + 1, { font: sans(28, 650), color: C.ok, baseline: "middle", alpha: same });
    }
    // values: new (the array is drawn by draw(), since it moves on into act 2)
    arrow(ctx, card.ports.values, { x: 502, y: 350 + 27 }, { color: rgba(OBJ.result, 0.9), width: 2.5, progress: prog(t, S.m("values") - 0.15, 0.5), bend: 8 });

    // the three lookups
    const rows = [
      { y: 540, m: "render", src: "document.body._$litPart$", obj: "ChildPart", color: OBJ.root, ok: "found", word: [1, "finds"], dt: 0.35 },
      { y: 676, m: "hit", src: "templateCache.get(strings)", obj: "Template", color: OBJ.template, ok: "hit", word: [1, "cache,"] },
      { y: 812, m: "inst", src: "part._$committedValue", obj: "TemplateInstance", color: OBJ.instance, ok: "same template", word: [1, "instance"] },
    ];
    const CHIP_X = 640;
    const cf = mono(28, 600);
    rows.forEach((r) => {
      const u = prog(t, S.m(r.m) - 0.15, 0.45);
      if (u <= 0) return;
      withAlpha(ctx, u, () => {
        const w = codeLine(ctx, r.src, 84, r.y, {
          size: 31,
          style: (tok) => (tok.text === "templateCache" ? { color: OBJ.cache } : {}),
        });
        arrow(ctx, { x: 84 + w + 18, y: r.y }, { x: CHIP_X - 16, y: r.y }, { color: C.text3, width: 2.5, progress: prog(t, S.m(r.m) + 0.35, 0.45), head: 11 });
        const chipW = measure(ctx, r.obj, cf) + 36;
        const cu = prog(t, S.m(r.m) + 0.6, 0.4, ease.outBack);
        withAlpha(ctx, clamp(cu), () => {
          fillRR(ctx, CHIP_X, r.y - 27, chipW, 54, 11, rgba(r.color, 0.13));
          strokeRR(ctx, CHIP_X + 0.5, r.y - 26.5, chipW - 1, 53, 11, rgba(r.color, 0.75), 2);
          text(ctx, r.obj, CHIP_X + 18, r.y + 1, { font: cf, color: r.color, baseline: "middle" });
        });
        const ok = prog(t, S.word(r.word[0], r.word[1]) + (r.dt ?? 0.05), 0.45);
        check(ctx, CHIP_X + chipW + 38, r.y, 32, C.ok, ok);
        text(ctx, r.ok, CHIP_X + chipW + 66, r.y + 1, { font: sans(30, 650), color: C.ok, baseline: "middle", alpha: ok });
      });
    });
    // why each phase is skipped
    const sk = [prog(t, S.m("skip") - 0.05, 0.4), prog(t, S.m("skip") + 0.2, 0.4)];
    tag(ctx, { x: CHIP_X, y: 676 + 40, text: "prepare skipped", color: C.text2, dashed: true, alpha: sk[0], h: 38, font: sans(22, 650) });
    tag(ctx, { x: CHIP_X, y: 812 + 40, text: "create skipped", color: C.text2, dashed: true, alpha: sk[1], h: 38, font: sans(22, 650) });
  });
}

// ------------------------------------------------------------------ act 2

const PARTS = [
  { kind: "AttributePart", name: "class", old: "''", neu: "'odd'" },
  { kind: "ChildPart", name: null, old: "0", neu: "1" },
  { kind: "EventPart", name: "click", old: "() => …", neu: "() => …" },
];

function drawAct2(ctx, t, S, o) {
  const { act2, D, VG, setT, dataT, again, againT, restU } = o;
  const F = flights(t, S, againT);
  const vals = counterValues(1);
  const first = 1 - again; // the first pass's annotations give way to the repeat's
  const twoU = window(t, S.m("two") - 0.1, S.m("rest") + 0.4, 0.3, 0.5);

  const frameU = prog(t, S.m("straight") + 0.3, 0.5);
  withAlpha(ctx, act2, () => {
    // the instance that holds the parts
    ctx.save();
    ctx.globalAlpha *= frameU;
    const fx = CARD_X - 22, fy = 200, fw = CARD_W + 44, fh = 666;
    fillRR(ctx, fx, fy, fw, fh, 18, rgba(OBJ.instance, 0.05));
    strokeRR(ctx, fx + 0.5, fy + 0.5, fw - 1, fh - 1, 18, rgba(OBJ.instance, 0.45), 1.5);
    text(ctx, "TemplateInstance", fx + 22, fy + 31, { font: sans(24, 650), color: OBJ.instance, baseline: "middle" });
    text(ctx, "_$parts", fx + fw - 22, fy + 31, { font: mono(22, 500), color: C.text3, baseline: "middle", align: "right" });
    ctx.restore();

    const cards = PARTS.map((p, k) => {
      const top = LANE_C[k] - LANE_H[k] / 2;
      const cu = prog(t, S.m("straight") + 0.4 + 0.12 * k, 0.5, ease.outCubic);
      const storeT = [setT - 0.2, dataT - 0.2, S.m("keep") + 0.1][k];
      const committed = t >= storeT ? p.neu : p.old;
      const rows = [];
      if (p.name) rows.push({ k: "name", v: `'${p.name}'`, vColor: C.text });
      rows.push({ k: "_$committedValue", v: committed, vColor: B[k], hl: pulse(t, storeT, 1.1) });
      return { top, u: cu, g: partCardLite(ctx, { x: CARD_X, y: top + 16 * (1 - cu), w: CARD_W, title: p.kind, color: B[k], rows, alpha: cu, size: CARD_SIZE }) };
    });

    // values fly in from the array
    F.forEach((f, k) => {
      if (f.u <= 0 || f.u >= 1) return;
      const c = VG.cells[k];
      const p0 = { x: c.x + c.w / 2, y: c.y + c.h / 2 };
      const w = measure(ctx, vals[k], mono(30, 600));
      const dest = { x: ACT_X + w / 2, y: LANE_C[k] - (k === 1 ? 62 : 32) };
      const q = along(p0, dest, ease.inOutCubic(f.u), -50);
      withGlow(ctx, rgba(B[k], 0.8), 16, () =>
        text(ctx, vals[k], q.x, q.y, { font: mono(30, 600), color: B[k], align: "center", baseline: "middle" }));
    });
    const landed = (k) => (F[k].second ? 0 : prog(t, S.m(["a", "b", "c"][k]) + 0.52, 0.2));

    // ---- lane 0: the class
    const L0 = LANE_C[0];
    withAlpha(ctx, first, () => {
      const cmp = prog(t, S.word(2, "from") - 0.1, 0.4);
      const cw = compare(ctx, ACT_X, L0 - 32, "'odd'", "!==", "''", B[0], landed(0), cmp);
      tagAfter(ctx, "changed", C.accent, ACT_X + cw + 18, L0 - 32, cmp);
      const opU = prog(t, S.m("set") - 0.1, 0.4);
      const w = callLine(ctx, ACT_X, L0 + 32, "setAttribute('class', 'odd')", B[0], opU);
      badge(ctx, ACT_X + w + 30, L0 + 32, "1", B[0], prog(t, setT, 0.35, ease.outBack));
      ring(ctx, { x: ACT_X - 4, y: L0 + 32 - 22, w: w + 58, h: 44, color: B[0], u: twoU, pad: 6, r: 10 });
      arrow(ctx, { x: ACT_X + w + 54, y: L0 + 32 }, { x: o.spanRowRect.x - 12, y: o.spanRowRect.y + o.spanRowRect.h / 2 },
        { color: B[0], width: 2.5, progress: prog(t, S.m("set") + 0.1, 0.45), bend: 50, alpha: 1 - 0.7 * restU });
    });

    // ---- lane 1: the text
    const L1 = LANE_C[1];
    withAlpha(ctx, first, () => {
      const cmp = prog(t, S.word(2, "too,") - 0.3, 0.4);
      const cw = compare(ctx, ACT_X, L1 - 62, "1", "!==", "0", B[1], landed(1), cmp);
      tagAfter(ctx, "changed", C.accent, ACT_X + cw + 18, L1 - 62, cmp);
      // not a new text node...
      const tn = prog(t, S.m("textnode") - 0.1, 0.4);
      const w0 = callLine(ctx, ACT_X, L1, "document.createTextNode(1)", C.text3, tn);
      strike(ctx, { x: ACT_X, y: L1 - 16, w: w0, h: 32 }, prog(t, S.word(2, "new", 0) - 0.1, 0.5), C.bad, 3);
      cross(ctx, ACT_X + w0 + 32, L1, 26, C.bad, prog(t, S.word(2, "node.") - 0.1, 0.4));
      // ...the one it made last time gets new data
      const opU = prog(t, S.m("data") - 0.1, 0.4);
      const w = callLine(ctx, ACT_X, L1 + 62, "text.data = 1", B[1], opU);
      badge(ctx, ACT_X + w + 30, L1 + 62, "2", B[1], prog(t, dataT, 0.35, ease.outBack));
      ring(ctx, { x: ACT_X - 4, y: L1 + 62 - 22, w: w + 58, h: 44, color: B[1], u: twoU, pad: 6, r: 10 });
      tagAfter(ctx, "same node", C.text2, ACT_X + w + 74, L1 + 62, prog(t, S.word(2, "one", 1) - 0.1, 0.4));
      arrow(ctx, { x: ACT_X + w + 206, y: L1 + 62 }, { x: o.textRect.x - 12, y: o.textRect.y + o.textRect.h / 2 },
        { color: B[1], width: 2.5, progress: prog(t, S.m("data") + 0.1, 0.45), bend: 20, alpha: 1 - 0.7 * restU });
    });

    // ---- lane 2: the handler
    const L2 = LANE_C[2];
    withAlpha(ctx, first, () => {
      withAlpha(ctx, landed(2), () => text(ctx, "() => …", ACT_X, L2 - 32, { font: mono(30, 600), color: B[2], baseline: "middle" }));
      tagAfter(ctx, "a new function", B[2], ACT_X + measure(ctx, "() => … ", mono(30, 600)) + 8, L2 - 32, prog(t, S.word(2, "new", 1) - 0.1, 0.4));
      callLine(ctx, ACT_X, L2 + 32, "kept as _$committedValue", C.text2, prog(t, S.m("keep") - 0.05, 0.4), sans(27, 550));
    });
    // the listener: the button's listener is the part itself, and stays put
    const lu = prog(t, S.m("straight") + 0.5, 0.6);
    const hot = window(t, S.m("listener") - 0.1, S.m("two") + 0.2, 0.3, 0.5);
    const b = o.btnRect;
    const a0 = { x: b.x - 12, y: b.y + b.h / 2 }, a1 = { x: CARD_X + CARD_W + 10, y: L2 + 52 };
    withAlpha(ctx, lerp(0.5, 1, hot) * (1 - 0.6 * restU), () =>
      arrow(ctx, a0, a1, { color: B[2], width: 2.5, progress: lu, bend: -70, dash: [9, 8], glow: hot }));
    const mid = along(a0, a1, 0.62, -70);
    withAlpha(ctx, lu * (1 - 0.6 * restU), () =>
      text(ctx, "listener", mid.x, mid.y + 28, { font: sans(22, 600), color: B[2], align: "center", baseline: "middle" }));
    const un = window(t, S.m("listener") + 0.1, S.m("samevalue") - 0.2, 0.4, 0.4);
    check(ctx, mid.x - 50, mid.y + 66, 26, C.ok, un);
    text(ctx, "unchanged", mid.x - 28, mid.y + 67, { font: sans(24, 650), color: C.ok, baseline: "middle", alpha: un });

    // ---- the same values again: equal, so nothing to do
    if (again > 0) {
      withAlpha(ctx, again, () => {
        const eq = (k) => prog(t, k === 0 ? S.word(3, "string") - 0.1 : k === 1 ? S.word(3, "number") - 0.1 : S.word(3, "number") + 0.4, 0.4);
        const ln = (k) => prog(t, againT + 0.15 * k + 0.55, 0.2);
        let cw = compare(ctx, ACT_X, L0 - 32, "'odd'", "===", "'odd'", B[0], ln(0), eq(0));
        tagAfter(ctx, "skip", C.text2, ACT_X + cw + 18, L0 - 32, eq(0), true);
        cw = compare(ctx, ACT_X, L1 - 62, "1", "===", "1", B[1], ln(1), eq(1));
        tagAfter(ctx, "skip", C.text2, ACT_X + cw + 18, L1 - 62, eq(1), true);
        withAlpha(ctx, ln(2), () => text(ctx, "() => …", ACT_X, L2 - 32, { font: mono(30, 600), color: B[2], baseline: "middle" }));
        text(ctx, "kept, no DOM call", ACT_X + measure(ctx, "() => … ", mono(30, 600)) + 8, L2 - 32, { font: sans(24, 550), color: C.text3, baseline: "middle", alpha: eq(2) });
      });
    }

    // ---- DOM writes
    const cy = 896;
    const writes = t >= dataT ? 2 : t >= setT ? 1 : 0;
    const bump = Math.max(pulse(t, setT, 0.6), pulse(t, dataT, 0.6), pulse(t, S.m("two"), 0.8));
    const two = window(t, S.m("two") - 0.1, S.m("samevalue") - 0.2, 0.3, 0.5);
    counterBox(ctx, CARD_X - 22, cy, "DOM writes", String(writes), { bump, glow: two, dim: 0.5 * again });
    const ag = prog(t, S.word(3, "skips") - 0.25, 0.45, ease.outBack);
    counterBox(ctx, CARD_X + 380, cy, "counter(1) again", "0", { alpha: clamp(ag), glow: window(t, S.word(3, "skips") - 0.05, S.end + 1, 0.3, 0.3), w: 400, mono: true });
  });
  // "untouched": everything else in the DOM
  const un = prog(t, S.m("rest") + 0.3, 0.4);
  tag(ctx, { x: D.x + D.w - 24, y: D.y + D.h - 62, text: "everything else untouched", color: C.text2, align: "right", alpha: un, font: sans(22, 650), h: 38 });
}

// A part card without ports: title and rows [{k, v, vColor, hl}].
function partCardLite(ctx, { x, y, w, title, color, rows, alpha, size }) {
  return card(ctx, { x, y, w, title, color, rows, alpha, size });
}
// new OP old: the new value (appears as it lands), then the operator and the
// part's last value. Returns the width.
function compare(ctx, x, y, neu, op, old, color, gotU, cmpU) {
  const f = mono(30, 600);
  const w = measure(ctx, neu + " ", f);
  const w2 = measure(ctx, op + " ", f);
  text(ctx, neu, x, y, { font: f, color, baseline: "middle", alpha: gotU });
  withAlpha(ctx, cmpU, () => {
    text(ctx, op, x + w, y, { font: f, color: C.text2, baseline: "middle" });
    text(ctx, old, x + w + w2, y, { font: f, color: rgba(color, 0.7), baseline: "middle" });
  });
  return w + w2 + measure(ctx, old, f);
}

function tagAfter(ctx, str, color, x, y, u, dashed = false) {
  if (u <= 0) return;
  tag(ctx, { x: x + 10 * (1 - u), y: y - 18, h: 36, text: str, color, alpha: u, font: sans(21, 650), dashed });
}

function callLine(ctx, x, y, str, color, u, f = mono(28, 550)) {
  if (u <= 0) return measure(ctx, str, f);
  return text(ctx, str, x + 12 * (1 - u), y, { font: f, color, baseline: "middle", alpha: u });
}

function badge(ctx, x, y, n, color, u) {
  if (u <= 0) return;
  withAlpha(ctx, clamp(u), () => {
    ctx.beginPath();
    ctx.arc(x, y, 17 * Math.max(0.3, u), 0, Math.PI * 2);
    ctx.fillStyle = rgba(color, 0.22);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, n, x, y + 1, { font: sans(20, 750), color, align: "center", baseline: "middle" });
  });
}

function counterBox(ctx, x, y, label, value, { bump = 0, glow = 0, alpha = 1, dim = 0, w = 360, mono: isMono = false } = {}) {
  const h = 100;
  withAlpha(ctx, alpha * (1 - dim), () => {
    panel(ctx, { x, y, w, h, accent: C.accent, glow, r: 16 });
    text(ctx, label, x + 26, y + h / 2 + 1, { font: isMono ? mono(27, 550) : sans(28, 600), color: C.text2, baseline: "middle" });
    const k = 1 + 0.25 * bump;
    ctx.save();
    ctx.translate(x + w - 52, y + h / 2);
    ctx.scale(k, k);
    text(ctx, value, 0, 3, { font: sans(60, 750), color: C.text, align: "center", baseline: "middle" });
    ctx.restore();
  });
}
