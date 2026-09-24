// The composition shared by `root` and `lookup` (one continuous shot; lookup
// starts with a cut). Everything is scheduled from both scenes' marks, so
// either scene's draw() can call drawRootStage(F) for any t.
//
// root:   render(counter(0), document.body) → body._$litPart$ is undefined →
//         new ChildPart, whose startNode is a new empty comment in the body
//         (mystery comment #1) → what a child part can hold → stored on the
//         body → given the TemplateResult (_$setValue).
// lookup: templateCache.get(result.strings) → miss → first look at the
//         strings → PREPARE; the strings array ends centre stage.

import { scene, truth } from "../timing.js";
import { C, DOMC, rgba } from "../kit/theme.js";
import { along, arrow, chip, cross, fillRR, measure, mono, ring, sans, strokeRR, text, wash, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { Code } from "../kit/code.js";
import { Tree } from "../kit/tree.js";
import { card, measureCard } from "../kit/objects.js";
import { COUNTER_SRC, OBJ, cacheTable, miniStrings, stringsArray, templateResultCard } from "../kit/lit.js";
import { ease, lerp, prog, pulse } from "../util.js";

const GOLD = "#ffd166"; // the "mystery comment" treatment from `open`

// ------------------------------------------------------------ layout

const CARD = 28;                                   // card text size (as in literal)
const CALL_Y = 124;                                // top of the code line
const RESULT0 = { x: 90, y: 462 };                 // TemplateResult: where literal leaves counter(0)'s
const PART = { x: 566, y: 440 };                   // the root ChildPart (root)
const SHIFT = { x: -236, y: -170 };                // ...moves this much at the start of lookup
const BODY = { x: 1210, y: 372, w: 650 };          // document.body
const CACHE = { x: 1106, y: 330, w: 540, k: 1.2 }; // templateCache (lookup), drawn scaled by k
const STR_LOW = { y: 846, size: 28 };              // strings array, first look
const STR_MID = { y: 478, size: 30 };              // strings array, centre stage (end); markers starts from exactly this

// ------------------------------------------------------------ cached layout objects

let CALL = null;
// "render(counter(0), document.body);", the last line of the example.
const callCode = () => (CALL ??= new Code(COUNTER_SRC.split("\n").at(-1), { size: 40 }));

let BODY_TREE = null;
// document.body as render() leaves it: one child, the part's start node
// (truth: rootPart.startNode is the body's child 0, the empty comment).
function bodyTree() {
  if (BODY_TREE) return BODY_TREE;
  const c = truth().counter;
  const [i] = c.rootPart.startNode;
  const node = { type: "element", name: "body", attrs: [], children: [c.render0.body.children[i]] };
  BODY_TREE = new Tree(node, { size: 32, whitespace: "hide" });
  return BODY_TREE;
}

const RESULT_ROWS = [{ k: "_$litType$", v: "1" }, { k: "strings", v: "[…4]", port: true }, { k: "values", v: "[…3]", port: true }];
const PART_ROWS = [{ k: "startNode", v: "<!---->", port: true }, { k: "endNode", v: "null" }, { k: "_$committedValue", v: "nothing" }];

// ------------------------------------------------------------ timing

let TIMES = null;
function times() {
  if (TIMES) return TIMES;
  const R = scene("root"), L = scene("lookup");
  TIMES = {
    render: R.m("render"),
    lookup: R.m("lookup"),
    none: R.m("none"),
    isnt: R.word(0, "isn't"),
    make: R.m("make"),
    comment: R.m("comment"),
    begins: R.word(0, "begins"),
    empty: R.word(0, "empty"),
    first: R.m("first"),
    mystery: R.word(0, "mystery"),
    childpart: R.m("childpart"),
    spot: R.word(1, "spot"),
    kinds: [R.word(1, "text"), R.word(1, "nodes"), R.word(1, "list"), R.word(1, "whole")],
    store: R.m("store"),
    hand: R.m("hand"),
    given: R.word(1, "given"),
    result: R.word(1, "result"),
    cut: L.start,
    ask: L.m("ask"),
    look: L.word(0, "look"),
    cache: L.m("cache"),
    prepared: L.word(0, "prepared"),
    keyed: L.word(0, "keyed"),
    strings: L.word(0, "strings"),
    miss: L.m("miss"),
    lazy: L.m("lazy"),
    looked: L.word(0, "looked"),
    prepare: L.m("prepare"),
  };
  return TIMES;
}

// ------------------------------------------------------------ pieces

// A filled dot (a port) with a soft glow.
function dot(ctx, p, color, r = 7) {
  withGlow(ctx, rgba(color, 0.8), 10, () => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });
}

// document.body: a JS property row (_$litPart$) above a small DOM view.
//   propU: the property row opens (0..1); commentU: the comment is inserted;
//   slotU: the part's spot opens after the comment.
// Returns geometry for arrows, rings and the spot.
function bodyBox(ctx, { x, y, w, alpha, propU, commentU, slotU }) {
  const tree = bodyTree();
  const head = 50, propH = 58 * propU, pad = 16;
  const lh = tree.lh, slotH = lh + 18;
  const treeY = y + head + propH + pad;
  const treeX = x + 30;
  const h = head + propH + pad + lh * (2 + commentU) + slotH * slotU + pad;
  const [, commentRow, closeRow] = tree.rows;
  const inset = treeX + tree.indent * tree.adv(ctx);
  const out = { x, y, w, h };
  out.prop = { x, y: y + head, w, h: propH, cy: y + head + propH / 2 };
  out.port = { x, y: out.prop.cy };
  out.commentRect = tree.rowRect(ctx, treeX, treeY, commentRow);
  out.slot = { x: inset - 10, y: treeY + 2 * lh + 10, w: x + w - 26 - (inset - 10), h: slotH - 16 };
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, x, y, w, h, 14, C.panel);
    ctx.restore();
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 14);
    ctx.clip();
    ctx.fillStyle = rgba(OBJ.dom, 0.14);
    ctx.fillRect(x, y, w, head);
    ctx.fillStyle = rgba(OBJ.dom, 0.45);
    ctx.fillRect(x, y + head - 1.5, w, 1.5);
    if (propU > 0) {
      ctx.fillStyle = rgba(OBJ.dom, 0.3 * propU);
      ctx.fillRect(x, y + head + propH - 1, w, 1);
    }
    ctx.restore();
    text(ctx, "document.body", x + 20, y + head / 2 + 1, { font: mono(25, 600), color: OBJ.dom, baseline: "middle" });
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 14, rgba(OBJ.dom, 0.5), 1.5);
    // the DOM: <body>, the comment (inserted), the part's spot, </body>
    tree.draw(ctx, treeX, treeY, {
      rowStyle: (row) => {
        if (row === commentRow) return { alpha: commentU };
        if (row === closeRow) return { dy: -lh * (1 - commentU) + slotH * slotU };
        return {};
      },
    });
  });
  return out;
}

// The root ChildPart. hlStart: highlights the startNode row.
function childPartCard(ctx, { x, y, alpha, glow, hlStart = 0 }) {
  const w = measureCard(ctx, { title: "ChildPart", rows: PART_ROWS, size: CARD }).w;
  const g = card(ctx, {
    x, y, w, title: "ChildPart", color: OBJ.root, alpha, glow, size: CARD,
    rows: [
      { k: "startNode", v: "", hl: hlStart },
      { k: "endNode", v: "null", vColor: C.text3 },
      { k: "_$committedValue", v: "nothing", vColor: C.text3 },
    ],
  });
  const kw = measure(ctx, "_$committedValue:", mono(CARD, 450));
  const r0 = g.row(0);
  g.startPort = g.ports.startNode;
  withAlpha(ctx, alpha, () => {
    text(ctx, "<!---->", x + 20 + kw + 14, r0.y + r0.h / 2 + 1, { font: mono(CARD, 500), color: C.text, baseline: "middle" });
    dot(ctx, g.startPort, C.text);
  });
  return g;
}

// ------------------------------------------------------------ the stage

export function drawRootStage(F) {
  const { ctx, t } = F;
  const T = times();

  // Global fades: in lookup the body gives way to the cache; at `lazy` the
  // rest steps back for the strings; at `prepare` all but the strings leave.
  const bodyOut = prog(t, T.result + 0.45, 0.6);
  const toLookup = prog(t, T.cut - 0.1, 0.6);
  const lazyDim = prog(t, T.lazy - 0.1, 0.6);
  const outro = prog(t, T.prepare - 0.15, 0.6);
  const keep = 1 - outro;
  const ctxAlpha = lerp(1, 0.4, lazyDim) * keep; // the part, the result, the cache
  // in lookup the part (and the result it holds) move up and left, making
  // room for the cache and, later, the strings
  const shiftU = prog(t, T.cut - 0.05, 0.85);
  const partX = PART.x + SHIFT.x * shiftU, partY = PART.y + SHIFT.y * shiftU;

  const resSize = measureCard(ctx, { title: "TemplateResult", rows: RESULT_ROWS, size: CARD });
  const partSize = measureCard(ctx, { title: "ChildPart", rows: PART_ROWS, size: CARD });
  const dock = { x: partX + partSize.w / 2 - resSize.w / 2, y: partY + partSize.h + 96 };

  // ---------------------------------------------------------------- the call
  const code = callCode();
  const cx0 = 960 - code.width(ctx) / 2;
  const fRender = code.find("render");
  const fArg0 = code.find("counter(0)");
  const fArg1 = code.find("document.body");
  const callIn = prog(t, T.render - 0.35, 0.4);
  const callAlpha = callIn * lerp(1, 0.5, prog(t, T.make, 0.5)) * lerp(1, 0.7, toLookup) * lerp(1, 0.6, lazyDim) * keep;
  const hlCall = pulse(t, T.render - 0.15, 1.6);
  const argU = prog(t, T.render + 0.05, 0.45);
  const argOut = prog(t, T.make - 0.4, 0.5);
  const argRect0 = code.rect(ctx, cx0, CALL_Y, fArg0.line, fArg0.col, fArg0.len);
  const argRect1 = code.rect(ctx, cx0, CALL_Y, fArg1.line, fArg1.col, fArg1.len);
  const renderRect = code.rect(ctx, cx0, CALL_Y, fRender.line, fRender.col, fRender.len);
  withAlpha(ctx, callAlpha, () => {
    const whole = code.rect(ctx, cx0, CALL_Y, 0, 0, code.lines[0].length - 1);
    wash(ctx, { ...whole, color: C.accent, u: hlCall, pad: 10, r: 10 });
    code.draw(ctx, cx0, CALL_Y);
    // the two arguments, underlined in their objects' colours
    for (const [r, col] of [[argRect0, OBJ.result], [argRect1, OBJ.dom]]) {
      withAlpha(ctx, argU * (1 - argOut), () => {
        ctx.fillStyle = col;
        ctx.fillRect(r.x, r.y + r.h + 1, r.w * argU, 3);
      });
    }
  });

  // ---------------------------------------------------------------- where the result is
  // It's on screen from the first frame: literal ends with counter(0)'s
  // TemplateResult exactly here. On "given" it flies to the part.
  const handU = prog(t, T.given - 0.5, 0.95, ease.inOutCubic);
  const resPos = (() => {
    const a = { x: RESULT0.x + resSize.w / 2, y: RESULT0.y + resSize.h / 2 };
    const b = { x: dock.x + resSize.w / 2, y: dock.y + resSize.h / 2 };
    const p = along(a, b, handU, 130);
    return { x: p.x - resSize.w / 2, y: p.y - resSize.h / 2 };
  })();

  // ---------------------------------------------------------------- document.body
  const bodyIn = prog(t, T.render + 0.25, 0.7, ease.outCubic);
  const propU = prog(t, T.lookup + 0.35, 0.5);
  // In render(), new ChildPart(container.insertBefore(createMarker(), endNode), ...):
  // the empty comment is made and inserted first, then the part is built
  // around it. So on "makes one": the comment, then the card holding it.
  const commentU = prog(t, T.make + 0.05, 0.5);
  const slotU = prog(t, T.spot - 0.35, 0.6);
  const bodyAlpha = bodyIn * (1 - bodyOut);
  const body = bodyBox(ctx, { x: BODY.x, y: BODY.y + 24 * (1 - bodyIn), w: BODY.w, alpha: bodyAlpha, propU, commentU, slotU });

  // connectors from the call's arguments to their objects
  const conU = prog(t, T.render + 0.15, 0.6);
  const conOut = 1 - prog(t, T.lookup + 0.2, 0.5);
  if (conU > 0 && conOut > 0) {
    const a0 = { x: argRect0.x + argRect0.w / 2, y: argRect0.y + argRect0.h + 12 };
    arrow(ctx, a0, { x: RESULT0.x + resSize.w / 2 + 90, y: RESULT0.y - 58 }, { color: OBJ.result, width: 2, bend: 40, progress: conU, alpha: 0.75 * conOut, dash: [6, 7], head: 10 });
    const a1 = { x: argRect1.x + argRect1.w / 2, y: argRect1.y + argRect1.h + 12 };
    arrow(ctx, a1, { x: body.x + body.w / 2, y: BODY.y - 12 }, { color: OBJ.dom, width: 2, bend: -40, progress: conU, alpha: 0.75 * conOut, dash: [6, 7], head: 10 });
  }

  // the query: render → document.body._$litPart$
  const qU = prog(t, T.lookup - 0.1, 0.8);
  const qOut = 1 - prog(t, T.make - 0.3, 0.4);
  if (qU > 0 && qOut > 0) {
    const a = { x: renderRect.x + renderRect.w / 2, y: renderRect.y + renderRect.h + 10 };
    arrow(ctx, a, { x: body.port.x - 14, y: body.port.y }, { color: C.accent, width: 3, bend: -60, progress: qU, alpha: qOut, glow: 0.6 });
  }

  // the property row: _$litPart$: ? → undefined ✗ → ChildPart ●
  const storeU = prog(t, T.store - 0.1, 0.35);
  if (propU > 0) {
    withAlpha(ctx, bodyAlpha * propU, () => {
      const ky = body.prop.cy + 1;
      const kx = body.x + 30;
      const kwid = text(ctx, "_$litPart$:", kx, ky, { font: mono(CARD, 450), color: C.text3, baseline: "middle" });
      const vx = kx + kwid + 18;
      const q = prog(t, T.lookup + 0.7, 0.3) * (1 - prog(t, T.none - 0.1, 0.3));
      if (q > 0) {
        const breathe = 0.7 + 0.3 * Math.sin((t - T.lookup) * 5);
        text(ctx, "?", vx, ky, { font: sans(32, 800), color: C.accent, baseline: "middle", alpha: q * breathe });
      }
      const und = prog(t, T.none, 0.35) * (1 - storeU);
      if (und > 0) {
        const uw = text(ctx, "undefined", vx, ky, { font: mono(CARD, 500), color: C.text2, baseline: "middle", alpha: und });
        withAlpha(ctx, und, () => cross(ctx, vx + uw + 30, ky - 1, 28, C.bad, prog(t, T.isnt - 0.3, 0.45)));
      }
      if (storeU > 0) text(ctx, "ChildPart", vx, ky, { font: mono(CARD, 600), color: OBJ.root, baseline: "middle", alpha: storeU });
    });
  }

  // ---------------------------------------------------------------- the ChildPart
  const partIn = prog(t, T.make + 0.45, 0.45, ease.outBack);
  const partGlow = Math.max(pulse(t, T.make + 0.45, 2.2), pulse(t, T.childpart - 0.1, 1.6), 0.8 * pulse(t, T.ask - 0.1, 1.4));
  // "marks where that part begins": the start node and its arrow light up
  const markU = pulse(t, T.begins - 0.45, 1.5);
  let part = null;
  if (partIn > 0) {
    const pcx = partX + partSize.w / 2, pcy = partY + partSize.h / 2;
    withScale(ctx, lerp(0.6, 1, partIn), pcx, pcy, () => {
      part = childPartCard(ctx, { x: partX, y: partY, alpha: Math.min(1, partIn) * ctxAlpha, glow: partGlow, hlStart: markU });
    });
  }

  if (part) {
    // startNode → the comment
    const cr = body.commentRect;
    arrow(ctx, { x: part.startPort.x + 10, y: part.startPort.y }, { x: cr.x - 16, y: cr.y + cr.h / 2 }, {
      color: C.text, width: 2.5 + markU, bend: -14, progress: prog(t, T.make + 0.8, 0.55), alpha: 0.9 * bodyAlpha, head: 11 + 2 * markU, glow: markU,
    });
    // "an empty comment": the comment itself
    const emU = pulse(t, T.empty - 0.2, 1.3);
    if (emU > 0) withAlpha(ctx, bodyAlpha, () => wash(ctx, { ...cr, color: DOMC.comment, u: emU * 1.5, pad: 5, r: 8 }));
    // document.body._$litPart$ → the part
    const p = { x: body.port.x, y: body.port.y };
    withAlpha(ctx, bodyAlpha * prog(t, T.store, 0.2), () => dot(ctx, p, OBJ.root));
    arrow(ctx, { x: p.x - 9, y: p.y }, { x: partX + partSize.w + 8, y: partY + 24 }, {
      color: OBJ.root, width: 2.5, bend: 12, progress: prog(t, T.store, 0.65), alpha: 0.9 * bodyAlpha, head: 11,
    });
  }

  // the gold ring: mystery comment #1
  const ringU = prog(t, T.first - 0.15, 0.4);
  if (ringU > 0) {
    const cr = body.commentRect;
    const settle = prog(t, T.childpart + 0.5, 0.8);
    const breathe = 0.78 + 0.22 * Math.sin((t - T.first) * 4.5);
    ring(ctx, { x: cr.x, y: cr.y, w: cr.w, h: cr.h, r: 8, color: GOLD, u: ringU * lerp(breathe, 0.6, settle) * bodyAlpha, pad: 7 });
    const lu = prog(t, T.mystery - 0.35, 0.4) * lerp(1, 0.65, settle) * bodyAlpha;
    withAlpha(ctx, lu, () => withGlow(ctx, rgba(GOLD, 0.5), 10, () =>
      text(ctx, "mystery comment #1", cr.x + cr.w + 36, cr.y + cr.h / 2 + 1, { font: sans(25, 650), color: GOLD, baseline: "middle" })));
  }

  // the part's spot in the DOM
  if (slotU > 0) {
    const s = body.slot;
    withAlpha(ctx, slotU * bodyAlpha, () => {
      ctx.save();
      ctx.setLineDash([8, 6]);
      strokeRR(ctx, s.x, s.y, s.w, s.h, 10, rgba(OBJ.root, 0.5 + 0.35 * pulse(t, T.spot - 0.2, 1.6)), 2);
      ctx.restore();
    });
  }

  // what a child part can hold: four chips under the part
  if (part) {
    const kinds = ["text", "nodes", "a list", "a template"];
    const f = sans(25, 600), gap = 14, ch = 44;
    const ws = kinds.map((k) => measure(ctx, k, f) + 30);
    const total = ws.reduce((a, b) => a + b, 0) + gap * (kinds.length - 1);
    let x = partX + partSize.w / 2 - total / 2;
    const y = partY + partSize.h + 40;
    kinds.forEach((k, i) => {
      const u = prog(t, T.kinds[i] - 0.18, 0.4, ease.outBack);
      const w = ws[i];
      const tpl = i === 3;
      // on "and then": the others go, "a template" lights up, then goes as
      // the result flies in
      const out = tpl ? 1 - prog(t, T.given - 0.25, 0.35) : 1 - prog(t, T.hand - 0.1, 0.4);
      if (u > 0 && out > 0) {
        const g = tpl ? Math.max(pulse(t, T.kinds[3] + 0.05, 1.2), prog(t, T.hand - 0.1, 0.4)) : 0;
        withScale(ctx, lerp(0.7, 1, u), x + w / 2, y + ch / 2, () => {
          chip(ctx, {
            x, y, h: ch, text: k, font: f, padX: 15,
            color: tpl ? OBJ.result : C.text2, bg: tpl ? rgba(OBJ.result, 0.12) : C.panel3,
            border: tpl ? rgba(OBJ.result, 0.6) : null, glow: g, alpha: Math.min(1, u) * out * ctxAlpha,
          });
        });
      }
      x += w + gap;
    });
  }

  // ---------------------------------------------------------------- the TemplateResult
  // context (dimmed) while the narration is about the container and the part
  const resCtx = lerp(1, 0.5, prog(t, T.lookup + 0.3, 0.5) * (1 - prog(t, T.given - 0.9, 0.4)));
  const resAlpha = ctxAlpha * resCtx;
  const strGlow = Math.max(pulse(t, T.look - 0.7, 1.3), pulse(t, T.lazy - 0.1, 1.2));
  // its label, as literal draws it
  text(ctx, "counter(0)", resPos.x + resSize.w / 2, resPos.y - 26, { font: mono(26, 550), color: C.text2, align: "center", alpha: resAlpha * (1 - prog(t, T.given - 0.5, 0.3)) });
  const res = templateResultCard(ctx, { x: resPos.x, y: resPos.y, alpha: resAlpha, glow: pulse(t, T.given + 0.4, 1.3), size: CARD });
  if (strGlow > 0) withAlpha(ctx, resAlpha, () => wash(ctx, { ...res.row(1), color: OBJ.result, u: strGlow, pad: 0, r: 8 }));

  // part._$setValue(result): the hand-over
  const setU = prog(t, T.given - 0.05, 0.45) * (1 - prog(t, T.ask - 0.4, 0.4));
  if (setU > 0) {
    const y0 = partY + partSize.h + 10, y1 = dock.y - 10;
    const x = dock.x + 36;
    withAlpha(ctx, setU * keep, () => {
      arrow(ctx, { x, y: y1 }, { x, y: y0 }, { color: OBJ.result, width: 2.5, head: 10 });
      text(ctx, "part._$setValue(result)", x + 20, (y0 + y1) / 2 + 1, { font: mono(24, 500), color: C.text2, baseline: "middle" });
    });
  }

  // ---------------------------------------------------------------- lookup: the cache
  // cacheTable() lays out at a fixed scale; it's drawn here scaled by CACHE.k
  // (and by its scale-in), so its geometry is mapped to the screen by toScr.
  const cacheIn = prog(t, T.ask - 0.4, 0.45, ease.outBack);
  const cacheGlow = prog(t, T.cache - 0.1, 0.4) * (1 - prog(t, T.miss - 0.2, 0.5));
  const cacheAlpha = Math.min(1, cacheIn) * ctxAlpha;
  let cache = null;
  const kk = CACHE.k * lerp(0.7, 1, cacheIn);
  const lc = { x: CACHE.x + CACHE.w / 2, y: CACHE.y + 70 };                 // local centre
  const sc = { x: CACHE.x + (CACHE.w * CACHE.k) / 2, y: CACHE.y + 70 * CACHE.k }; // on screen
  const toScr = (p) => ({ x: sc.x + (p.x - lc.x) * kk, y: sc.y + (p.y - lc.y) * kk });
  // (cacheTable() only fills in its row geometry when drawn with alpha > 0)
  if (cacheIn > 0 && cacheAlpha > 0.002) {
    ctx.save();
    ctx.translate(sc.x, sc.y);
    ctx.scale(kk, kk);
    ctx.translate(-lc.x, -lc.y);
    cache = cacheTable(ctx, { x: CACHE.x, y: CACHE.y, w: CACHE.w, entries: [], alpha: cacheAlpha, glow: cacheGlow });
    // "prepared templates" / "keyed by the strings array": the column heads
    const hdY = CACHE.y + 52 + 20;
    const kH = prog(t, T.keyed - 0.2, 0.4) * (1 - prog(t, T.miss - 0.2, 0.5));
    const vH = pulse(t, T.prepared - 0.2, 1.3);
    // relight the column heads (drawn over the kit's own, same place and font)
    const hf = sans(16, 600);
    withAlpha(ctx, cacheAlpha * kH, () => withGlow(ctx, rgba(OBJ.cache, 0.6), 8, () =>
      text(ctx, "strings array", CACHE.x + 24, hdY, { font: hf, color: OBJ.cache, baseline: "middle" })));
    withAlpha(ctx, cacheAlpha * vH, () => withGlow(ctx, rgba(OBJ.template, 0.6), 8, () =>
      text(ctx, "Template", CACHE.x + CACHE.w * 0.62, hdY, { font: hf, color: OBJ.template, baseline: "middle" })));
    // the empty row flashes red on the miss
    const rowFlash = pulse(t, T.miss + 0.2, 1.0);
    if (rowFlash > 0) {
      const r = cache.rows[0];
      withAlpha(ctx, cacheAlpha * rowFlash, () => strokeRR(ctx, r.x, r.y, r.w, r.h, 10, C.bad, 2.5));
    }
    ctx.restore();
    const box = { x: toScr(cache).x, y: toScr(cache).y, w: cache.w * kk, h: cache.h * kk };
    cache = { ...box, key: toScr(cache.rows[0].keyPort), row: { ...toScr(cache.rows[0]), w: cache.rows[0].w * kk, h: cache.rows[0].h * kk } };
    const ku = prog(t, T.keyed - 0.2, 0.4) * (1 - prog(t, T.miss - 0.2, 0.5));
    text(ctx, "keyed by the strings array", cache.x + cache.w / 2, cache.y + cache.h + 48, { font: sans(27, 600), color: OBJ.cache, align: "center", alpha: ku * keep });
  }

  // the query: templateCache.get(result.strings); the key travels
  const kU = prog(t, T.look - 0.35, 0.9);
  if (cache && kU > 0) {
    const a = { x: res.ports.strings.x + 12, y: res.ports.strings.y };
    const b = { x: cache.key.x - 24, y: cache.key.y };
    const bend = -70;
    arrow(ctx, a, b, { color: C.accent, width: 3, bend, progress: kU, alpha: ctxAlpha, glow: 0.5 });
    // the key: a strings-array glyph riding the arrow; on the miss it
    // shakes (no entry for it) and goes
    const p = along(a, b, kU, bend);
    const sh = prog(t, T.miss - 0.1, 0.7, ease.linear);
    const shaking = sh > 0 && sh < 1;
    const kx = p.x + 12 + (shaking ? Math.sin(sh * Math.PI * 8) * 8 * (1 - sh) : 0);
    const keyA = ctxAlpha * (1 - prog(t, T.miss + 0.7, 0.4));
    const kp = pulse(t, T.strings - 0.15, 1.1);
    const keyColor = shaking ? C.bad : kp > 0.05 ? OBJ.cache : C.text;
    withAlpha(ctx, keyA, () =>
      withGlow(ctx, rgba(keyColor, 0.8 * Math.max(kp, shaking ? 0.6 : 0)), 16, () => miniStrings(ctx, kx, p.y - 16, keyColor, 1.35)));
    // the call and its answer
    const lab = prog(t, T.look - 0.25, 0.4);
    const lx = cache.x + 4, ly = cache.y + cache.h + 128;
    withAlpha(ctx, lab * ctxAlpha, () => {
      const f = mono(26, 500);
      let x = lx;
      x += text(ctx, "templateCache", x, ly, { font: f, color: OBJ.cache, baseline: "middle" });
      x += text(ctx, ".get(", x, ly, { font: f, color: C.text2, baseline: "middle" });
      x += text(ctx, "result.strings", x, ly, { font: f, color: C.text, baseline: "middle" });
      text(ctx, ")", x, ly, { font: f, color: C.text2, baseline: "middle" });
      const ans = prog(t, T.miss + 0.05, 0.35);
      if (ans > 0) {
        const ay = ly + 56;
        let x2 = lx;
        withAlpha(ctx, ans, () => {
          x2 += text(ctx, "→ ", x2, ay, { font: f, color: C.text3, baseline: "middle" });
          x2 += text(ctx, "undefined", x2, ay, { font: mono(26, 600), color: C.text, baseline: "middle" });
        });
        cross(ctx, x2 + 34, ay - 1, 30, C.bad, prog(t, T.miss + 0.35, 0.45));
        const mu = prog(t, T.miss + 0.55, 0.35, ease.outBack);
        if (mu > 0) withScale(ctx, lerp(0.7, 1, mu), x2 + 110, ay, () =>
          chip(ctx, { x: x2 + 72, y: ay - 20, h: 40, text: "miss", font: sans(24, 700), color: C.bad, bg: rgba(C.bad, 0.12), border: rgba(C.bad, 0.7), alpha: Math.min(1, mu) }));
      }
    });
  }

  // ---------------------------------------------------------------- the strings array: first look, then centre stage
  const sIn = prog(t, T.lazy + 0.1, 0.6, ease.outCubic);
  if (sIn > 0) {
    const mv = prog(t, T.prepare - 0.05, 0.9, ease.inOutCubic);
    const size = lerp(STR_LOW.size, STR_MID.size, mv);
    const g0 = stringsArray(ctx, { x: 0, y: 0, size, alpha: 0 });
    const x = 960 - g0.w / 2;
    const y = lerp(STR_LOW.y + 28 * (1 - sIn), STR_MID.y, mv);
    // result.strings → the array
    const from = res.ports.strings;
    const conU = prog(t, T.lazy + 0.05, 0.55);
    arrow(ctx, { x: from.x + 12, y: from.y + 4 }, { x: from.x + 96, y: y - 12 }, {
      color: C.text2, width: 2.5, bend: -44, progress: conU, alpha: 0.8 * keep, head: 11,
    });
    // a reading sweep, cell by cell, on "looked at this template's HTML"
    const sweep0 = T.looked - 0.25;
    const cellAlpha = [0, 1, 2, 3].map((i) => lerp(0.45, 1, prog(t, sweep0 + i * 0.3, 0.45)));
    const hl = [0, 1, 2, 3].map((i) => pulse(t, sweep0 + i * 0.3, 0.8));
    stringsArray(ctx, { x, y, size, alpha: sIn, cellAlpha, hl });
    const cap = prog(t, T.looked - 0.35, 0.45) * keep;
    text(ctx, "first look at this template's HTML", 960, y + g0.h + 66, { font: sans(28, 600), color: C.text, align: "center", alpha: cap });
  }
}
