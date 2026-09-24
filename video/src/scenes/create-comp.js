// create + update, drawn as one continuous composition (update.js cuts in
// exactly where create.js ends; both call drawCreateUpdate).
//
// Framings, changed at clear moments:
//   P1 (back…phase)       the Template (left), the root ChildPart and document.body
//   P2 (instance…fast)    the TemplateInstance appears; the Template's content is cloned
//   P3 (walk…calls)       the copy (left) and the TemplateInstance with its three Parts
//   P4 (detached…remember) the copy goes into document.body; the root part remembers
//   P5 (devtools…)        the page in devtools; the marker comment explained
//
// All lit-html data comes from truth/truth.json (render 0 of the counter) or kit/lit.js.

import { scene, truth } from "../timing.js";
import { B, C, DOMC, SYN, blend, rgba } from "../kit/theme.js";
import { card } from "../kit/objects.js";
import { check, chip, cross, fillRR, measure, mono, panel, ring, rrect, sans, strokeRR, text, wash, withAlpha, withGlow, withScale } from "../kit/draw.js";
import { Tree } from "../kit/tree.js";
import { OBJ, counterValues, templateParts } from "../kit/lit.js";
import { clamp, ease, lerp, prog, pulse, window } from "../util.js";

const GOLD = "#ffd166";
const TS = 30, TLH = TS * 1.5;           // DOM trees
const CS = 28, CRH = CS * 1.75;          // cards
const CARD_H = 46 + 3 * CRH + 16;
const CARD_GAP = 12;

// Local geometry of each object (offsets from its top-left).
const TPL_W = 580;
const TPL_BOX = { x: 18, y: 94, w: TPL_W - 36, h: 4 * TLH + 20 };
const TPL_TREE = { x: 36, y: 104 };
const TPL_PARTS_Y = TPL_BOX.y + TPL_BOX.h + 30;
const TPL_H = TPL_PARTS_Y + 4 * 32 + 22;
const COPY_W = 600, COPY_TREE = { x: 70, y: 68 };
const BODY_W = 560, BODY_TREE = { x: 22, y: 68 };
const ROOT_W = 640;
const INST_W0 = 460, INST_W = 560;
const INST_CARDS = { x: 40, y: 162 };
const CARD_W = 480;
const DEV = { x: 620, y: 255, w: 1140, h: 580 }, DEV_TREE = { x: 30, y: 66 }, DEV_K = 1.35;

// ------------------------------------------------------------------ data

let D = null;
function data() {
  if (D) return D;
  const T = truth().counter;
  const ev = T.render0.events;
  const cloned = ev.find((e) => e.kind === "template instantiated").fragment;
  const updated = ev.find((e) => e.kind === "template instantiated and updated").fragment;
  const opt = { size: TS, whitespace: "hide" };
  const ip = T.rootPart.instanceParts;
  const bodyNode = (path) => path.reduce((n, i) => n.children[i], T.render0.body);
  const nodeLabel = (n) => (n.type === "comment" ? "<!--…-->" : `<${n.name}>`);
  const copy = new Tree(updated, opt);
  const body = new Tree(T.render0.body, opt);
  const rowLen = (row) => row.segs.reduce((n, sg) => n + sg.text.length, 0);
  const attrLen = (row) => row.segs.filter((sg) => sg.attr === 0).reduce((n, sg) => n + sg.text.length, 0);
  const textRow = copy.rows.find((r) => r.kind === "text");      // "0": the one node update adds
  const off = body.rows.findIndex((r) => r.node === T.render0.body.children.find((c) => c.name === "span"));
  D = {
    tpl: new Tree(cloned, opt),        // the Template's content (identical to its clone)
    copy,                              // the clone, after update (earlier states are styles of it)
    body,                              // the page after render 0
    // the nodes the three parts hold (the walker's nodes 0, 1, 2): span, comment, button
    nodes: copy.walk.map((r) => ({ row: r.index, depth: r.depth, len: rowLen(r), attrLen: attrLen(r) })),
    textRow: { row: textRow.index, depth: textRow.depth, len: rowLen(textRow) },
    off,                               // the fragment's first row, as a row of the page
    rowLen,
    emptyRow: body.rows.find((r) => r.kind === "comment" && r.node.data === ""),
    markerRow: body.rows.find((r) => r.kind === "comment" && r.node.data.startsWith("?")),
    bodyTextRow: body.rows.find((r) => r.kind === "text"),
    tplMarkerRow: null,
    tparts: templateParts(),
    values: counterValues(0),
    // the instance's parts, as lit-html made them (rootPart.instanceParts)
    parts: ip.map((p) => p.ctor === "ChildPart"
      ? { title: p.ctor, rows: [["startNode", nodeLabel(bodyNode(p.startNode)), DOMC.comment], ["endNode", String(p.endNode), C.text2]] }
      : { title: p.ctor, rows: [["element", nodeLabel(bodyNode(p.element)), DOMC.tag], ["name", `'${p.name}'`, C.text]] }),
  };
  D.tplMarkerRow = D.tpl.rows.find((r) => r.kind === "comment");
  return D;
}

// ------------------------------------------------------------------ timing

function marks() {
  const A = scene("create"), U = scene("update");
  return {
    back: A.m("back"), check: A.m("check"), no: A.m("no"), phase: A.m("phase"),
    instance: A.m("instance"), clone: A.m("clone"), fast: A.m("fast"),
    walk: A.m("walk"), stop: A.m("stop"), part: A.m("part"), reference: A.word(2, "reference"),
    p0: A.m("p0"), p1: A.m("p1"), p2: A.m("p2"), never: A.m("never"),
    update: U.m("update"), pairs: U.m("pairs"),
    v0: U.m("v0"), was: U.m("was"), change: U.m("change"), sets: U.word(1, "sets"),
    v1: U.m("v1"), text: U.m("text"), inserts: U.word(2, "inserts"),
    v2: U.m("v2"), add: U.m("add"), itself: U.m("itself"), itselfW: U.word(3, "itself"),
    calls: U.m("calls"), click: U.word(3, "click", 1), callsW: U.word(3, "calls"),
    detached: U.m("detached"), insert: U.m("insert"), remember: U.m("remember"),
    devtools: U.m("devtools"), second: U.word(5, "second"), explain: U.m("explain"),
    templateW: U.word(5, "template"), copied: U.word(5, "copied"),
    starts: U.m("starts"), startW: U.word(5, "start"),
  };
}

// ---------------------------------------------------------------- helpers

// Object state {x, y, k, a, w} through keyframes [[time, state], ...]; each
// change eases over state.dur (default 0.9 s) from its time.
function track(t, keys, dur = 0.9) {
  let s = keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [tk, sk] = keys[i];
    const u = ease.inOutCubic(clamp((t - tk) / (sk.dur ?? dur)));
    if (u <= 0) break;
    s = { x: lerp(s.x, sk.x, u), y: lerp(s.y, sk.y, u), k: lerp(s.k, sk.k, u), a: lerp(s.a, sk.a, u) };
  }
  return s;
}

// A number through keyframes [[time, value], ...].
function steps(t, v0, keys, dur = 0.45) {
  let v = v0;
  for (const [tk, vk] of keys) {
    const u = prog(t, tk, dur);
    if (u <= 0) break;
    v = lerp(v, vk, u);
  }
  return v;
}

const P = (st, dx, dy) => ({ x: st.x + st.k * dx, y: st.y + st.k * dy });   // local -> screen
function inFrame(ctx, st, fn) {
  withAlpha(ctx, st.a, () => withScale(ctx, st.k, st.x, st.y, fn));
}
// state scaled by s about its centre (for pop-ins)
function popped(st, s, w, h) {
  const cx = st.x + (st.k * w) / 2, cy = st.y + (st.k * h) / 2;
  return { ...st, x: cx - (s * st.k * w) / 2, y: cy - (s * st.k * h) / 2, k: s * st.k };
}

// Polylines with arc length, for curves things travel along.
function bez(a, b, c, d, u) {
  const v = 1 - u;
  return {
    x: v * v * v * a.x + 3 * v * v * u * b.x + 3 * v * u * u * c.x + u * u * u * d.x,
    y: v * v * v * a.y + 3 * v * v * u * b.y + 3 * v * u * u * c.y + u * u * u * d.y,
  };
}
function poly(pts) {
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, len, total: len.at(-1) || 1 };
}
function curve(a, c1, c2, b, n = 48) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(bez(a, c1, c2, b, i / n));
  return poly(pts);
}
// leaves a horizontally and arrives at b horizontally
const sLink = (a, b, k = 0.45) => curve(a, { x: a.x + (b.x - a.x) * k, y: a.y }, { x: b.x - (b.x - a.x) * k, y: b.y }, b);
function at(Pl, u) {
  const L = clamp(u) * Pl.total;
  let i = 1;
  while (i < Pl.len.length - 1 && Pl.len[i] < L) i++;
  const a = Pl.pts[i - 1], b = Pl.pts[i];
  const k = (L - Pl.len[i - 1]) / (Pl.len[i] - Pl.len[i - 1] || 1);
  return { x: lerp(a.x, b.x, clamp(k)), y: lerp(a.y, b.y, clamp(k)), ang: Math.atan2(b.y - a.y, b.x - a.x) };
}
function drawPoly(ctx, Pl, { from = 0, to = 1, color, width = 3, alpha = 1, head = 13, dash = null, glow = 0 }) {
  if (to <= from + 0.001 || alpha <= 0.001) return;
  ctx.save();
  ctx.globalAlpha *= clamp(alpha);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (glow > 0) { ctx.shadowColor = rgba(color, 0.85 * glow); ctx.shadowBlur = 18 * glow; }
  if (dash) ctx.setLineDash(dash);
  const a = from * Pl.total, b = to * Pl.total;
  const s = at(Pl, from);
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  for (let i = 1; i < Pl.pts.length; i++) if (Pl.len[i] > a && Pl.len[i] < b) ctx.lineTo(Pl.pts[i].x, Pl.pts[i].y);
  const e = at(Pl, to);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();
  if (head > 0) {
    const q = at(Pl, Math.max(0, to - 6 / Pl.total));
    const ang = Math.atan2(e.y - q.y, e.x - q.x);
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(e.x + Math.cos(ang) * 2, e.y + Math.sin(ang) * 2);
    ctx.lineTo(e.x - Math.cos(ang - 0.45) * head, e.y - Math.sin(ang - 0.45) * head);
    ctx.lineTo(e.x - Math.cos(ang + 0.45) * head, e.y - Math.sin(ang + 0.45) * head);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
function dot(ctx, x, y, r, color, alpha = 1, glow = 1) {
  withAlpha(ctx, alpha, () => withGlow(ctx, rgba(color, 0.9), 14 * glow, () => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }));
}
// a value travelling along a path: a glowing dot with a short trail
function packet(ctx, Pl, u, color, alpha = 1) {
  if (u <= 0 || u >= 1 || alpha <= 0) return;
  for (let i = 5; i >= 0; i--) {
    const p = at(Pl, u - i * 0.018);
    dot(ctx, p.x, p.y, 9 - i * 1.2, color, alpha * (i === 0 ? 1 : 0.25 * (1 - i / 6)), i === 0 ? 1.4 : 0);
  }
}

// DOM role colours (as kit/tree.js), and the desaturated "inert" version.
const ROLE = { punct: DOMC.punct, tag: DOMC.tag, attrName: DOMC.attr, attrEq: DOMC.punct, attrValue: DOMC.value, comment: DOMC.comment, text: DOMC.text, ws: DOMC.whitespace };
const inert = (role, u) => (u > 0 ? blend(ROLE[role], "#7d86a3", 0.6 * u) : ROLE[role]);

// The card chrome used by kit/objects.js card(), for objects with custom contents.
function objChrome(ctx, { x, y, w, h, title, color, glow = 0, sub = null, titleSize = CS * 0.95 }) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 8;
  fillRR(ctx, x, y, w, h, 14, C.panel);
  ctx.restore();
  if (glow > 0) withGlow(ctx, rgba(color, 0.8 * glow), 30 * glow, () => strokeRR(ctx, x, y, w, h, 14, rgba(color, glow), 2.5));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 14);
  ctx.clip();
  ctx.fillStyle = rgba(color, 0.16);
  ctx.fillRect(x, y, w, 50);
  ctx.fillStyle = rgba(color, 0.5);
  ctx.fillRect(x, y + 48.5, w, 1.5);
  ctx.restore();
  text(ctx, title, x + 20, y + 26, { font: sans(titleSize, 650), color, baseline: "middle" });
  if (sub) text(ctx, sub, x + w - 18, y + 26, { font: mono(22, 500), color: C.text2, baseline: "middle", align: "right" });
  strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 14, rgba(color, 0.55), 1.5);
}

// The devtools look (kit/browser.js devtools), without the tree, so the tree can be scaled.
function devChrome(ctx, { x, y, w, h }) {
  const head = 48;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 12;
  fillRR(ctx, x, y, w, h, 14, "#1b1f2b");
  ctx.restore();
  ctx.save();
  rrect(ctx, x, y, w, h, 14);
  ctx.clip();
  ctx.fillStyle = "#23283a";
  ctx.fillRect(x, y, w, head);
  ctx.fillStyle = "#353c55";
  ctx.fillRect(x, y + head - 1, w, 1);
  let tx = x + 22;
  ["Elements", "Console", "Sources", "Network"].forEach((tab, i) => {
    const tw = text(ctx, tab, tx, y + head / 2 + 1, { font: sans(19, i === 0 ? 600 : 450), color: i === 0 ? C.text : C.text3, baseline: "middle" });
    if (i === 0) { ctx.fillStyle = C.accent; ctx.fillRect(tx - 4, y + head - 4, tw + 8, 3); }
    tx += tw + 34;
  });
  ctx.restore();
  strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 14, "#353c55", 1.5);
}

// document.body's panel (kit panel look) turning into the devtools panel (kit devtools look).
function morphChrome(ctx, { x, y, w, h }, u) {
  if (u <= 0) return panel(ctx, { x, y, w, h, title: "document.body", titleFont: sans(24, 600), accent: OBJ.dom, header: 50 });
  if (u >= 1) return devChrome(ctx, { x, y, w, h });
  const head = lerp(50, 48, u);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = lerp(30, 36, u);
  ctx.shadowOffsetY = lerp(10, 12, u);
  fillRR(ctx, x, y, w, h, lerp(16, 14, u), blend(C.panel, "#1b1f2b", u));
  ctx.restore();
  ctx.save();
  rrect(ctx, x, y, w, h, lerp(16, 14, u));
  ctx.clip();
  ctx.fillStyle = blend(C.panel2, "#23283a", u);
  ctx.fillRect(x, y, w, head);
  ctx.fillStyle = blend(C.border, "#353c55", u);
  ctx.fillRect(x, y + head - 1, w, 1);
  withAlpha(ctx, 1 - clamp(u / 0.4), () => {
    fillRR(ctx, x + 18, y + head / 2 - 5, 10, 10, 5, OBJ.dom);
    text(ctx, "document.body", x + 38, y + head / 2 + 1, { font: sans(24, 600), color: C.text2, baseline: "middle" });
  });
  withAlpha(ctx, clamp((u - 0.55) / 0.45), () => {
    let tx = x + 22;
    ["Elements", "Console", "Sources", "Network"].forEach((tab, i) => {
      const tw = text(ctx, tab, tx, y + head / 2 + 1, { font: sans(19, i === 0 ? 600 : 450), color: i === 0 ? C.text : C.text3, baseline: "middle" });
      if (i === 0) { ctx.fillStyle = C.accent; ctx.fillRect(tx - 4, y + head - 4, tw + 8, 3); }
      tx += tw + 34;
    });
  });
  ctx.restore();
  strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, lerp(16, 14, u), blend(C.border, "#353c55", u), 1.5);
}

// The DocumentFragment's panel (the kit panel look) at screen rect R drawn at
// scale kk; headU grows its header in, alpha fades the whole panel.
function fragPanel(ctx, R, kk, headU, alpha) {
  withAlpha(ctx, alpha, () => withScale(ctx, kk, R.x, R.y, () => {
    const { x, y } = R, w = R.w / kk, h = R.h / kk;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    fillRR(ctx, x, y, w, h, 16, C.panel);
    ctx.restore();
    if (headU > 0) {
      const hh = 50 * headU;
      ctx.save();
      rrect(ctx, x, y, w, h, 16);
      ctx.clip();
      ctx.fillStyle = C.panel2;
      ctx.fillRect(x, y, w, hh);
      ctx.fillStyle = C.border;
      ctx.fillRect(x, y + hh - 1, w, 1);
      ctx.restore();
      withAlpha(ctx, headU, () => {
        fillRR(ctx, x + 18, y + hh / 2 - 5, 10, 10, 5, OBJ.dom);
        text(ctx, "DocumentFragment", x + 38, y + hh / 2 + 1, { font: sans(24, 600), color: C.text2, baseline: "middle" });
      });
    }
    strokeRR(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 16, C.border, 1.5);
  }));
}

// One value, in its binding's colour, as a cell (like kit valuesArray's cells).
function valueCell(ctx, { x, y, str, color, size = 26, alpha = 1, hl = 0, box = 1 }) {
  const f = mono(size, 500);
  const w = measure(ctx, str, f) + 28, h = size * 1.9;
  withAlpha(ctx, alpha, () => {
    withAlpha(ctx, box, () => {
      fillRR(ctx, x, y - h / 2, w, h, 9, rgba(color, 0.1));
      strokeRR(ctx, x + 0.5, y - h / 2 + 0.5, w - 1, h - 1, 9, rgba(color, 0.55), 2);
    });
    if (hl > 0) withAlpha(ctx, hl, () => withGlow(ctx, rgba(color, 0.9), 20, () => strokeRR(ctx, x, y - h / 2, w, h, 9, color, 2.5)));
    text(ctx, str, x + w / 2, y + 1, { font: f, color, align: "center", baseline: "middle" });
  });
  return { w, h };
}

// Text in pieces [{s, font, color}] from x; returns the width.
function pieces(ctx, ps, x, y, { alpha = 1, align = "left" } = {}) {
  const total = ps.reduce((n, p) => n + measure(ctx, p.s, p.font), 0);
  let cx = align === "center" ? x - total / 2 : x;
  withAlpha(ctx, alpha, () => {
    for (const p of ps) cx += text(ctx, p.s, cx, y, { font: p.font, color: p.color, baseline: "middle" });
  });
  return total;
}

// ------------------------------------------------------------------- draw

export function drawCreateUpdate(F) {
  const { ctx, t } = F;
  const d = data();
  const M = marks();
  const adv = d.copy.adv(ctx);
  const kw = measure(ctx, "_$committedValue:", mono(CS, 450));    // card key column
  const valX = 20 + kw + 14;                                        // card value column (local)

  // ---------------------------------------------------------- framings
  const tplSt = track(t, [
    [-Infinity, { x: 70, y: 300, k: 1.15, a: 1 }],
    [M.walk - 0.7, { x: -760, y: 300, k: 1.15, a: 0 }],
    [M.devtools - 0.35, { x: 50, y: 350, k: 0.9, a: 0.5 }],
    [M.explain - 0.15, { x: 50, y: 350, k: 0.9, a: 1, dur: 0.5 }],
  ]);
  const rootSt = track(t, [
    [-Infinity, { x: 830, y: 280, k: 1.1, a: 1 }],
    [M.instance - 0.45, { x: 830, y: 280, k: 1.07, a: 0, dur: 0.45 }],
    [M.detached - 0.5, { x: 900, y: 160, k: 1.05, a: 0, dur: 0.01 }],
    [M.detached + 0.55, { x: 900, y: 140, k: 1.05, a: 1, dur: 0.6 }],
    [M.insert + 1.9, { x: 560, y: 150, k: 1.05, a: 1 }],
    [M.devtools - 0.35, { x: 560, y: 150, k: 1.0, a: 0, dur: 0.35 }],
  ]);
  const bodySt = track(t, [
    [-Infinity, { x: 830, y: 590, k: 1.1, a: 1 }],
    [M.instance - 0.45, { x: 830, y: 590, k: 1.07, a: 0, dur: 0.45 }],
    [M.detached - 0.5, { x: 900, y: 420, k: 1.05, a: 0, dur: 0.01 }],
    [M.detached + 0.65, { x: 900, y: 400, k: 1.05, a: 1, dur: 0.6 }],
    [M.insert + 1.9, { x: 560, y: 410, k: 1.05, a: 1 }],
  ]);
  const copySt = track(t, [
    [-Infinity, { x: 800, y: 460, k: 1.2, a: 1 }],
    [M.walk - 0.7, { x: 70, y: 400, k: 1.25, a: 1 }],
  ]);
  let instSt = track(t, [
    [-Infinity, { x: 1380, y: 170, k: 1, a: 1 }],
    [M.walk - 0.7, { x: 1010, y: 130, k: 1, a: 1 }],
    [M.detached - 0.1, { x: 1530, y: 370, k: 0.58, a: 0.5 }],
    [M.insert + 1.9, { x: 1240, y: 330, k: 0.76, a: 0.5 }],
    [M.remember - 0.6, { x: 1240, y: 330, k: 0.76, a: 1, dur: 0.5 }],
    [M.devtools - 0.35, { x: 1270, y: 330, k: 0.76, a: 0, dur: 0.35 }],
  ]);

  // ------------------------------------------------------- beat values
  // P1: the question
  const rootGlow = Math.max(0.85 * window(t, M.back - 0.15, M.phase + 0.2, 0.4, 0.6), window(t, M.insert - 0.2, M.remember + 1.4, 0.4, 0.6));
  const askU = window(t, M.check - 0.15, M.instance - 0.5, 0.4, 0.4);
  const noU = prog(t, M.no - 0.12, 0.45);
  const thisTplGlow = window(t, M.check + 1.2, M.phase + 0.2, 0.5, 0.5);

  // P2: the instance and the clone
  const instIn = prog(t, M.instance - 0.1, 0.5, ease.outBack);
  const cloneU = prog(t, M.clone + 0.2, 1.0);
  const srcGlow = window(t, M.clone - 0.1, M.clone + 1.8, 0.3, 0.5);
  const tmplLink = prog(t, M.instance + 0.45, 0.6) * (1 - prog(t, M.walk - 0.9, 0.4));

  // P3: the walk
  const created = [M.part + 0.15, M.p1 - 0.05, M.p2 - 0.05];
  const counted = [M.walk + 1.05, M.p1 - 0.35, M.p2 - 0.3];
  const matched = [M.stop - 0.1, counted[1], counted[2]];
  // the rows the walker stops at, before update adds the text node (span, comment, button)
  const visRow = d.nodes.map((nd) => nd.row - (nd.row > d.textRow.row ? 1 : 0));
  const curRow = steps(t, visRow[0], [[M.p1 - 0.8, visRow[1]], [M.p2 - 0.75, visRow[2]]], 0.5);
  const walkerA = prog(t, M.walk + 0.55, 0.3) * (1 - prog(t, M.never - 0.3, 0.4));
  const stripA = prog(t, M.walk + 0.2, 0.4) * (1 - prog(t, M.update - 0.1, 0.4));
  const gutterA = 1 - prog(t, M.update - 0.1, 0.4);
  const nOpen = created.reduce((n, c) => n + prog(t, c - 0.35, 0.4), 0);
  const cardIn = created.map((c) => prog(t, c, 0.45, ease.outBack));
  const linkIn = created.map((c) => prog(t, c + 0.3, 0.55));
  const cardEmph = [window(t, M.p0 - 0.15, M.p0 + 1.7, 0.3, 0.5), window(t, M.p1 + 0.2, M.p1 + 2.0, 0.3, 0.5), window(t, M.p2 + 0.2, M.p2 + 1.7, 0.3, 0.5)];
  const refPulse = pulse(t, M.reference - 0.15, 1.1);
  const neverU = window(t, M.never - 0.1, M.update + 0.3, 0.4, 0.5);

  // P3: the update
  const vT = [M.v0, M.v1, M.v2];
  const cellIn = [0, 1, 2].map((i) => prog(t, M.pairs - 0.1 + 0.15 * i, 0.45, ease.outBack));
  const cellHl = vT.map((v) => window(t, v - 0.1, v + 1.8, 0.3, 0.5));
  const toRow = [prog(t, M.change + 0.65, 0.55), prog(t, M.inserts + 1.25, 0.55), prog(t, M.itselfW + 0.55, 0.55)];
  const wasU = window(t, M.was - 0.12, M.sets + 0.3, 0.35, 0.45);
  const neqU = window(t, M.change - 0.12, M.sets + 0.9, 0.35, 0.4);
  const pk0 = prog(t, M.sets - 0.45, 0.6);
  const uClass = prog(t, M.sets + 0.12, 0.45);
  const chipIn = prog(t, M.text + 0.1, 0.4, ease.outBack);
  const chipGo = prog(t, M.inserts + 0.1, 0.8);
  const uText = prog(t, M.inserts - 0.2, 0.5);
  const textRowIn = prog(t, M.inserts + 0.82, 0.2);
  const pk2 = prog(t, M.add + 0.05, 0.7);
  const lsIn = prog(t, M.itself + 0.1, 0.7);
  const clickU = prog(t, M.click - 0.05, 0.55);
  const pkBack = prog(t, M.click + 0.3, 0.7);
  const handleFlash = pulse(t, M.click + 0.9, 0.8);
  const callFlash = pulse(t, M.callsW - 0.1, 0.9);
  const flashes = [pulse(t, M.sets + 0.12, 1.0), pulse(t, M.inserts + 0.8, 1.0), pulse(t, M.add + 0.72, 1.0)];

  // P4
  const detU = prog(t, M.detached - 0.1, 0.4);
  const gapU = prog(t, M.insert + 0.25, 0.5);
  const blockU = prog(t, M.insert + 0.7, 1.0);
  const landed = blockU >= 1;
  const landFlash = pulse(t, M.insert + 1.65, 1.0);
  const copyGone = prog(t, M.insert + 1.9, 0.6);
  const remU = prog(t, M.remember - 0.1, 0.45);
  const remArrow = prog(t, M.remember + 0.15, 0.6);

  // P5
  const dvU = prog(t, M.devtools - 0.3, 0.9);
  const ringU = prog(t, M.second - 0.25, 0.4);
  const tplRing = prog(t, M.templateW - 0.3, 0.4);
  const copiedU = prog(t, M.copied - 0.35, 0.6);
  const bracketU = prog(t, M.starts - 0.1, 0.5);
  const startLabel = prog(t, M.startW - 0.35, 0.4);

  // links fade while the copy is being inserted, and come back pointing into the page
  const linksA = steps(t, 1, [[M.detached - 0.1, 0], [M.remember - 0.5, 0.55], [M.devtools - 0.35, 0]], 0.45);

  // ------------------------------------------------ geometry: DOM rows
  // The fragment: the copy panel's tree, then (while inserted) moving into the body.
  const copyTree0 = P(copySt, COPY_TREE.x, COPY_TREE.y);
  const bodyTree0 = P(bodySt, BODY_TREE.x, BODY_TREE.y);
  // devtools morph: the body's tree moves and scales into the devtools panel
  const bodyTreeO = { x: lerp(bodyTree0.x, DEV.x + DEV_TREE.x, dvU), y: lerp(bodyTree0.y, DEV.y + DEV_TREE.y, dvU) };
  const bodyK = bodySt.k * lerp(1, DEV_K, dvU);
  const blockTarget = { x: bodyTreeO.x + bodyK * d.body.rows[d.off].depth * 2 * adv, y: bodyTreeO.y + bodyK * d.off * TLH };
  const blockO = landed ? blockTarget : { x: lerp(copyTree0.x, blockTarget.x, blockU), y: lerp(copyTree0.y, blockTarget.y, blockU) + 50 * Math.sin(Math.PI * blockU) };
  const blockK = landed ? bodyK : lerp(copySt.k, bodyK, blockU);
  // screen rect of node n's row (0 span, 1 comment, 2 button)
  // before update adds the text node, the rows after it sit one row higher
  const shiftOf = (row) => (row > d.textRow.row ? -TLH * (1 - uText) : 0);
  const nodeLen = (n) => d.nodes[n].len - d.nodes[n].attrLen * (1 - uClass);
  const nodeRow = (n) => {
    const nd = d.nodes[n];
    const x0 = blockO.x + blockK * nd.depth * 2 * adv;
    const y = blockO.y + blockK * (nd.row * TLH + shiftOf(nd.row));
    return { x: x0, y, w: blockK * nodeLen(n) * adv, h: blockK * TLH, cy: y + (blockK * TLH) / 2 };
  };

  // ------------------------------------------- geometry: the instance
  const instW = lerp(INST_W0, INST_W, clamp(nOpen));
  const instH = lerp(170, INST_CARDS.y + 34 + 12, clamp(nOpen)) + Math.max(0, nOpen) * (CARD_H + CARD_GAP);
  instSt = popped(instSt, instIn, instW, instH);
  const cardY = (i) => INST_CARDS.y + i * (CARD_H + CARD_GAP);
  const cardPort = (i) => P(instSt, INST_CARDS.x, cardY(i) + 46 + 8 + CRH / 2);
  const cardRowC = (i, r) => P(instSt, INST_CARDS.x, cardY(i) + 46 + 8 + r * CRH + CRH / 2);

  // part -> node links (screen)
  const links = [0, 1, 2].map((i) => {
    const r = nodeRow(i);
    return sLink(cardPort(i), { x: r.x + r.w + 12, y: r.cy }, 0.45);
  });

  // ============================================================ DRAWING

  // ------------------------------------------------ the Template (P1, P2, P5)
  if (tplSt.a > 0.001 && tplSt.x > -640) {
    inFrame(ctx, tplSt, () => {
      const { x, y } = tplSt;
      objChrome(ctx, { x, y, w: TPL_W, h: TPL_H, title: "Template", color: OBJ.template, glow: Math.max(thisTplGlow, 0.7 * srcGlow) });
      text(ctx, "el.content", x + 20, y + 72, { font: mono(22, 500), color: C.text3, baseline: "middle" });
      // the inert content
      const bx = x + TPL_BOX.x, by = y + TPL_BOX.y;
      fillRR(ctx, bx, by, TPL_BOX.w, TPL_BOX.h, 10, "#171f38");
      fillRR(ctx, bx, by, TPL_BOX.w, TPL_BOX.h, 10, "rgba(190,205,255,0.045)");
      strokeRR(ctx, bx + 0.5, by + 0.5, TPL_BOX.w - 1, TPL_BOX.h - 1, 10, rgba(OBJ.template, 0.28 + 0.5 * srcGlow), 1.5);
      if (srcGlow > 0) withAlpha(ctx, srcGlow, () => withGlow(ctx, rgba(OBJ.template, 0.7), 24, () => strokeRR(ctx, bx, by, TPL_BOX.w, TPL_BOX.h, 10, OBJ.template, 2)));
      d.tpl.draw(ctx, x + TPL_TREE.x, y + TPL_TREE.y, { style: (seg) => ({ color: inert(seg.role, 1) }) });
      // the ring on the template's own marker comment (P5)
      if (tplRing > 0) {
        const r = d.tpl.rowRect(ctx, x + TPL_TREE.x, y + TPL_TREE.y, d.tplMarkerRow);
        ring(ctx, { ...r, r: 8, color: GOLD, u: tplRing, pad: 7 });
      }
      // parts
      const py = y + TPL_PARTS_Y;
      const pf = mono(22, 500), pa = measure(ctx, "M", pf);
      text(ctx, "parts: [", x + 20, py, { font: pf, color: C.text3, baseline: "middle" });
      d.tparts.forEach((p, i) => {
        const s = `{type: ${p.type}, index: ${p.index}` + (p.name !== undefined ? `, name: '${p.name}', …},` : "},");
        const ly = py + 32 * (i + 1);
        text(ctx, s, x + 44, ly, { font: pf, color: C.text2, baseline: "middle" });
        const ix = s.indexOf("index");
        text(ctx, `index: ${p.index}`, x + 44 + ix * pa, ly, { font: mono(22, 600), color: B[i], baseline: "middle" });
      });
      text(ctx, "]", x + 20, py + 32 * 4, { font: pf, color: C.text3, baseline: "middle" });
    });
  }

  // --------------------------------------------- the root ChildPart (P1, P4)
  if (rootSt.a > 0.001) {
    inFrame(ctx, rootSt, () => {
      const { x, y } = rootSt;
      const k = card(ctx, {
        x, y, w: ROOT_W, title: "ChildPart", sub: "document.body._$litPart$", color: OBJ.root, size: CS, glow: rootGlow,
        rows: [
          { k: "startNode", v: "<!---->", vColor: DOMC.comment },
          { k: "endNode", v: "null", vColor: C.text2 },
          { k: "_$committedValue", hl: Math.max(askU, window(t, M.remember - 0.1, M.devtools, 0.4, 0.5)), vColor: remU > 0 ? OBJ.instance : C.text },
        ],
      });
      const rr = k.row(2);
      const vx = x + valX, vy = rr.y + rr.h / 2 + 1;
      text(ctx, "nothing", vx, vy, { font: mono(CS, 500), color: C.text3, baseline: "middle", alpha: 1 - remU });
      text(ctx, "TemplateInstance", vx, vy, { font: mono(CS, 500), color: OBJ.instance, baseline: "middle", alpha: remU });
      dot(ctx, x, k.row(0).y + CRH / 2, 7, OBJ.root, 1, 0.8);
      if (remArrow > 0) dot(ctx, x + ROOT_W - 22, vy, 7, OBJ.instance, remArrow, 0.8);
    });
  }

  // --------------------------------------------- document.body -> devtools
  const bodyA = Math.max(bodySt.a, dvU);
  if (bodyA > 0.001) {
    const nFrag = d.copy.rows.length;
    const rows0 = d.body.rows.length - nFrag + nFrag * gapU;
    const bodyRect0 = { x: bodySt.x, y: bodySt.y, w: bodySt.k * BODY_W, h: bodySt.k * (BODY_TREE.y + rows0 * TLH + 18) };
    const rect = {
      x: lerp(bodyRect0.x, DEV.x, dvU), y: lerp(bodyRect0.y, DEV.y, dvU),
      w: lerp(bodyRect0.w, DEV.w, dvU), h: lerp(bodyRect0.h, DEV.h, dvU),
    };
    withAlpha(ctx, bodyA, () => {
      morphChrome(ctx, rect, dvU);
      // selection bar on the marker comment (devtools)
      if (ringU > 0) {
        const ry = bodyTreeO.y + bodyK * d.markerRow.index * TLH;
        withAlpha(ctx, ringU, () => { ctx.fillStyle = "rgba(122,162,255,0.2)"; ctx.fillRect(rect.x, ry, rect.w, bodyK * TLH); });
      }
      withScale(ctx, bodyK, bodyTreeO.x, bodyTreeO.y, () => {
        d.body.draw(ctx, bodyTreeO.x, bodyTreeO.y, {
          rowStyle: (row) => {
            if (row.index >= d.off && row.index < d.off + nFrag) return landed ? {} : { hide: true };
            if (row.index >= d.off + nFrag) return { dy: -nFrag * TLH * (1 - gapU) };
            return {};
          },
          style: (seg, row) => writtenStyle(seg, row.index - d.off),
        });
      });
      if (landFlash > 0) {
        withScale(ctx, bodyK, bodyTreeO.x, bodyTreeO.y, () =>
          wash(ctx, { x: blockTarget.x - 4, y: bodyTreeO.y + d.off * TLH + 4, w: d.copy.cols * adv + 8, h: nFrag * TLH - 8, color: OBJ.dom, u: 0.8 * landFlash, r: 8 }));
      }
      // "(empty)" after <!----> in P1
      if (bodySt.a > 0.001 && dvU === 0 && noU > 0 && t < M.detached) {
        const er = d.emptyRow;
        text(ctx, "empty", bodyTree0.x + bodySt.k * (er.depth * 2 + d.rowLen(er)) * adv + 22, bodyTree0.y + bodySt.k * (er.index + 0.5) * TLH + 1, { font: sans(24, 450, "italic"), color: C.text3, baseline: "middle", alpha: noU });
      }
    });
  }

  // written DOM, in its binding's colour; copy row index i (-1.. for others)
  function writtenStyle(seg, i) {
    if (i === d.nodes[0].row && seg.attr === 0) {
      const col = seg.role === "attrName" ? blend(DOMC.attr, B[0], 0.75) : seg.role === "attrValue" ? B[0] : blend(DOMC.punct, B[0], 0.5);
      return { collapse: 1 - uClass, alpha: uClass, color: col };
    }
    if (i === d.textRow.row) return { color: blend(DOMC.text, B[1], 0.8) };
    return {};
  }

  // ------------------------------------------------ the copy (fragment)
  const copyA = (cloneU >= 1 ? 1 : 0) * (1 - copyGone);
  if (copyA > 0.001) {
    const rowsN = d.copy.rows.length - 1 + uText;
    inFrame(ctx, { ...copySt, a: copyA }, () => {
      const { x, y } = copySt;
      const h = COPY_TREE.y + rowsN * TLH + 18;
      panel(ctx, { x, y, w: COPY_W, h, title: "DocumentFragment", titleFont: sans(24, 600), accent: OBJ.dom, header: 50 });
      if (detU > 0 && !landed) {
        withAlpha(ctx, detU, () => {
          chip(ctx, { x: x + COPY_W - 16, y: y + 8, text: "detached", align: "right", font: sans(21, 650), h: 34, color: C.white, bg: rgba(C.accent, 0.25), border: C.accent });
          ctx.save();
          ctx.setLineDash([10, 8]);
          strokeRR(ctx, x - 8, y - 8, COPY_W + 16, h + 16, 20, rgba(C.accent, 0.55 + 0.25 * Math.sin(t * 4)), 2);
          ctx.restore();
        });
      }
      if (landed) text(ctx, "empty", x + COPY_W / 2, y + h / 2 + 25, { font: sans(26, 450, "italic"), color: C.text3, align: "center", baseline: "middle" });
      // walker: gutter node indices and the cursor
      if (walkerA > 0) {
        const rowY = (r) => y + COPY_TREE.y + r * TLH;
        const cy = rowY(curRow);
        const stopped = Math.max(...visRow.map((r, n) => (Math.abs(curRow - r) < 0.02 && t >= matched[n] ? 1 : 0)));
        withAlpha(ctx, walkerA, () => {
          fillRR(ctx, x + 8, cy + 2, COPY_W - 16, TLH - 4, 8, rgba(C.accent, 0.13 + 0.1 * stopped));
          ctx.beginPath();
          ctx.moveTo(x + 14, cy + TLH / 2 - 9);
          ctx.lineTo(x + 26, cy + TLH / 2);
          ctx.lineTo(x + 14, cy + TLH / 2 + 9);
          ctx.closePath();
          ctx.fillStyle = C.accent;
          ctx.fill();
        });
      }
      if (gutterA > 0) {
        visRow.forEach((r, n) => {
          const u = prog(t, counted[n], 0.35, ease.outBack);
          if (u <= 0) return;
          const cy = y + COPY_TREE.y + r * TLH + TLH / 2;
          // a match with the parts list: the node's number takes its part's colour
          const m = prog(t, matched[n], 0.35);
          const glow = window(t, matched[n], created[n] + 0.8, 0.3, 0.5);
          withScale(ctx, u * (1 + 0.15 * glow), x + 46, cy, () => withGlow(ctx, rgba(B[n], 0.9 * glow), 14, () =>
            text(ctx, String(n), x + 46, cy + 1, { font: mono(26, 650), color: blend(C.text, B[n], m), align: "center", baseline: "middle", alpha: gutterA })));
        });
      }
    });
  }

  // the fragment's rows: in the copy panel, or moving into the body
  const fragVisible = cloneU >= 1 && !landed && copyA > 0.001 || (blockU > 0 && !landed);
  if (fragVisible) {
    withAlpha(ctx, blockU > 0 ? 1 : copyA, () => withScale(ctx, blockK, blockO.x, blockO.y, () => {
      d.copy.draw(ctx, blockO.x, blockO.y, {
        rowStyle: (row) => {
          if (row.index === d.textRow.row) return textRowIn > 0 ? { alpha: textRowIn } : { hide: true };
          return { dy: shiftOf(row.index) };
        },
        style: (seg, row) => writtenStyle(seg, row.index),
      });
      // flashes where writes land
      // (the child part's write is its new text node; the others write to their element)
      [d.nodes[0], d.textRow, d.nodes[2]].forEach((nd, n) => {
        const u = flashes[n];
        if (u <= 0) return;
        const len = n === 0 ? nodeLen(0) : nd.len;
        wash(ctx, { x: blockO.x + nd.depth * 2 * adv - 4, y: blockO.y + nd.row * TLH + shiftOf(nd.row) + 4, w: len * adv + 8, h: TLH - 8, color: B[n], u: u * 1.4, r: 8 });
      });
      // the node a part was just made for
      [0, 1, 2].forEach((n) => {
        const u = pulse(t, created[n] + 0.4, 1.0) + (n === 0 ? refPulse : 0);
        if (u <= 0) return;
        const nd = d.nodes[n];
        wash(ctx, { x: blockO.x + nd.depth * 2 * adv - 4, y: blockO.y + nd.row * TLH + shiftOf(nd.row) + 4, w: nodeLen(n) * adv + 8, h: TLH - 8, color: B[n], u: 0.9 * u, r: 8 });
      });
    }));
  }

  // the clone in flight: a copy of the template's content lifts off, in its
  // own panel, and becomes the live DocumentFragment
  if (cloneU > 0 && cloneU < 1) {
    const e = cloneU;
    const lift = 60 * Math.sin(Math.PI * e);
    const R0 = { x: tplSt.x + tplSt.k * TPL_BOX.x, y: tplSt.y + tplSt.k * TPL_BOX.y, w: tplSt.k * TPL_BOX.w, h: tplSt.k * TPL_BOX.h };
    const R1 = { x: copySt.x, y: copySt.y, w: copySt.k * COPY_W, h: copySt.k * (COPY_TREE.y + (d.copy.rows.length - 1) * TLH + 18) };
    const R = { x: lerp(R0.x, R1.x, e), y: lerp(R0.y, R1.y, e) - lift, w: lerp(R0.w, R1.w, e), h: lerp(R0.h, R1.h, e) };
    const kk = lerp(tplSt.k, copySt.k, e);
    fragPanel(ctx, R, kk, clamp((e - 0.25) / 0.55), clamp(e / 0.12));
    const T0 = P(tplSt, TPL_TREE.x, TPL_TREE.y);
    const o = { x: lerp(T0.x, copyTree0.x, e), y: lerp(T0.y, copyTree0.y, e) - lift };
    withScale(ctx, kk, o.x, o.y, () => d.tpl.draw(ctx, o.x, o.y, { style: (seg) => ({ color: inert(seg.role, 1 - e) }) }));
  }

  // ------------------------------------------------ the TemplateInstance
  if (instIn > 0 && instSt.a > 0.001) {
    inFrame(ctx, instSt, () => {
      const { x, y } = instSt;
      const glow = Math.max(0.8 * window(t, M.instance - 0.1, M.instance + 1.6, 0.3, 0.6), 0.9 * pulse(t, M.remember + 0.55, 1.1));
      objChrome(ctx, { x, y, w: instW, h: instH, title: "TemplateInstance", color: OBJ.instance, glow });
      const kf = mono(CS, 450), vf = mono(CS, 500);
      const r1 = y + 58 + CRH / 2, r2 = y + 58 + CRH + CRH / 2;
      text(ctx, "_$template:", x + 20, r1 + 1, { font: kf, color: C.text3, baseline: "middle" });
      text(ctx, "Template", x + 20 + measure(ctx, "_$template: ", kf), r1 + 1, { font: vf, color: OBJ.template, baseline: "middle" });
      const pw = text(ctx, "_$parts: [", x + 20, r2 + 1, { font: kf, color: C.text3, baseline: "middle" });
      const closeInline = { x: x + 20 + pw, y: r2 + 1 };
      const closeBelow = { x: x + 20, y: y + instH - 30 };
      const cu = clamp(nOpen);
      text(ctx, "]", lerp(closeInline.x, closeBelow.x, cu), lerp(closeInline.y, closeBelow.y, cu), { font: kf, color: C.text3, baseline: "middle" });
      dot(ctx, x, r1, 7, OBJ.template, tmplLink, 0.8);
      if (t >= M.pairs - 0.3 && t < M.detached + 0.5) {
        text(ctx, "_update(values)", x + instW - 20, y + 26, { font: mono(22, 500), color: C.text2, baseline: "middle", align: "right", alpha: prog(t, M.pairs - 0.25, 0.4) * (1 - prog(t, M.detached - 0.1, 0.4)) });
      }
      // the parts
      for (let i = 0; i < 3; i++) {
        if (cardIn[i] <= 0) continue;
        const cx = x + INST_CARDS.x, cy = y + cardY(i);
        withScale(ctx, cardIn[i], cx + CARD_W / 2, cy + CARD_H / 2, () => {
          const part = d.parts[i];
          const committedHl = i === 0 ? wasU : 0;
          const k = card(ctx, {
            x: cx, y: cy, w: CARD_W, title: part.title, color: B[i], size: CS, keyW: kw,
            glow: Math.max(cardEmph[i], 0.6 * neverU, i === 2 ? 0.9 * handleFlash + 0.6 * pulse(t, M.itselfW - 0.1, 1.2) : 0),
            rows: [
              { k: part.rows[0][0], v: part.rows[0][1], vColor: part.rows[0][2], hl: i === 0 ? 0.6 * refPulse : 0 },
              { k: part.rows[1][0], v: part.rows[1][1], vColor: part.rows[1][2] },
              { k: "_$committedValue", hl: Math.max(committedHl, i === 2 ? callFlash : 0), vColor: B[i] },
            ],
          });
          const rr = k.row(2);
          const vy = rr.y + rr.h / 2 + 1;
          text(ctx, "nothing", cx + valX, vy, { font: mono(CS, 500), color: C.text3, baseline: "middle", alpha: 1 - clamp((toRow[i] - 0.15) / 0.4) });
          if (toRow[i] >= 1) text(ctx, d.values[i], cx + valX, vy, { font: mono(CS, 500), color: B[i], baseline: "middle" });
          dot(ctx, cx, k.row(0).y + CRH / 2, 7, B[i], 1, 0.8);
        });
      }
    });
  }

  // values, lined up against the parts (P3, update)
  if (t >= M.pairs - 0.2 && t < M.detached) {
    const colX = instSt.x + instSt.k * (INST_W + 62);
    withAlpha(ctx, prog(t, M.pairs - 0.2, 0.4) * (1 - clamp(toRow[2] * 2)), () =>
      text(ctx, "values", colX, cardRowC(0, 2).y - 62, { font: mono(24, 500), color: C.text3, baseline: "middle" }));
    for (let i = 0; i < 3; i++) {
      if (cellIn[i] <= 0 || toRow[i] >= 1) continue;
      const home = { x: colX, y: cardRowC(i, 2).y };
      const dest = { x: instSt.x + instSt.k * (INST_CARDS.x + valX) - 14, y: home.y };
      const u = ease.inOutCubic(toRow[i]);
      const nudge = -10 * window(t, vT[i] - 0.1, vT[i] + 1.2, 0.25, 0.4);
      const x = lerp(home.x + nudge, dest.x, u);
      withScale(ctx, cellIn[i], x, home.y, () =>
        valueCell(ctx, { x, y: home.y, str: d.values[i], color: B[i], size: lerp(26, CS, u), hl: cellHl[i] * (1 - u), box: 1 - clamp((u - 0.45) / 0.45) }));
    }
    // '' !== nothing: a change
    if (neqU > 0) {
      const c0 = cardRowC(0, 2);
      const x = colX + 26, y = c0.y + 56;
      withAlpha(ctx, neqU, () => pieces(ctx, [
        { s: "''", font: mono(24, 600), color: B[0] },
        { s: " !== ", font: mono(24, 700), color: C.ok },
        { s: "nothing", font: mono(24, 500), color: C.text2 },
      ], x, y));
      check(ctx, colX + 2, y, 24, C.ok, prog(t, M.change + 0.3, 0.4) * neqU);
    }
  }

  // ------------------------------------------------ links and arrows
  // the root part's start node
  if (rootSt.a > 0.001 && bodySt.a > 0.001 && dvU < 1) {
    const a = P(rootSt, 0, 46 + 8 + CRH / 2);
    const er = d.emptyRow;
    const r = { x: bodyTree0.x + bodySt.k * er.depth * 2 * adv - 12, y: bodyTree0.y + bodySt.k * (er.index + 0.5) * TLH };
    const hook = curve(a, { x: a.x - 70, y: a.y }, { x: r.x - 120, y: r.y }, r);
    drawPoly(ctx, hook, { color: OBJ.root, width: 3 + window(t, M.insert - 0.2, M.insert + 2.2, 0.3, 0.5), alpha: Math.min(rootSt.a, bodySt.a) * (0.75 + 0.25 * rootGlow) * (1 - dvU), head: 12 });
  }
  // _$template -> the Template
  if (tmplLink > 0 && tplSt.a > 0.001) {
    const a = P(instSt, 0, 58 + CRH / 2);
    const b = P(tplSt, TPL_W + 10, 26);
    drawPoly(ctx, curve(a, { x: a.x - 200, y: a.y }, { x: b.x + 220, y: b.y }, b), { color: OBJ.template, width: 3, alpha: tmplLink * instSt.a, to: prog(t, M.instance + 0.45, 0.6), head: 12 });
  }
  // parts -> nodes
  for (let i = 0; i < 3; i++) {
    if (linkIn[i] <= 0 || linksA <= 0.001) continue;
    const emph = Math.max(neverU, i === 0 ? refPulse : 0, cardEmph[i]);
    drawPoly(ctx, links[i], { color: B[i], width: 3 + 1.5 * emph, to: linkIn[i], alpha: linksA * instSt.a * (0.8 + 0.2 * emph), glow: 0.3 + 0.7 * emph, head: 13 });
  }
  // the listener: the button -> the EventPart itself
  let listener = null;
  if (lsIn > 0 && t < M.detached + 0.5) {
    const r = nodeRow(2);
    const a = { x: r.x + r.w + 16, y: r.cy + 16 };
    const b = P(instSt, INST_CARDS.x, cardY(2) + 46 + 8 + 1.5 * CRH + 10);
    listener = sLink(a, b, 0.5);
    const la = 1 - prog(t, M.detached - 0.1, 0.4);
    drawPoly(ctx, listener, { color: B[2], width: 3, to: lsIn, alpha: la, dash: [9, 8], head: 13, glow: 0.5 * pulse(t, M.itselfW - 0.1, 1.2) });
    const mid = at(listener, 0.5);
    text(ctx, "listener", mid.x - 20, mid.y + 32, { font: sans(24, 600), color: B[2], baseline: "middle", alpha: la * prog(t, M.itself + 0.5, 0.4) });
  }
  // root part remembers its instance
  if (remArrow > 0 && rootSt.a > 0.001) {
    const a = P(rootSt, ROOT_W - 22, 46 + 8 + 2 * CRH + CRH / 2);
    const b = P(instSt, -6, 25);
    drawPoly(ctx, curve(a, { x: a.x + 60, y: a.y }, { x: b.x - 60, y: b.y }, b), { color: OBJ.instance, width: 3, to: remArrow, alpha: rootSt.a * (1 - dvU), head: 12, glow: 0.4 });
  }

  // ------------------------------------------------ things in flight
  packet(ctx, links[0], pk0, B[0]);
  packet(ctx, links[2], pk2, B[2]);
  if (listener) {
    packet(ctx, listener, pkBack, B[2]);
    if (clickU > 0 && clickU < 1) {
      const r = nodeRow(2);
      ctx.save();
      ctx.beginPath();
      ctx.arc(r.x + r.w / 2, r.cy, 16 + 60 * clickU, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(B[2], 0.85 * (1 - clickU));
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }
  }
  // the new text node: created by the ChildPart, then inserted after its comment
  if (chipIn > 0 && textRowIn < 1) {
    const port = cardPort(1);
    const born = { x: port.x - 120, y: port.y };
    const r = nodeRow(1);
    const dest = { x: r.x + blockK * 1.5 * adv, y: r.cy + blockK * TLH };
    const e = chipGo;
    const p = { x: lerp(born.x, dest.x, e), y: lerp(born.y, dest.y, e) + 8 * Math.sin(Math.PI * e) };
    const f = mono(TS, 500), w = measure(ctx, '"0"', f) + 26, h = TLH - 2;
    withAlpha(ctx, 1 - textRowIn, () => withScale(ctx, chipIn * blockK, p.x, p.y, () => {
      withGlow(ctx, rgba(B[1], 0.8), 18, () => fillRR(ctx, p.x - w / 2, p.y - h / 2, w, h, 9, "#15343a"));
      strokeRR(ctx, p.x - w / 2, p.y - h / 2, w, h, 9, B[1], 2);
      text(ctx, '"0"', p.x, p.y + 1, { font: f, color: blend(DOMC.text, B[1], 0.8), align: "center", baseline: "middle" });
      text(ctx, "text node", p.x, p.y - h / 2 - 20, { font: sans(22, 600), color: B[1], align: "center", baseline: "middle", alpha: 1 - clamp(e * 3) });
    }));
  }

  // ------------------------------------------------ walk: template.parts
  if (stripA > 0.001) {
    const sx = copySt.x, sy = copySt.y - 62;
    const lw = text(ctx, "template.parts", sx, sy, { font: mono(24, 500), color: C.text3, baseline: "middle", alpha: stripA });
    let cx = sx + lw + 22;
    const f = mono(24, 500);
    withAlpha(ctx, stripA, () => {
      text(ctx, "[", cx, sy, { font: mono(28, 400), color: C.text3, baseline: "middle" });
      cx += 22;
      const mids = [];
      d.tparts.forEach((p, i) => {
        const s = `index: ${p.index}`;
        const w = measure(ctx, s, f) + 28, h = 46;
        const done = prog(t, created[i], 0.3);
        const match = window(t, matched[i], created[i] + 0.8, 0.3, 0.5);
        fillRR(ctx, cx, sy - h / 2, w, h, 9, done > 0 ? rgba(B[i], 0.1 + 0.08 * done) : C.panel2);
        strokeRR(ctx, cx + 0.5, sy - h / 2 + 0.5, w - 1, h - 1, 9, done > 0 ? rgba(B[i], 0.3 + 0.4 * done) : C.border, 1.5);
        if (match > 0) withAlpha(ctx, match, () => withGlow(ctx, rgba(B[i], 0.9), 20, () => strokeRR(ctx, cx, sy - h / 2, w, h, 9, B[i], 2.5)));
        text(ctx, s, cx + w / 2, sy + 1, { font: f, color: done > 0 || match > 0 ? B[i] : C.text2, align: "center", baseline: "middle" });
        mids.push(cx + w / 2);
        cx += w + 12;
      });
      // the walk's next template part: one pointer, sliding along the list
      const pi = steps(t, 0, [[created[0] + 0.5, 1], [created[1] + 0.5, 2]], 0.45);
      const px = lerp(mids[Math.floor(pi)], mids[Math.min(2, Math.floor(pi) + 1)], pi - Math.floor(pi));
      withAlpha(ctx, window(t, M.walk + 0.3, created[2] + 0.5, 0.3, 0.3), () => {
        ctx.beginPath();
        ctx.moveTo(px - 9, sy - 39);
        ctx.lineTo(px + 9, sy - 39);
        ctx.lineTo(px, sy - 28);
        ctx.closePath();
        ctx.fillStyle = C.accent;
        ctx.fill();
      });
      text(ctx, "]", cx - 2, sy, { font: mono(28, 400), color: C.text3, baseline: "middle" });
    });
  }

  // ------------------------------------------------ captions
  const capX = copySt.x, capY = copySt.y + copySt.k * (COPY_TREE.y + (4 + uText) * TLH + 18) + 48;
  const cap = (u, fn) => { if (u > 0.001) withAlpha(ctx, u, fn); };
  // P2
  cap(window(t, M.clone + 0.3, M.walk - 0.8, 0.4, 0.3), () =>
    pieces(ctx, [
      { s: "document.", font: mono(24, 500), color: C.text2 },
      { s: "importNode", font: mono(24, 600), color: SYN.fn },
      { s: "(template.el.content, true)", font: mono(24, 500), color: C.text2 },
    ], capX, capY));
  cap(window(t, M.fast - 0.15, M.walk - 0.8, 0.4, 0.3), () =>
    text(ctx, "a native copy: no parsing", capX, capY + 50, { font: sans(28, 550), color: C.text, baseline: "middle" }));
  // P3
  cap(window(t, M.never + 0.1, M.update + 0.4, 0.4, 0.4), () =>
    text(ctx, "direct references: nothing to search for again", capX, capY, { font: sans(28, 550), color: C.text, baseline: "middle" }));
  cap(window(t, M.sets - 0.25, M.v1 - 0.3, 0.35, 0.4), () =>
    pieces(ctx, [
      { s: "span.", font: mono(26, 500), color: C.text2 },
      { s: "setAttribute", font: mono(26, 600), color: SYN.fn },
      { s: "('class', '')", font: mono(26, 500), color: B[0] },
    ], capX, capY));
  const addA = window(t, M.add - 0.15, M.detached - 0.1, 0.35, 0.4);
  cap(addA, () => {
    const f = mono(26, 500);
    const w0 = pieces(ctx, [
      { s: "button.", font: f, color: C.text2 },
      { s: "addEventListener", font: mono(26, 600), color: SYN.fn },
      { s: "('click', ", font: f, color: C.text2 },
      { s: "part", font: mono(26, 650), color: B[2] },
      { s: ")", font: f, color: C.text2 },
    ], capX, capY);
    const partX = capX + measure(ctx, "button.addEventListener('click', ", f);
    ring(ctx, { x: partX, y: capY - 17, w: measure(ctx, "part", f), h: 34, r: 7, color: B[2], u: prog(t, M.itselfW - 0.2, 0.4), pad: 5 });
    return w0;
  });
  cap(window(t, M.calls - 0.1, M.detached - 0.1, 0.4, 0.4), () =>
    pieces(ctx, [
      { s: "click  →  ", font: sans(26, 550), color: C.text },
      { s: "part.handleEvent()", font: mono(26, 550), color: B[2] },
      { s: "  →  the latest function", font: sans(26, 550), color: C.text },
    ], capX, capY + 52));

  // ------------------------------------------------ P1: the question
  if (askU > 0) {
    const rowC = P(rootSt, ROOT_W, 46 + 8 + 2 * CRH + CRH / 2);
    const lines = ["already showing", "an instance of", "this template?"];
    const f = sans(29, 550);
    const bw = Math.max(...lines.map((l) => measure(ctx, l, f))) + 52, bh = lines.length * 40 + 30;
    const bx = rowC.x + 34, by = rowC.y - bh / 2;
    withAlpha(ctx, askU, () => {
      ctx.strokeStyle = C.border2;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(rowC.x + 4, rowC.y);
      ctx.lineTo(bx, rowC.y);
      ctx.stroke();
      fillRR(ctx, bx, by, bw, bh, 14, C.panel2);
      strokeRR(ctx, bx + 0.5, by + 0.5, bw - 1, bh - 1, 14, C.border2, 1.5);
      lines.forEach((l, i) => text(ctx, l, bx + 26, by + 35 + i * 40, { font: f, color: C.text, baseline: "middle" }));
      if (noU > 0) {
        cross(ctx, bx + 30, by + bh + 46, 40, C.bad, noU);
        text(ctx, "no", bx + 64, by + bh + 47, { font: sans(34, 650), color: C.bad, baseline: "middle", alpha: noU });
      }
    });
  }

  // ------------------------------------------------ P5: devtools
  if (dvU > 0) {
    // a row of the page's tree, on screen
    const rowRect = (row) => {
      const r = d.body.rowRect(ctx, 0, 0, row);
      return { x: bodyTreeO.x + bodyK * r.x, y: bodyTreeO.y + bodyK * r.y, w: bodyK * r.w, h: bodyK * r.h };
    };
    const cm = rowRect(d.markerRow);
    if (ringU > 0) {
      const breathe = t > M.explain ? 0.8 + 0.2 * Math.sin((t - M.explain) * 4) : 1;
      ring(ctx, { ...cm, r: 8, color: GOLD, u: ringU * breathe, pad: 8 });
    }
    // copied: from the template's marker comment to the page's
    if (copiedU > 0) {
      const r0 = d.tpl.rowRect(ctx, 0, 0, d.tplMarkerRow);
      const a = P(tplSt, TPL_TREE.x + r0.x + r0.w + 12, TPL_TREE.y + r0.y + r0.h / 2);
      const b = { x: cm.x - 16, y: cm.y + cm.h / 2 };
      const Pl = curve(a, { x: a.x + 60, y: a.y }, { x: b.x - 60, y: b.y }, b);
      drawPoly(ctx, Pl, { color: GOLD, width: 3.5, to: copiedU, head: 14, glow: 0.6 });
      const mid = at(Pl, 0.5);
      text(ctx, "copied", mid.x, mid.y - 30, { font: sans(26, 650), color: GOLD, align: "center", baseline: "middle", alpha: prog(t, M.copied - 0.1, 0.4) });
    }
    // the child part: starts at the comment, its content is "0"
    if (bracketU > 0) {
      const zr = rowRect(d.bodyTextRow);
      const bx = cm.x - bodyK * adv - 2;
      const y0 = cm.y - 2, y1 = zr.y + zr.h + 2;
      withAlpha(ctx, bracketU, () => withGlow(ctx, rgba(B[1], 0.7), 12, () => {
        ctx.strokeStyle = B[1];
        ctx.lineWidth = 3.5;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(bx + 12, y0);
        ctx.lineTo(bx, y0);
        ctx.lineTo(bx, lerp(y0, y1, bracketU));
        if (bracketU >= 1) ctx.lineTo(bx + 12, y1);
        ctx.stroke();
      }));
      withAlpha(ctx, startLabel, () => {
        text(ctx, "←  child part starts here", cm.x + cm.w + 30, cm.y + cm.h / 2 + 1, { font: sans(28, 650), color: B[1], baseline: "middle" });
      });
    }
  }
}

