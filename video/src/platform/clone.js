// clone: importNode copies the template's content into the page's document
// (P0), one TreeWalker with the filter 129 finds the places in the copy (P1),
// and comments hold those places: a child part's content goes in right after
// its comment, with insertBefore (P2).
//
// Framings, changed at the paragraph marks:
//   P0 (import…owned)    the inert document (template.content) and the page's
//                        document; the API chip; the copy flies across
//   P1 (walker…skips)    the copy, the walker's lines from lit-html.ts, the
//                        filter's bits, the walker hopping over text nodes
//   P2 (anchors…insert)  the greeting's <p>: its childNodes, the comment, and
//                        its ChildPart inserting "Ada" before its endNode
//
// Data: truth/truth.json (the counter's cloned template content, render 0;
// the greeting's <p> template, render 1; the other templates' contents),
// truth/platform.json (NodeFilter constants, ownerDocument checks),
// cache/lit-html.ts (the walker's lines).

import { platformTruth, truth } from "../timing.js";
import { C, DOMC, SYN, blend, rgba } from "../kit/theme.js";
import { card } from "../kit/objects.js";
import { check, chip, cross, fillRR, measure, mono, panel, ring, sans, strokeRR, text, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { Tree } from "../kit/tree.js";
import { Code } from "../kit/code.js";
import { GREETING_SRC, OBJ } from "../kit/lit.js";
import { clamp, ease, lerp, prog, pulse, window } from "../util.js";
import {
  PLAT, ROLE, at, curve, drawPoly, evalBadge, eyeOff, hopArc, nodeCell, pieces, platCall, platPanel, platformTag, track, vLink, walkerBadge,
} from "./clone-kit.js";

export const transition = "fade";

const GOLD = "#ffd166";          // the mystery-comment ring (episode 1's open)

// ------------------------------------------------------------------ layout

const TS = 38, LH = TS * 1.5;    // the fragment trees
const GUT = 112;                 // the walker's gutter (box-local)
const BHEAD = 58;                // the box's header
const BOX_W = 742;
const PANEL = { w: 822, h: 830 };
const P0L = { x: 44, y: 186 }, P0R = { x: 1054, y: 186 }, P1 = { x: 44, y: 118 };
const BOX_DX = 40, BOX_DY = 84;  // the box inside its panel
const RIGHT = { x: 906, w: 970 };// P1's right column

// ------------------------------------------------------------------ data

let D = null;
function data() {
  if (D) return D;
  const T = truth();
  const P = platformTruth();
  const ev = T.counter.render0.events;
  // the Template's content, as cloned (bound attributes already removed)
  const clone = ev.find((e) => e.kind === "template instantiated").fragment;
  const tree = new Tree(clone, { size: TS, lineHeight: 1.5, whitespace: "show", inline: false });
  // the greeting's <p> template (render 1): prep, the clone, the clone after update
  const g = T.greeting.render1.events;
  const pPrep = g.find((e) => e.kind === "template prep");
  const pClone = g.find((e) => e.kind === "template instantiated").fragment.children[0];
  const pDone = g.find((e) => e.kind === "template instantiated and updated").fragment.children[0];
  const nodeText = (n) => (n.type === "comment" ? `<!--${n.data}-->` : `"${n.data}"`);
  const ci = pClone.children.findIndex((c) => c.type === "comment");
  // comments in the other templates' contents (as parsed), one line each
  const gallery = [];
  for (const ex of ["counter", "list", "greeting"]) {
    for (const r of Object.values(T[ex])) {
      if (!r?.events) continue;
      for (const e of r.events) {
        if (e.kind !== "template prep") continue;
        for (const line of e.templateHtml.split("\n").map((l) => l.trim())) {
          if (line.includes("<!--?") && line !== pPrep.templateHtml && !gallery.includes(line)) gallery.push(line);
        }
      }
    }
  }
  // the <p> template's line in the greeting source
  const srcLine = GREETING_SRC.split("\n").find((l) => l.includes("<p>"));
  D = {
    tree,
    walk: tree.walk,                                   // span, comment, button
    textRows: tree.rows.filter((r) => r.kind === "text"),
    walker: P.walker,
    inert: P.parser.inert,
    // lit-html's HTML for the <p> template: a child binding in text is <?marker>
    pHtml: pPrep.strings.join(`<${T.markerMatch}>`),
    nodeMarker: `<${T.markerMatch}>`,
    pNodes: pClone.children.map(nodeText),             // "Welcome back, ", <!--?lit$…$-->, "!"
    pNew: nodeText(pDone.children[ci + 1]),            // "Ada": what the part inserted after its comment
    pEnd: nodeText(pClone.children[ci + 1]),           // "!": the comment's nextSibling in the clone (endNode)
    gallery: gallery.slice(0, 4),
    src: new Code(srcLine.slice(srcLine.indexOf("html`")), { size: 34 }),
    walkerCode: new Code(WALKER_SRC, { size: 30 }),
    currentCode: new Code("walker.currentNode = fragment;", { size: 30 }),
    nextCode: new Code("walker.nextNode()", { size: 30 }),
  };
  return D;
}

// cache/lit-html.ts, the module-level walker (lines 731–734), exactly.
const WALKER_SRC = `const walker = d.createTreeWalker(
  d,
  129 /* NodeFilter.SHOW_{ELEMENT|COMMENT} */
);`;

// ------------------------------------------------------------------ timing

let TT = null;
function times(S) {
  if (TT && TT.start === S.start) return TT;
  TT = {
    start: S.start, end: S.end,
    // P0
    imp: S.m("import"), callsW: S.word(0, "calls"), contents: S.word(0, "contents"), deep: S.word(0, "deep"),
    copy: S.m("copy"), noparse: S.m("noparse"), owned: S.m("owned"), pages: S.word(0, "page's"),
    // P1
    walker: S.m("walker"), treeW: S.word(1, "tree"), onewalker: S.m("onewalker"), loads: S.word(1, "loads"),
    filter: S.m("filter"), shows: S.word(1, "shows"), elementsW: S.word(1, "elements", 0), commentsW: S.word(1, "comments", 0),
    bits: S.m("bits"), oneBit: S.word(1, "one", 1), worth: S.word(1, "worth"),
    hundred: S.word(1, "hundred"), forComments: S.word(1, "comments", 1),
    skips: S.m("skips"), textW: S.word(1, "text"), native: S.word(1, "native"),
    // P2
    anchors: S.m("anchors"), anchorsW: S.word(2, "anchors"), anywhere: S.m("anywhere"), kept: S.m("kept"),
    invisible: S.m("invisible"), insert: S.m("insert"), content: S.word(2, "content", 1), after: S.word(2, "after"),
    newW: S.word(2, "new"), nodes: S.word(2, "nodes"), insertW: S.word(2, "insert"), before: S.word(2, "before"),
  };
  return TT;
}

// DOM colours, and the desaturated "inert" version (as create-comp.js).
const inertColor = (role, u) => (u > 0 ? blend(ROLE[role], "#7d86a3", 0.6 * u) : ROLE[role]);

// ------------------------------------------------------------------ the box

// A DocumentFragment box: header label, "#document-fragment", the tree.
function fragBox(ctx, x, y, { label, sub = "DocumentFragment", inert = 0, alpha = 1, glow = 0, rowStyle = null, labelAlpha = 1 }) {
  const d = data();
  const h = boxH();
  withAlpha(ctx, alpha, () => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    fillRR(ctx, x, y, BOX_W, h, 14, inert > 0 ? blend(C.panel2, "#1a2033", inert) : C.panel2);
    ctx.restore();
    if (glow > 0) withGlow(ctx, rgba(OBJ.dom, 0.8 * glow), 26 * glow, () => strokeRR(ctx, x, y, BOX_W, h, 14, rgba(OBJ.dom, glow), 2.5));
    ctx.save();
    if (inert > 0.5) ctx.setLineDash([9, 7]);
    strokeRR(ctx, x + 0.5, y + 0.5, BOX_W - 1, h - 1, 14, rgba(OBJ.dom, 0.3 + 0.25 * (1 - inert)), 1.5);
    ctx.restore();
    ctx.fillStyle = rgba(OBJ.dom, 0.18);
    ctx.fillRect(x + 14, y + BHEAD - 1, BOX_W - 28, 1);
    withAlpha(ctx, labelAlpha, () => {
      text(ctx, label, x + 24, y + BHEAD / 2 + 2, { font: mono(28, 600), color: inert > 0.5 ? C.text2 : C.text, baseline: "middle" });
      text(ctx, sub, x + BOX_W - 22, y + BHEAD / 2 + 2, { font: sans(22, 500), color: C.text3, baseline: "middle", align: "right" });
    });
    const adv = d.tree.adv(ctx);
    text(ctx, "#document-fragment", x + GUT, y + fragRowMid() + 1, { font: mono(TS, 450), color: inertColor("punct", inert), baseline: "middle" });
    d.tree.draw(ctx, x + GUT + 2 * adv, y + treeTop(), {
      rowStyle,
      style: (seg) => ({ color: inertColor(seg.role, inert) }),
    });
  });
}
const treeTop = () => BHEAD + 10 + LH;                         // box-local top of the tree's first row
const boxH = () => treeTop() + LH * data().tree.rows.length + 16;
const rowMidIn = (row) => treeTop() + LH * row.index + LH / 2; // box-local
const fragRowMid = () => BHEAD + 10 + LH / 2;

// ------------------------------------------------------------------ draw

export function draw(F, S) {
  const { ctx, t } = F;
  const d = data();
  const T = times(S);
  drawP0P1(ctx, t, d, T);
  drawP2(ctx, t, d, T);
}

// ---------------------------------------------------------- P0 and P1

function drawP0P1(ctx, t, d, T) {
  const enter = prog(t, T.start - 0.35, 0.6, ease.outCubic);
  const out = 1 - prog(t, T.anchors - 0.3, 0.45);              // P1 -> P2
  if (out <= 0.001) return;

  withAlpha(ctx, out, () => {
    // ------------------------------------------------ the two documents
    const L = track(t, [[-Infinity, { ...P0L, a: 1 }], [T.walker - 0.25, { x: -900, y: P0L.y, a: 0, dur: 0.8 }]]);
    const R = track(t, [[-Infinity, { ...P0R }], [T.walker - 0.25, { ...P1, dur: 0.9 }]]);
    const leftA = enter * L.a;
    const pageGlow = window(t, T.pages - 0.2, T.walker - 0.3, 0.35, 0.5);
    if (leftA > 0.001) {
      platPanel(ctx, { x: L.x, y: L.y, w: PANEL.w, h: PANEL.h, title: "inert document", sub: "no browsing context", alpha: leftA, fill: "#10172a", dashed: true });
    }
    platPanel(ctx, { x: R.x, y: R.y, w: PANEL.w, h: PANEL.h, title: "document", sub: "the page", alpha: enter, glow: pageGlow });

    // ------------------------------------------------ template.content (inert)
    const srcGlow = window(t, T.contents - 0.25, T.copy + 0.2, 0.3, 0.5);
    if (leftA > 0.001) fragBox(ctx, L.x + BOX_DX, L.y + BOX_DY, { label: "template.content", inert: 1, alpha: leftA, glow: srcGlow });

    // ------------------------------------------------ the copy
    const fly = prog(t, T.copy - 0.05, 1.25, ease.inOutCubic);
    const destX = R.x + BOX_DX, destY = R.y + BOX_DY;
    if (fly >= 1) {
      const dim = prog(t, T.shows - 0.1, 0.6);
      fragBox(ctx, destX, destY, {
        label: "fragment", alpha: enter, glow: 0.7 * pulse(t, T.copy + 1.1, 1.0),
        rowStyle: (row) => (row.kind === "text" ? { alpha: lerp(1, 0.36, dim) } : {}),
      });
      drawWalker(ctx, t, d, T, destX, destY);
    } else if (fly > 0) {
      const sx = L.x + BOX_DX, sy = L.y + BOX_DY;
      const x = lerp(sx, destX, fly), y = lerp(sy, destY, fly) - 80 * Math.sin(Math.PI * fly);
      const k = 1 + 0.04 * Math.sin(Math.PI * fly);
      withScale(ctx, k, x + BOX_W / 2, y + boxH() / 2, () =>
        fragBox(ctx, x, y, { label: "fragment", inert: 1 - clamp((fly - 0.3) / 0.5), labelAlpha: clamp((fly - 0.2) / 0.4) }));
    }

    // ------------------------------------------------ the API chip
    const chipA = prog(t, T.imp - 0.25, 0.4) * (1 - prog(t, T.walker - 0.3, 0.45));
    if (chipA > 0.001) {
      const g = platCall(ctx, {
        x: 960, y: 40, size: 40, align: "center", alpha: chipA, reveal: prog(t, T.imp - 0.2, 0.9, ease.linear),
        code: "document.importNode(template.content, true)",
        marks: { fn: "importNode", content: "template.content", deep: "true" },
        ring: {
          fn: window(t, T.callsW - 0.1, T.contents - 0.3, 0.3, 0.3),
          content: window(t, T.contents - 0.3, T.deep - 0.25, 0.3, 0.3),
          deep: window(t, T.deep - 0.2, T.copy + 0.4, 0.3, 0.4),
        },
        glow: 0.6 * pulse(t, T.copy - 0.1, 1.2),
      });
      const du = prog(t, T.deep - 0.15, 0.4) * chipA;
      if (du > 0) text(ctx, "deep", g.keys.deep.cx, g.y + g.h + 28, { font: sans(27, 650), color: PLAT, align: "center", baseline: "middle", alpha: du });
    }

    // ------------------------------------------------ nothing parsed again
    const npA = prog(t, T.noparse - 0.2, 0.45, ease.outBack) * (1 - prog(t, T.walker - 0.35, 0.4));
    if (npA > 0.001) {
      const cx = (P0L.x + PANEL.w + P0R.x) / 2, cy = P0L.y + PANEL.h * 0.56;
      withScale(ctx, lerp(0.8, 1, clamp(npA)), cx, cy, () => withAlpha(ctx, clamp(npA), () => {
        // the parser, a platform thing: angle brackets on the platform plate
        fillRR(ctx, cx - 58, cy - 58, 116, 116, 20, C.panel2);
        fillRR(ctx, cx - 58, cy - 58, 116, 116, 20, rgba(PLAT, 0.06));
        strokeRR(ctx, cx - 57.25, cy - 57.25, 114.5, 114.5, 20, rgba(PLAT, 0.6), 1.5);
        text(ctx, "</>", cx, cy - 4, { font: mono(40, 650), color: PLAT, align: "center", baseline: "middle" });
        text(ctx, "HTML parser", cx, cy + 90, { font: sans(24, 650), color: C.text2, align: "center", baseline: "middle" });
        const ku = prog(t, T.noparse + 0.05, 0.4);
        if (ku > 0) {
          const bx = cx + 52, by = cy - 52;
          withAlpha(ctx, clamp(ku * 3), () => {
            fillRR(ctx, bx - 20, by - 20, 40, 40, 20, C.bg);
            strokeRR(ctx, bx - 20, by - 20, 40, 40, 20, rgba(C.bad, 0.9), 2.5);
          });
          cross(ctx, bx, by, 26, C.bad, ku);
        }
        text(ctx, "not run", cx, cy + 124, { font: sans(24, 600), color: C.bad, align: "center", baseline: "middle", alpha: prog(t, T.noparse + 0.3, 0.4) });
      }));
    }

    // ------------------------------------------------ ownerDocument
    const ownL = prog(t, T.owned - 0.15, 0.45) * (1 - prog(t, T.walker - 0.35, 0.4));
    const ownR = prog(t, T.owned + 0.25, 0.45) * (1 - prog(t, T.walker - 0.35, 0.4));
    if (ownL > 0.001) {
      const y = P0L.y + BOX_DY + boxH() + 28;
      const line = (x, value, u, tickT) => {
        const b = evalBadge(ctx, { x, y, expr: "ownerDocument === document", result: String(value), resultColor: value ? C.ok : C.text2, size: 30, h: 64, alpha: u, resultU: prog(t, tickT - 0.2, 0.35) });
        if (value) check(ctx, b.x + b.w + 34, y + 32, 32, C.ok, prog(t, tickT, 0.4) * u);
      };
      line(P0L.x + BOX_DX, d.inert.contentOwnerIsPage, ownL * leftA, T.owned);
      line(P0R.x + BOX_DX, d.inert.cloneOwnerIsPage, ownR, T.owned + 0.55);
    }

    // ------------------------------------------------ P1: the walker's code, the bits
    drawWalkerCode(ctx, t, d, T);
    drawBits(ctx, t, d, T);
  });
}

// When the walker lands on each stop: [span, comment, button], then the
// nextNode() that finds nothing (null).
const hopT = (T) => [T.skips + 0.05, T.skips + 0.62, T.skips + 1.2, T.textW + 0.3];

function drawWalker(ctx, t, d, T, bx, by) {
  const adv = d.tree.adv(ctx);
  const tx = bx + GUT + 2 * adv, ty = by + treeTop();
  // washes on elements and comments ({filter}: "shows only elements and comments")
  const elU = pulse(t, T.elementsW - 0.15, 1.1), cmU = pulse(t, T.commentsW - 0.15, 1.1);
  for (const row of d.walk) {
    const u = row.kind === "comment" ? cmU : elU;
    if (u <= 0) continue;
    const r = d.tree.rowRect(ctx, tx, ty, row);
    withAlpha(ctx, u, () => fillRR(ctx, r.x - 8, r.y - 2, r.w + 16, r.h + 4, 8, rgba(PLAT, 0.24)));
  }

  const outA = 1 - prog(t, T.anchors - 0.4, 0.3);
  const a = prog(t, T.walker + 0.55, 0.4) * outA;
  if (a <= 0.001) return;
  const H = hopT(T);
  const X = bx + 58;
  const stops = [fragRowMid(), ...d.walk.map(rowMidIn)];
  const nullY = rowMidIn(d.tree.rows.at(-1));   // level with </button>: past the last node
  // the badge: from the fragment row through the three stops; it stays on the
  // button when the last nextNode() returns null
  let y = stops[0], label = null;
  for (let i = 0; i < 3; i++) {
    const u = prog(t, H[i] - 0.4, 0.5);
    if (u <= 0) break;
    y = lerp(stops[i], stops[i + 1], u);
    if (u >= 0.6) label = String(i);
  }
  // hop arcs: over the rows each nextNode() skips
  const arcs = [[stops[0], stops[1]], [stops[1], stops[2]], [stops[2], stops[3]], [stops[3], nullY]];
  arcs.forEach(([y0, y1], i) => {
    const u = prog(t, H[i] - 0.4, 0.5);
    if (u <= 0) return;
    hopArc(ctx, X - 22, by + y0 + 16, by + y1 - (i === 3 ? 12 : 16), { u, alpha: a * 0.85, bulge: 26, width: 3 });
  });
  const nu = prog(t, H[3] + 0.05, 0.35) * outA;
  if (nu > 0) text(ctx, "null", X + 6, by + nullY + 1, { font: mono(24, 650), color: PLAT, align: "center", baseline: "middle", alpha: nu });
  // the stops it has landed on
  d.walk.forEach((row, i) => {
    const u = prog(t, H[i] - 0.1, 0.3);
    if (u <= 0) return;
    const cy = by + rowMidIn(row);
    withAlpha(ctx, a * u, () => {
      ctx.beginPath();
      ctx.arc(X, cy, 21, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(PLAT, 0.7);
      ctx.lineWidth = 2;
      ctx.stroke();
      text(ctx, String(i), X, cy + 1, { font: mono(24, 700), color: PLAT, align: "center", baseline: "middle" });
    });
  });
  walkerBadge(ctx, X, by + y, { alpha: a, label, r: 24 });

  // lit-html's line under the box: currentNode, then nextNode()
  const cy = by + boxH() + 62;
  const cu = prog(t, T.walker + 0.8, 0.4) * (1 - prog(t, T.skips - 0.5, 0.35)) * outA;
  if (cu > 0.001) d.currentCode.draw(ctx, bx + 12, cy - d.currentCode.lh / 2, { alpha: cu });
  const ncU = prog(t, T.skips - 0.3, 0.4) * outA;
  if (ncU > 0.001) {
    const nc = d.nextCode;
    nc.draw(ctx, bx + 12, cy - nc.lh / 2, { alpha: ncU });
    const g = window(t, T.native - 0.2, T.anchors, 0.3, 0.5);
    platformTag(ctx, { x: bx + 12 + nc.width(ctx) + 28, y: cy - 23, h: 46, text: "native code", font: sans(24, 650), alpha: ncU, glow: g });
    // "skipped" on the text rows, as the walker passes them
    d.textRows.forEach((row, i) => {
      const th = H[[0, 2, 3][i]];
      const u = prog(t, th - 0.25, 0.35) * outA;
      if (u <= 0) return;
      const r = d.tree.rowRect(ctx, tx, ty, row);
      text(ctx, "skipped", r.x + r.w + 24, r.y + r.h / 2 + 1, { font: sans(24, 500, "italic"), color: C.text3, baseline: "middle", alpha: u });
    });
  }
}

// The walker's code, from lit-html.ts (P1, right).
function drawWalkerCode(ctx, t, d, T) {
  const inU = prog(t, T.treeW - 0.25, 0.5);
  const u = inU * (1 - prog(t, T.anchors - 0.3, 0.4));
  if (u <= 0.001) return;
  const c = d.walkerCode;
  const x = RIGHT.x + 30 * (1 - ease.outCubic(inU)), y = P1.y, w = RIGHT.w;
  const h = 56 + 18 + c.height + 20;
  withAlpha(ctx, u, () => {
    panel(ctx, { x, y, w, h, title: "lit-html.ts", titleFont: sans(26, 650), titleColor: C.text, header: 56, accent: SYN.fn });
    const lu = prog(t, T.loads - 0.6, 0.4);
    if (lu > 0) chip(ctx, { x: x + w - 18, y: y + 8, h: 40, align: "right", text: "runs once, at load", font: sans(22, 650), color: C.text, bg: rgba(C.text2, 0.1), border: rgba(C.text2, 0.5), alpha: lu });
    const cx = x + 40, cy = y + 56 + 18;
    const f129 = c.find("129");
    const fCom = c.find("/* NodeFilter.SHOW_{ELEMENT|COMMENT} */");
    const fApi = c.find("createTreeWalker");
    // the DOM call, in the platform colour
    const apiU = window(t, T.treeW, T.anchors, 0.4, 0.4);
    if (apiU > 0) {
      const r = c.rect(ctx, cx, cy, fApi.line, fApi.col, fApi.len);
      withAlpha(ctx, apiU, () => fillRR(ctx, r.x - 5, r.y - 2, r.w + 10, r.h + 4, 8, rgba(PLAT, 0.12)));
    }
    const hl = window(t, T.filter - 0.2, T.bits + 0.6, 0.35, 0.5);
    const hl129 = clamp(Math.max(hl, window(t, T.bits - 0.2, T.skips - 0.2, 0.3, 0.4), 1.2 * pulse(t, T.forComments + 0.5, 1.0)));
    if (hl129 > 0) {
      const r = c.rect(ctx, cx, cy, f129.line, f129.col, f129.len);
      withAlpha(ctx, hl129, () => fillRR(ctx, r.x - 6, r.y - 2, r.w + 12, r.h + 4, 8, rgba(PLAT, 0.28)));
    }
    if (hl > 0) {
      const r = c.rect(ctx, cx, cy, fCom.line, fCom.col, fCom.len);
      withAlpha(ctx, hl, () => fillRR(ctx, r.x - 4, r.y - 2, r.w + 8, r.h + 4, 8, rgba(PLAT, 0.14)));
    }
    c.draw(ctx, cx, cy, {
      style: (tok) => {
        if (tok.line === fCom.line && tok.col >= fCom.col) return { color: blend(SYN.comment, C.text, hl * 0.6) };
        if (tok.line === f129.line && tok.col === f129.col) return { color: blend(SYN.number, C.white, hl129 * 0.4), weight: 650 };
        if (tok.line === fApi.line && tok.col === fApi.col) return { color: blend(SYN.fn, PLAT, apiU) };
        return {};
      },
    });
  });
}

// The filter's bits (P1, right): 129 = 1000 0001.
function drawBits(ctx, t, d, T) {
  const u = prog(t, T.bits - 0.25, 0.5) * (1 - prog(t, T.anchors - 0.3, 0.4));
  if (u <= 0.001) return;
  const W = d.walker;
  const values = [128, 64, 32, 16, 8, 4, 2, 1];
  const names = new Map([[W.SHOW_COMMENT, "SHOW_COMMENT"], [W.SHOW_TEXT, "SHOW_TEXT"], [W.SHOW_ELEMENT, "SHOW_ELEMENT"]]);
  const litAt = new Map([[W.SHOW_ELEMENT, T.oneBit - 0.1], [W.SHOW_COMMENT, T.hundred - 0.2]]);
  const cell = 92, gap = 14, ch = 92;
  const rowW = values.length * cell + (values.length - 1) * gap;
  const px = RIGHT.x, py = P1.y + 330, pw = RIGHT.w, ph = 500;
  const x0 = px + (pw - rowW) / 2;
  const y0 = py + 56 + 84;          // top of the digit cells
  const dy = 24 * (1 - ease.outCubic(prog(t, T.bits - 0.25, 0.5)));
  withAlpha(ctx, u, () => {
    ctx.save();
    ctx.translate(0, dy);
    platPanel(ctx, { x: px, y: py, w: pw, h: ph, title: "whatToShow", sub: "NodeFilter bits", fill: C.panel });
    values.forEach((v, i) => {
      const cx = x0 + i * (cell + gap);
      const mid = cx + cell / 2;
      const on = litAt.has(v) ? prog(t, litAt.get(v), 0.4) : 0;
      const flash = v === W.SHOW_TEXT ? pulse(t, T.textW - 0.2, 1.0) : 0;
      text(ctx, String(v), mid, y0 - 28, { font: mono(26, 550), color: on > 0 ? blend(C.text3, C.text, on) : C.text3, align: "center", baseline: "middle" });
      fillRR(ctx, cx, y0, cell, ch, 12, on > 0 ? rgba(PLAT, 0.1 + 0.18 * on) : C.panel2);
      strokeRR(ctx, cx + 0.5, y0 + 0.5, cell - 1, ch - 1, 12, on > 0 ? rgba(PLAT, 0.4 + 0.6 * on) : C.border, 1.5);
      if (on > 0) withAlpha(ctx, on * (0.6 + 0.4 * pulse(t, litAt.get(v), 1.2)), () => withGlow(ctx, rgba(PLAT, 0.9), 18, () => strokeRR(ctx, cx, y0, cell, ch, 12, PLAT, 2.5)));
      if (flash > 0) withAlpha(ctx, flash, () => strokeRR(ctx, cx - 4, y0 - 4, cell + 8, ch + 8, 14, C.text2, 2.5));
      const digit = (W.mask & v) !== 0 && on >= 0.5 ? "1" : "0";
      withScale(ctx, 1 + 0.25 * pulse(t, (litAt.get(v) ?? -99) + 0.1, 0.4), mid, y0 + ch / 2, () =>
        text(ctx, digit, mid, y0 + ch / 2 + 2, { font: mono(50, 650), color: digit === "1" ? C.white : C.text4, align: "center", baseline: "middle" }));
      if (names.has(v)) {
        const nu = v === W.SHOW_TEXT ? prog(t, T.skips - 0.2, 0.4) : on;
        if (nu > 0) text(ctx, names.get(v), mid, y0 + ch + 38, { font: mono(22, 600), color: v === W.SHOW_TEXT ? C.text2 : PLAT, align: "center", baseline: "middle", alpha: nu });
      }
    });
    const su = prog(t, T.forComments + 0.2, 0.45);
    if (su > 0) {
      const f = mono(40, 650);
      pieces(ctx, [
        { s: String(W.SHOW_COMMENT), font: f, color: C.text },
        { s: " + ", font: f, color: C.text3 },
        { s: String(W.SHOW_ELEMENT), font: f, color: C.text },
        { s: " = ", font: f, color: C.text3 },
        { s: String(W.mask), font: mono(40, 750), color: PLAT },
      ], px + pw / 2, y0 + ch + 124, { alpha: su, align: "center" });
    }
    ctx.restore();
  });
}

// ---------------------------------------------------------- P2: anchors

const STRIP = { x: 318, y: 492, size: 40, gap: 20 };
const TOPX = 262;                // left edge of the text column in P2

function drawP2(ctx, t, d, T) {
  const enter = prog(t, T.anchors - 0.2, 0.55, ease.outCubic);
  if (enter <= 0.001) return;
  const f = mono(STRIP.size, 500);
  const cw = (s) => measure(ctx, s, f) + 30;
  const [n0, nC, n2] = d.pNodes;                       // "Welcome back, ", <!--…-->, "!"
  const ada = d.pNew;
  const slotU = prog(t, T.content - 0.2, 0.6);          // the gap opens before endNode
  const flyU = prog(t, T.nodes - 0.05, 0.85, ease.inOutCubic);
  const landed = flyU >= 1;
  const cellH = STRIP.size * 1.9;
  const wAda = cw(ada);
  const xs = [];
  let x = STRIP.x;
  xs.push(x); x += cw(n0) + STRIP.gap;
  xs.push(x); x += cw(nC) + STRIP.gap;
  const slotX = x;
  x += (wAda + STRIP.gap) * slotU;
  xs.push(x); x += cw(n2);
  const stripEnd = x;
  const cy = STRIP.y;

  withAlpha(ctx, enter, () => {
    // the template literal, for context
    text(ctx, "greeting.js", TOPX, 84, { font: sans(24, 600), color: C.text3, baseline: "middle" });
    d.src.draw(ctx, TOPX, 108, { alpha: 0.92 });

    // p.childNodes
    text(ctx, "p.childNodes", TOPX, cy - cellH / 2 - 40, { font: mono(28, 550), color: C.text2, baseline: "middle" });
    text(ctx, "[", STRIP.x - 44, cy + 1, { font: mono(56, 400), color: C.text3, baseline: "middle" });
    text(ctx, "]", stripEnd + 14, cy + 1, { font: mono(56, 400), color: C.text3, baseline: "middle" });

    const ringU = prog(t, T.anchors + 0.05, 0.4) * (1 - 0.55 * prog(t, T.insert - 0.2, 0.5));
    const breathe = 0.85 + 0.15 * Math.sin((t - T.anchors) * 3.2);
    nodeCell(ctx, { x: xs[0], y: cy, str: n0, color: DOMC.text, size: STRIP.size });
    nodeCell(ctx, { x: xs[1], y: cy, str: nC, color: DOMC.comment, size: STRIP.size, bg: rgba(DOMC.comment, 0.08), border: rgba(DOMC.comment, 0.45) });
    ring(ctx, { x: xs[1], y: cy - cellH / 2, w: cw(nC), h: cellH, r: 10, color: GOLD, u: ringU * breathe, pad: 8 });
    const endHl = window(t, T.insert + 0.9, T.end + 1, 0.4, 0.4) * 0.5 + pulse(t, T.before - 0.35, 0.9);
    nodeCell(ctx, { x: xs[2], y: cy, str: n2, color: DOMC.text, size: STRIP.size, hl: clamp(endHl), hlColor: OBJ.root });
    const anU = prog(t, T.anchorsW - 0.2, 0.4) * (1 - prog(t, T.insert - 0.3, 0.4));
    text(ctx, "anchor", xs[1] + cw(nC) / 2, cy + cellH / 2 + 42, { font: sans(28, 650), color: GOLD, align: "center", baseline: "middle", alpha: anU });

    // the slot for the part's content, then the new node in it
    if (slotU > 0 && !landed) {
      withAlpha(ctx, slotU * (1 - flyU * 0.6), () => {
        ctx.save();
        ctx.setLineDash([9, 7]);
        strokeRR(ctx, slotX + 0.5, cy - cellH / 2 + 0.5, Math.max(1, wAda * slotU - 1), cellH - 1, 10, rgba(OBJ.root, 0.7), 2);
        ctx.restore();
      });
    }
    if (landed) nodeCell(ctx, { x: slotX, y: cy, str: ada, color: DOMC.text, size: STRIP.size, hl: pulse(t, T.nodes + 0.8, 1.0), hlColor: OBJ.root });
    // "content": after the comment, up to endNode
    const cu = prog(t, T.after - 0.3, 0.4);
    if (cu > 0) {
      const bx0 = slotX, bx1 = slotX + wAda * slotU;
      const by = cy + cellH / 2 + 18;
      withAlpha(ctx, cu, () => {
        ctx.strokeStyle = OBJ.root;
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(bx0 + 2, by - 7);
        ctx.lineTo(bx0 + 2, by);
        ctx.lineTo(bx1 - 2, by);
        ctx.lineTo(bx1 - 2, by - 7);
        ctx.stroke();
        text(ctx, "content", (bx0 + bx1) / 2, by + 28, { font: sans(26, 650), color: OBJ.root, align: "center", baseline: "middle" });
      });
    }

    // kept: lit-html's HTML, and the parser turning its marker into this comment
    const kU = prog(t, T.kept - 0.2, 0.45) * (1 - 0.5 * prog(t, T.insert - 0.2, 0.5));
    if (kU > 0.001) {
      const hy = 272;
      const m = d.nodeMarker;
      const i = d.pHtml.indexOf(m);
      const hf = mono(36, 500);
      withAlpha(ctx, kU, () => {
        text(ctx, "lit-html's HTML", TOPX, hy - 46, { font: sans(24, 600), color: C.text3, baseline: "middle" });
        const w0 = text(ctx, d.pHtml.slice(0, i), TOPX, hy, { font: hf, color: DOMC.text, baseline: "middle" });
        const wm = measure(ctx, m, hf);
        fillRR(ctx, TOPX + w0 - 4, hy - 26, wm + 8, 52, 8, rgba(DOMC.comment, 0.14));
        text(ctx, m, TOPX + w0, hy, { font: hf, color: DOMC.comment, baseline: "middle" });
        text(ctx, d.pHtml.slice(i + m.length), TOPX + w0 + wm, hy, { font: hf, color: DOMC.text, baseline: "middle" });
        const a = { x: TOPX + w0 + wm / 2, y: hy + 30 }, b = { x: xs[1] + cw(nC) / 2, y: cy - cellH / 2 - 14 };
        const Pl = vLink(a, b);
        drawPoly(ctx, Pl, { color: DOMC.comment, width: 3, to: prog(t, T.kept + 0.05, 0.5), head: 12 });
        const mid = at(Pl, 0.5);
        text(ctx, "parser", mid.x + 22, mid.y, { font: sans(26, 650), color: DOMC.comment, baseline: "middle", alpha: prog(t, T.kept + 0.3, 0.3) });
      });
    }

    // never rendered
    const iU = prog(t, T.invisible - 0.15, 0.45) * (1 - prog(t, T.insert - 0.3, 0.4));
    if (iU > 0.001) {
      const ex = xs[1] + cw(nC) + 4, ey = cy - cellH / 2 - 24;
      withAlpha(ctx, iU, () => {
        fillRR(ctx, ex - 28, ey - 28, 56, 56, 28, C.bg);
        strokeRR(ctx, ex - 28, ey - 28, 56, 56, 28, rgba(DOMC.comment, 0.8), 2);
      });
      eyeOff(ctx, ex, ey, 36, DOMC.comment, iU);
      text(ctx, "not rendered", ex + 42, ey, { font: sans(26, 600), color: DOMC.comment, baseline: "middle", alpha: iU });
    }
  });

  drawGallery(ctx, t, d, T, enter);
  drawInsert(ctx, t, d, T, { xs, cw, nC, n2, slotX, wAda, cellH, cy, flyU, ada });
}

// anywhere: the other templates' contents, as parsed.
const GALLERY = { x: TOPX + 16, y: 720, col: 780 };
function drawGallery(ctx, t, d, T, enter) {
  const u = prog(t, T.anywhere - 0.2, 0.5) * (1 - prog(t, T.insert - 0.45, 0.4)) * enter;
  if (u <= 0.001) return;
  const f = mono(30, 500);
  withAlpha(ctx, u, () => {
    text(ctx, "in other templates", GALLERY.x - 16, GALLERY.y - 58, { font: sans(24, 600), color: C.text3, baseline: "middle" });
    d.gallery.forEach((line, i) => {
      const li = prog(t, T.anywhere - 0.1 + 0.12 * i, 0.4);
      if (li <= 0) return;
      const x = GALLERY.x + (i % 2) * GALLERY.col, y = GALLERY.y + Math.floor(i / 2) * 92;
      const segs = line.split(/(<!--[^>]*-->)/).filter(Boolean);
      withAlpha(ctx, li, () => {
        const total = segs.reduce((n, s) => n + measure(ctx, s, f), 0);
        fillRR(ctx, x - 16, y - 34, total + 32, 68, 12, C.panel2);
        strokeRR(ctx, x - 15.5, y - 33.5, total + 31, 67, 12, C.border, 1.5);
        let cx = x;
        for (const s of segs) {
          const isC = s.startsWith("<!--");
          if (isC) ring(ctx, { x: cx, y: y - 21, w: measure(ctx, s, f), h: 42, r: 8, color: GOLD, u: 0.5 + 0.5 * pulse(t, T.anywhere + 0.25 + 0.12 * i, 0.9), pad: 3, width: 2 });
          cx += tagText(ctx, s, cx, y, f, isC);
        }
      });
    });
  });
}

// "<ul>" etc. in DOM colours; a comment in comment green. Returns the width.
function tagText(ctx, s, x, y, f, isComment) {
  if (isComment) return text(ctx, s, x, y + 1, { font: f, color: DOMC.comment, baseline: "middle" });
  let w = 0;
  for (const part of s.split(/(<\/?|>)/).filter(Boolean)) {
    const punct = part === "<" || part === "</" || part === ">";
    w += text(ctx, part, x + w, y + 1, { font: f, color: punct ? DOMC.punct : DOMC.tag, baseline: "middle" });
  }
  return w;
}

// The <p>'s ChildPart: startNode and endNode, and insertBefore putting "Ada" in.
function drawInsert(ctx, t, d, T, g) {
  const cu = prog(t, T.insert - 0.15, 0.45, ease.outBack);
  if (cu <= 0) return;
  const { xs, cw, nC, n2, slotX, wAda, cellH, cy, flyU, ada } = g;
  const cardX = TOPX, cardY = 700, size = 30;
  let k = null;
  withScale(ctx, lerp(0.9, 1, clamp(cu)), cardX + 260, cardY + 100, () => {
    k = card(ctx, {
      x: cardX, y: cardY, title: "ChildPart", color: OBJ.root, size, alpha: clamp(cu),
      glow: 0.7 * pulse(t, T.insert, 1.2),
      rows: [
        { k: "startNode", v: shortComment(nC), vColor: DOMC.comment, port: true },
        { k: "endNode", v: d.pEnd, vColor: DOMC.text, port: true, hl: clamp(pulse(t, T.before - 0.35, 0.9)) },
      ],
    });
  });
  // ports -> the cells
  const cellBottom = cy + cellH / 2 + 10;
  const sp = k.ports.startNode, ep = k.ports.endNode;
  const cS = xs[1] + cw(nC) / 2, cE = xs[2] + cw(n2) / 2;
  const toStart = curve(sp, { x: sp.x + 150, y: sp.y }, { x: cS, y: cellBottom + 130 }, { x: cS, y: cellBottom });
  const toEnd = curve(ep, { x: ep.x + 260, y: ep.y }, { x: cE, y: cellBottom + 160 }, { x: cE, y: cellBottom });
  drawPoly(ctx, toStart, { color: OBJ.root, width: 3, to: prog(t, T.insert + 0.35, 0.6), head: 12, alpha: 0.9 });
  drawPoly(ctx, toEnd, { color: OBJ.root, width: 3, to: prog(t, T.insert + 0.55, 0.6), head: 12, alpha: 0.9, glow: pulse(t, T.before - 0.35, 0.9) });

  // insertBefore
  const iu = prog(t, T.newW - 0.35, 0.45);
  if (iu <= 0) return;
  const chipG = platCall(ctx, {
    x: 900, y: 902, size: 36, alpha: iu,
    code: "parentNode.insertBefore(node, endNode)",
    marks: { node: "node", end: "endNode" },
    ring: { node: window(t, T.nodes - 0.2, T.insertW - 0.2, 0.3, 0.3), end: window(t, T.insertW - 0.3, T.end + 1, 0.3, 0.3) },
    hlColor: { node: OBJ.root, end: OBJ.root },
    glow: 0.5 * pulse(t, T.newW - 0.2, 1.0),
  });
  // the new text node: from the chip's `node` into the slot before endNode
  if (flyU > 0 && flyU < 1) {
    const a = { x: chipG.keys.node.cx, y: chipG.y - 12 };
    const b = { x: slotX + wAda / 2, y: cy };
    const Pl = curve(a, { x: a.x, y: a.y - 170 }, { x: b.x + 40, y: b.y + 190 }, b);
    const p = at(Pl, flyU);
    withAlpha(ctx, clamp(flyU * 4), () => {
      nodeCell(ctx, { x: p.x - wAda / 2, y: p.y, str: ada, color: DOMC.text, size: STRIP.size, hl: 0.8, hlColor: OBJ.root });
      if (flyU < 0.5) text(ctx, "text node", p.x, p.y - cellH / 2 - 24, { font: sans(24, 600), color: OBJ.root, align: "center", baseline: "middle", alpha: 1 - clamp(flyU * 2) });
    });
  }
}

const shortComment = (s) => s.replace(/\?lit\$\d+\$/, "?lit$…$");
