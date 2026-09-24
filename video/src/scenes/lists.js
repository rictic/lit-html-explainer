// lists: a child part given an array makes a child part per item, each
// between a pair of empty comments (the rest of the "mystery" comments). The
// three items come from one template literal: one cache entry, three
// instances. Later renders match items by position (truth list.render1: an
// item appended; list.render2: the first removed, so every text changes in
// place and the last item goes); repeat() matches by key instead.

import { C, DOMC, SYN, rgba } from "../kit/theme.js";
import { arrow, check, fillRR, measure, mono, panel, ring, sans, strokeRR, text, withAlpha, withGlow } from "../kit/draw.js";
import { devtools } from "../kit/browser.js";
import { Code } from "../kit/code.js";
import { Tree } from "../kit/tree.js";
import { card } from "../kit/objects.js";
import { LIST_SRC, OBJ, cacheTable, miniStrings } from "../kit/lit.js";
import { truth } from "../timing.js";
import { clamp, ease, lerp, prog, pulse, window } from "../util.js";
import { htmlLine, tag } from "./rerender-helpers.js";

export const transition = "fade";

// ------------------------------------------------------------------ data

let D = null;
function data() {
  if (D) return D;
  const L = truth().list;
  const body = L.render0.body;
  const ul = body.children.find((n) => n.name === "ul");
  const ulMarker = ul.children[0];
  // [comment, li, comment] per item
  const triples = [];
  for (let i = 1; i + 2 < ul.children.length + 1; i += 3) triples.push(ul.children.slice(i, i + 3));
  const setArray = (r) => L[r].events.find((e) => e.kind === "set part" && e.value.array).value.array.map((tr) => tr.values[0]);
  const dates = L.render1.events.filter((e) => e.kind === "template instantiated and updated")[0].fragment.children[0];
  const liPrep = L.render0.events.filter((e) => e.kind === "template prep")[1];
  const commits2 = L.render2.events.filter((e) => e.kind === "commit text").map((e) => e.value);
  const arrayLit = (xs) => `[${xs.map((x) => `'${x}'`).join(", ")}]`;
  const v0 = setArray("render0"), v1 = setArray("render1"), v2 = setArray("render2");
  const src = (xs) => LIST_SRC.replace(arrayLit(v0), arrayLit(xs));
  const REPEAT_SRC = src(v2).replace("items.map((item) => html`<li>${item}</li>`)", "repeat(items, (item) => item, (item) => html`<li>${item}</li>`)");
  D = {
    rootComment: body.children[0],
    ulMarker,
    triples,
    liNodes: [...triples.map((tr) => tr[1]), dates],
    empty: triples[0][0],
    values: [v0, v1, v2],
    commits2,
    liStrings: liPrep.strings,
    codes: [new Code(src(v0), { size: 26 }), new Code(src(v1), { size: 26 }), new Code(src(v2), { size: 26 }), new Code(REPEAT_SRC, { size: 26 })],
    chrome: new Tree({ type: "fragment", children: [] }, { size: 26 }),
  };
  return D;
}

// segments of one item's line: <!----><li><!--?lit$…-->Apples</li><!---->
function itemSegs(d, i, textOverride = null) {
  const li = d.liNodes[i];
  const marker = li.children.find((c) => c.type === "comment");
  const txt = textOverride ?? li.children.find((c) => c.type === "text").data;
  return [
    { text: `<!--${d.empty.data}-->`, role: "comment", k: "start" },
    { text: "<", role: "punct" }, { text: "li", role: "tag" }, { text: ">", role: "punct" },
    { text: `<!--${marker.data}-->`, role: "comment" },
    { text: txt, role: "text", k: "text" },
    { text: "</", role: "punct" }, { text: "li", role: "tag" }, { text: ">", role: "punct" },
    { text: `<!--${d.empty.data}-->`, role: "comment", k: "end" },
  ];
}

// ---------------------------------------------------------------- layout

const CODE = { x: 60, y: 36, w: 1160 };
const CACHE = { x: 1250, y: 36, w: 610 };
const DOM = { x: 836, y: 318, w: 1024 };
const FS = 28, LH = 64, IND = 2;
const COL = { arr: 64, arrW: 206, part: 306, partW: 176, inst: 516, instW: 280 };

export function draw(F, S) {
  const { ctx, t } = F;
  const d = data();
  const m = (k) => S.m(k);
  const enter = prog(t, S.start - 0.3, 0.7, ease.outCubic);

  // ------------------------------------------------------------ timing
  const r1T = m("next") - 0.2;                          // render 2: 'Dates' appended
  const r2T = S.word(2, "position,") - 0.25;             // render 3: 'Apples' removed
  const inT = m("inplace") - 0.1;                       // texts change in place
  const rmT = m("inplace") + 1.6;                       // then the leftover part is cleared
  const repT = m("repeat") - 0.2;
  const renderIdx = t < r1T ? 0 : t < r2T ? 1 : 2;
  const row3In = prog(t, r1T + 0.3, 0.45, ease.outBack);
  const row3Out = prog(t, rmT, 0.4);
  const row3Collapse = prog(t, rmT + 0.35, 0.45);
  const row3 = clamp(row3In) * (1 - row3Out);
  const row3H = lerp(0, 1, prog(t, r1T + 0.25, 0.35)) * (1 - row3Collapse); // height factor of row 3
  const textU = (i) => prog(t, inT + 0.18 * i, 0.4);   // render 3: text of item i changes

  // ------------------------------------------------------------ code
  const codeK = repT <= t ? 3 : renderIdx;
  const repU = prog(t, repT, 0.6);
  const liWash = window(t, m("one") - 0.15, m("next") - 0.3, 0.4, 0.5);
  const mapWash = window(t, m("arrays") - 0.15, m("one") - 0.3, 0.4, 0.5);
  const lineFlash = Math.max(pulse(t, r1T, 1.2), pulse(t, r2T, 1.2));
  withAlpha(ctx, enter, () => {
    const c0 = d.codes[0];
    const ph = c0.height + 44 + 44;
    const cwMax = d.codes[3].width(ctx) + 96;
    panel(ctx, { x: CODE.x, y: CODE.y, w: lerp(CODE.w, Math.max(CODE.w, cwMax), repU), h: ph, title: "list.js", accent: SYN.fn });
    const x = CODE.x + 48, y = CODE.y + 44 + 22;
    const drawCode = (c, alpha) => withAlpha(ctx, alpha, () => {
      // washes: the items.map binding, then the inner template literal
      const b = c.bindings.find((bb) => bb.template === 0 && bb.index === 0);
      if (mapWash > 0 && b) {
        for (const r of c.ranges(b.start, b.end)) {
          const rr = c.rect(ctx, x, y, r.line, r.col, r.len);
          fillRR(ctx, rr.x - 3, rr.y, rr.w + 6, rr.h, 7, rgba(OBJ.root, 0.12 * mapWash));
          withAlpha(ctx, mapWash, () => strokeRR(ctx, rr.x - 3, rr.y, rr.w + 6, rr.h, 7, rgba(OBJ.root, 0.6), 1.6));
        }
      }
      if (liWash > 0) {
        const toks = c.tokens.filter((tk) => tk.tpl === 1);
        const first = toks[0], last = toks.at(-1);
        const rr = c.rect(ctx, x, y, first.line, first.col - 5, last.col + 1 - first.col + 5);
        fillRR(ctx, rr.x - 3, rr.y, rr.w + 6, rr.h, 7, rgba(OBJ.template, 0.16 * liWash));
        withAlpha(ctx, liWash, () => strokeRR(ctx, rr.x - 3, rr.y, rr.w + 6, rr.h, 7, rgba(OBJ.template, 0.8), 1.8));
      }
      if (lineFlash > 0) {
        const rr = c.rect(ctx, x, y, 3, 0, c.lines[3].length);
        fillRR(ctx, rr.x - 6, rr.y, rr.w + 12, rr.h, 7, rgba(C.accent, 0.2 * lineFlash));
      }
      c.draw(ctx, x, y, { style: (tok) => (tok.text === "repeat" ? { color: OBJ.cache } : {}) });
    });
    // the render call changes with each render; repeat() replaces items.map at the end
    const prevK = codeK === 3 ? 2 : Math.max(0, codeK - 1);
    const since = [S.start - 1, r1T, r2T, repT][codeK];
    const u = prog(t, since, 0.35);
    if (u < 1 && codeK > 0) drawCode(d.codes[prevK], 1 - u);
    drawCode(d.codes[codeK], codeK > 0 ? u : 1);
    // which render this is (once there's more than one)
    const rU = prog(t, r1T, 0.35);
    if (rU > 0) {
      const pw = lerp(CODE.w, Math.max(CODE.w, cwMax), repU);
      text(ctx, `render ${renderIdx + 1}`, CODE.x + pw - 20, CODE.y + 23, { font: sans(21, 700), color: C.accent, align: "right", baseline: "middle", alpha: rU });
    }
    const repWord = window(t, S.word(2, "repeat") - 0.15, S.end + 1, 0.3, 0.3);
    if (repWord > 0) {
      const c = d.codes[3];
      const f = c.find("repeat(");
      const rr = c.rect(ctx, x, y, f.line, f.col, f.len - 1);
      ring(ctx, { ...rr, color: OBJ.cache, u: repWord, pad: 4, r: 6 });
    }
    const keyU = window(t, S.word(2, "key") - 0.1, S.end + 1, 0.4, 0.3);
    if (keyU > 0) {
      const c = d.codes[3];
      const f = c.find("(item) => item");
      const rr = c.rect(ctx, x, y, f.line, f.col, f.len);
      ring(ctx, { ...rr, color: OBJ.cache, u: keyU, pad: 4, r: 6 });
      tag(ctx, { x: rr.x + rr.w / 2, y: rr.y + rr.h + 8, text: "match by key", color: OBJ.cache, align: "center", alpha: keyU, font: sans(21, 700), h: 34 });
    }
  });

  // ------------------------------------------------------------ the DOM
  const E2 = enter * lerp(1, 0.55, repU); // dimmed when repeat() takes the stage
  // line list: body, <!---->, <ul>, marker, items..., </ul>, </body>
  const rows = [];
  const push = (kind, h = 1, extra = {}) => rows.push({ kind, h, ...extra });
  push("bodyOpen"); push("rootComment"); push("ulOpen"); push("ulMarker");
  for (let i = 0; i < 3; i++) push("item", 1, { i });
  push("item", row3H, { i: 3 });
  push("ulClose"); push("bodyClose");
  const treeTop = DOM.y + 48 + 16;
  let yy = treeTop;
  for (const r of rows) {
    r.y = yy + (LH * r.h) / 2;
    yy += LH * r.h;
  }
  const domH = yy - DOM.y + 18;
  const adv = (n) => measure(ctx, "M".repeat(n), mono(FS));
  devtools(ctx, { x: DOM.x, y: DOM.y, w: DOM.w, h: domH, tree: d.chrome, alpha: E2 });
  const X0 = DOM.x + 30;
  const indent = (depth) => X0 + adv(depth * IND);
  const itemRow = (i) => rows.find((r) => r.kind === "item" && r.i === i);
  const segsAt = {};
  withAlpha(ctx, E2, () => {
    const line = (r, segs, depth, opts = {}) => htmlLine(ctx, segs, indent(depth), r.y, { size: FS, ...opts });
    const tag3 = (name, close = false) => [{ text: close ? "</" : "<", role: "punct" }, { text: name, role: "tag" }, { text: ">", role: "punct" }];
    for (const r of rows) {
      if (r.kind === "bodyOpen") line(r, tag3("body"), 0);
      if (r.kind === "bodyClose") line(r, tag3("body", true), 0);
      if (r.kind === "rootComment") line(r, [{ text: "<!---->", role: "comment" }], 1, { alpha: 0.75 });
      if (r.kind === "ulOpen") line(r, tag3("ul"), 1);
      if (r.kind === "ulClose") line(r, tag3("ul", true), 1);
      if (r.kind === "ulMarker") line(r, [{ text: `<!--${d.ulMarker.data}-->`, role: "comment" }], 2);
      if (r.kind === "item") {
        const i = r.i;
        const exists = i < 3 ? 1 : row3;
        if (exists <= 0.001) continue;
        // item text: render 3 rewrites items 0..2 in place
        const newText = i < 3 && t >= inT ? d.commits2[i] : null;
        const u = i < 3 ? textU(i) : 0;
        const segs = itemSegs(d, i);
        const k = i === 3 ? lerp(0.9, 1, clamp(row3In)) : 1;
        ctx.save();
        ctx.translate(indent(2), r.y);
        ctx.scale(k, k);
        ctx.translate(-indent(2), -r.y);
        // the old line; from the text on, it fades as the new text comes in
        let g = line(r, segs, 2, { alpha: exists, style: (sg, j) => (newText && j >= 5 ? { alpha: 1 - u } : {}) });
        if (newText) {
          const g2 = line(r, itemSegs(d, i, newText), 2, { style: (sg, j) => (j < 5 ? { hide: true } : { alpha: u }) });
          if (u > 0.5) g = g2;
        }
        ctx.restore();
        segsAt[i] = g;
      }
    }
  });

  // brackets: each item part's range, from its start comment to its end comment
  const pairsU = prog(t, m("pairs") - 0.1, 0.5);
  const pairHot = window(t, S.word(0, "pair") - 0.1, m("more") + 0.2, 0.35, 0.5);
  const goldU = window(t, m("more") - 0.1, m("one") + 0.4, 0.4, 0.6);
  for (let i = 0; i < 4; i++) {
    const g = segsAt[i];
    if (!g) continue;
    const r = itemRow(i);
    const a = (i < 3 ? 1 : row3) * E2;
    const s0 = g[0], s1 = g[9];
    withAlpha(ctx, a * pairsU, () => {
      const by = r.y + 29;
      ctx.strokeStyle = rgba(OBJ.root, 0.55 + 0.4 * pairHot);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s0.x + 4, by - 6);
      ctx.lineTo(s0.x + 4, by);
      ctx.lineTo(s1.x + s1.w - 4, by);
      ctx.lineTo(s1.x + s1.w - 4, by - 6);
      ctx.stroke();
    });
    for (const s of [s0, s1]) {
      ring(ctx, { x: s.x, y: s.y + 3, w: s.w, h: s.h - 6, color: OBJ.root, u: a * pairHot * (1 - goldU), pad: 3, r: 5 });
      ring(ctx, { x: s.x, y: s.y + 3, w: s.w, h: s.h - 6, color: "#ffd166", u: a * goldU, pad: 3, r: 5 });
    }
  }
  const lab = window(t, S.word(0, "pair") - 0.1, m("one") - 0.2, 0.35, 0.4);
  if (segsAt[0] && lab > 0) {
    const r = itemRow(0), g = segsAt[0];
    text(ctx, "start", g[0].x + g[0].w / 2, r.y - 34, { font: sans(18, 650), color: OBJ.root, align: "center", baseline: "middle", alpha: lab * E2 });
    text(ctx, "end", g[9].x + g[9].w / 2, r.y - 34, { font: sans(18, 650), color: OBJ.root, align: "center", baseline: "middle", alpha: lab * E2 });
  }
  const moreU = window(t, m("more") + 0.1, m("one") + 0.4, 0.4, 0.6);
  tag(ctx, { x: DOM.x + DOM.w - 24, y: DOM.y + domH - 60, text: "the rest of the empty comments", color: "#ffd166", align: "right", alpha: moreU, font: sans(22, 650), h: 38 });

  // the instances' DOM: a sky underline under each <li>…</li>
  const threeU = (i) => prog(t, m("three") + 0.15 * i, 0.4);
  for (let i = 0; i < 4; i++) {
    const g = segsAt[i];
    if (!g) continue;
    const u = (i < 3 ? threeU(i) * (1 - 0.0) : Math.min(row3, 1)) * E2;
    const r = itemRow(i);
    withAlpha(ctx, u, () => fillRR(ctx, g[1].x, r.y + 19, g[8].x + g[8].w - g[1].x, 4, 2, rgba(OBJ.instance, 0.8)));
  }
  // in-place flashes
  for (let i = 0; i < 3; i++) {
    const g = segsAt[i];
    if (!g) continue;
    const r = itemRow(i);
    const w = Math.max(g[5].w, measure(ctx, d.commits2[i], mono(FS)));
    ring(ctx, { x: g[5].x, y: r.y - 18, w, h: 36, color: C.accent, u: pulse(t, inT + 0.18 * i, 1.0), pad: 4, r: 6 });
  }

  // ------------------------------------------------------------ parts
  const ulU = prog(t, m("arrays") - 0.25, 0.5, ease.outCubic);
  const markerRow = rows.find((r) => r.kind === "ulMarker");
  const nParts = renderIdx === 0 ? 3 : t < rmT ? 4 : 3;
  const partsU = prog(t, m("items") - 0.1, 0.5);
  withAlpha(ctx, E2 * ulU, () => {
    const g = card(ctx, {
      x: COL.arr, y: markerRow.y - 222, w: 600, title: "ChildPart", sub: "${items.map(…)}", color: OBJ.root, size: 26,
      rows: [
        { k: "startNode", v: "<!--?lit$…$-->", vColor: DOMC.comment, port: true },
        { k: "_$committedValue", v: partsU > 0 ? `[…${nParts}]` : "nothing", vColor: partsU > 0 ? OBJ.root : C.text3, hl: pulse(t, m("items") + 0.2, 1.2) },
      ],
    });
    const p = g.ports.startNode;
    arrow(ctx, p, { x: indent(2) - 12, y: markerRow.y }, { color: rgba(OBJ.root, 0.8), width: 2.5, bend: -40, progress: prog(t, m("arrays") + 0.2, 0.5) });
  });
  // the array it's given: one TemplateResult per item, stacked by position
  const arrU = prog(t, m("arrays") + 0.25, 0.5);
  const values = d.values;
  const cellText = (i) => {
    if (t < r1T) return values[0][i];
    if (t < r2T) return values[1][i];
    return values[2][i];
  };
  withAlpha(ctx, E2 * arrU, () => {
    const top = itemRow(0).y - 26, bottom = itemRow(2).y + 26 + (itemRow(3).y - itemRow(2).y) * clamp(row3H);
    // brackets
    ctx.strokeStyle = C.text3;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(COL.arr + 12, top - 4); ctx.lineTo(COL.arr, top - 4); ctx.lineTo(COL.arr, bottom + 4); ctx.lineTo(COL.arr + 12, bottom + 4);
    ctx.stroke();
    text(ctx, "value: an array of TemplateResults", COL.arr, top - 22, { font: sans(20, 600), color: C.text3, baseline: "middle" });
    for (let i = 0; i < 4; i++) {
      const r = itemRow(i);
      let a = i < 3 ? 1 : row3;
      if (i === 3 && t >= r2T) a *= 1 - prog(t, r2T, 0.35);
      if (a <= 0.001) continue;
      const hlGlyph = window(t, m("one") + 0.2, m("prep") + 0.3, 0.3, 0.4);
      withAlpha(ctx, a, () => {
        const x = COL.arr + 14, y = r.y;
        fillRR(ctx, x, y - 22, COL.arrW - 14, 44, 10, rgba(OBJ.result, 0.1));
        strokeRR(ctx, x + 0.5, y - 21.5, COL.arrW - 15, 43, 10, rgba(OBJ.result, 0.55 + 0.4 * hlGlyph), 1.6);
        miniStrings(ctx, x + 10, y - 10, hlGlyph > 0 ? OBJ.template : C.text3, 0.7);
        // value: crossfades when render 3 shifts the items
        const cur = cellText(i) ?? "";
        const prev = t >= r2T ? values[1][i] : t >= r1T ? values[0][i] : null;
        const u = t >= r2T ? prog(t, r2T + 0.1, 0.35) : 1;
        if (prev && prev !== cur && u < 1) text(ctx, `'${prev}'`, x + 52, y + 1, { font: mono(23, 550), color: C.text, baseline: "middle", alpha: 1 - u });
        text(ctx, `'${cur}'`, x + 52, y + 1, { font: mono(23, 550), color: C.text, baseline: "middle", alpha: prev && prev !== cur ? u : 1 });
      });
    }
  });
  const pairsLead = prog(t, m("pairs") - 0.2, 0.5);
  // one ChildPart per item, and (later) one TemplateInstance per item
  for (let i = 0; i < 4; i++) {
    const r = itemRow(i);
    const base = i < 3 ? prog(t, m("items") - 0.1 + 0.15 * i, 0.4, ease.outBack) : row3;
    if (base <= 0.001) continue;
    const a = clamp(base) * E2;
    withAlpha(ctx, a, () => {
      arrow(ctx, { x: COL.arr + COL.arrW + 6, y: r.y }, { x: COL.part - 8, y: r.y }, { color: C.text3, width: 2, head: 9 });
      chipBox(ctx, COL.part, r.y, COL.partW, "ChildPart", OBJ.root);
    });
    const leadU = (i < 3 ? pairsLead : row3) * E2;
    const gl = segsAt[i];
    if (gl && leadU > 0) withAlpha(ctx, leadU, () => {
      ctx.save();
      ctx.setLineDash([3, 7]);
      ctx.strokeStyle = rgba(OBJ.root, 0.5);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(COL.part + COL.partW + 8, r.y);
      ctx.lineTo(gl[0].x - 12, r.y);
      ctx.stroke();
      ctx.restore();
    });
    const iu = i < 3 ? threeU(i) : row3;
    withAlpha(ctx, clamp(iu) * E2, () => {
      arrow(ctx, { x: COL.part + COL.partW + 6, y: r.y }, { x: COL.inst - 8, y: r.y }, { color: C.text3, width: 2, head: 9 });
      chipBox(ctx, COL.inst, r.y, COL.instW, "TemplateInstance", OBJ.instance, pulse(t, m("three") + 0.15 * i, 1.0));

    });
  }
  // by position: render 2 lines items up with the parts it already has
  const posU = window(t, r1T + 0.2, rmT + 0.6, 0.4, 0.5);
  withAlpha(ctx, posU * E2, () => {
    for (let i = 0; i < 4; i++) {
      const r = itemRow(i);
      if (i === 3 && row3 <= 0.01) continue;
      withAlpha(ctx, i === 3 ? row3 : 1, () => text(ctx, String(i), COL.arr - 22, r.y + 1, { font: mono(22, 650), color: C.accent, align: "center", baseline: "middle" }));
    }
  });
  const oneU = window(t, S.word(1, "one") - 0.1, m("prep") + 0.2, 0.4, 0.4);
  tag(ctx, { x: COL.part + 150, y: itemRow(0).y - 104, text: "all from one template literal", color: OBJ.template, alpha: oneU * E2, font: sans(22, 650), h: 38 });
  const byPos = window(t, S.word(2, "by") - 0.2, m("repeat") + 0.2, 0.4, 0.5);
  tag(ctx, { x: COL.part + 150, y: itemRow(0).y - 104, text: "matched by position", color: C.accent, alpha: byPos * E2, font: sans(22, 650), h: 38 });
  const inPl = window(t, inT + 0.4, m("repeat") + 0.2, 0.4, 0.5);
  tag(ctx, { x: DOM.x + DOM.w - 24, y: DOM.y + domH - 60, text: "updated in place", color: C.accent, align: "right", alpha: inPl * E2, font: sans(22, 650), h: 38 });
  const gone = prog(t, rmT - 0.75, 0.3);
  if (gone > 0 && row3Collapse < 1) {
    const r = itemRow(3);
    tag(ctx, { x: COL.inst + COL.instW + 14, y: r.y - 18, h: 36, text: "removed", color: C.bad, alpha: gone * (1 - row3Out), font: sans(21, 700) });
  }

  // ------------------------------------------------------------ cache
  // the cache after the first render: the list's template and the item template
  const liHot = window(t, m("prep") - 0.15, m("next") - 0.2, 0.4, 0.5);
  const cacheA = enter * lerp(0.5, 1, prog(t, m("one") + 0.4, 0.5)) * (1 - prog(t, repT - 0.2, 0.4));
  cacheTable(ctx, {
    x: CACHE.x, y: CACHE.y, w: CACHE.w, alpha: cacheA,
    entries: [{ key: "<ul>…", u: lerp(1, 0.5, liHot) }, { key: "<li>…", u: 1, hl: liHot, hlColor: OBJ.template }],
  });
  const once = window(t, m("prep") + 0.25, m("next") - 0.2, 0.4, 0.5);
  tag(ctx, { x: CACHE.x + CACHE.w, y: CACHE.y + 220, text: "prepared once", color: OBJ.template, align: "right", alpha: once, font: sans(22, 650), h: 38 });
  const three = window(t, m("three") + 0.3, m("next") - 0.2, 0.4, 0.5);
  tag(ctx, { x: COL.part + 150, y: itemRow(0).y - 104, text: "three instances", color: OBJ.instance, alpha: three, font: sans(22, 650), h: 38 });
}

function chipBox(ctx, x, y, w, label, color, glow = 0) {
  const f = mono(23, 600);
  if (glow > 0) withGlow(ctx, rgba(color, 0.8 * glow), 18 * glow, () => fillRR(ctx, x, y - 22, w, 44, 10, C.panel));
  fillRR(ctx, x, y - 22, w, 44, 10, C.panel);
  fillRR(ctx, x, y - 22, w, 44, 10, rgba(color, 0.12));
  strokeRR(ctx, x + 0.5, y - 21.5, w - 1, 43, 10, rgba(color, 0.7), 1.8);
  text(ctx, label, x + w / 2, y + 1, { font: f, color, align: "center", baseline: "middle" });
}
