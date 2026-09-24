// nesting: a child part can hold a whole template, and handles it the way the
// root part does (look up, create if needed, update). A different template
// clears the part and creates a new instance; switching back is a cache hit
// (no prepare) but creates the instance again; the cache directive keeps both.
//
// Example: GREETING_SRC; data from truth.greeting (render0 = page(null),
// render1 = page('Ada'), render2 = page(null)).

import { C, DOMC, SYN, rgba } from "../kit/theme.js";
import { arrow, check, chip, fillRR, measure, mono, panel, ring, sans, strokeRR, text, withAlpha, withGlow } from "../kit/draw.js";
import { Code } from "../kit/code.js";
import { GREETING_SRC, OBJ, cacheTable, miniStrings } from "../kit/lit.js";
import { browserWindow } from "../kit/browser.js";
import { truth } from "../timing.js";
import { clamp, ease, lerp, prog, pulse, window } from "../util.js";
import { htmlLine, nodeSegs, tag } from "./rerender-helpers.js";

export const transition = "fade";

// ------------------------------------------------------------ data + layout

let D = null;
function data() {
  if (D) return D;
  const g = truth().greeting;
  const prep = (r) => g[r].events.filter((e) => e.kind === "template prep");
  const [headerPrep, buttonPrep] = prep("render0");
  const [pPrep] = prep("render1");
  // the DOM each template instance contributes, as captured
  const inst = (r) => g[r].events.filter((e) => e.kind === "template instantiated and updated");
  const header = inst("render0")[1].fragment.children[0];          // <header><!--?lit$…--><button>…</button></header>
  const button = inst("render0")[0].fragment.children[0];          // <button>Sign in</button>
  const p = inst("render1")[0].fragment.children[0];               // <p>Welcome back, <!--?lit$…-->Ada!</p>
  const button2 = inst("render2")[0].fragment.children[0];         // a new <button>Sign in</button>
  D = {
    code: new Code(GREETING_SRC, { size: 28 }),
    keys: { header: headerPrep.strings, button: buttonPrep.strings, p: pPrep.strings },
    markerComment: header.children[0],                              // <!--?lit$…--> (the inner part's start)
    segs: { button: nodeSegs(button), p: nodeSegs(p), button2: nodeSegs(button2) },
  };
  return D;
}

// The nested boxes: root ChildPart > page's TemplateInstance > <header> >
// ChildPart > greeting's TemplateInstance.
const LH = 62, TH = 48, PAD = 16, IND = 28, FS = 34;
const ROOT = { x: 60, y: 378, w: 1170 };
function layout() {
  const root = { ...ROOT };
  const page = { x: root.x + IND, y: root.y + TH + LH, w: root.w - 2 * IND };
  const inner = { x: page.x + IND, y: page.y + TH + LH, w: page.w - 2 * IND };
  const greet = { x: inner.x + IND, y: inner.y + TH + LH, w: inner.w - 2 * IND };
  greet.h = TH + LH + PAD - 6;
  inner.h = TH + LH + greet.h + PAD;
  page.h = TH + LH + inner.h + LH + PAD - 6;
  root.h = TH + LH + page.h + PAD;
  return {
    root, page, inner, greet,
    lines: {
      rootMarker: { x: root.x + IND, y: root.y + TH + LH / 2 },
      headerOpen: { x: page.x + IND, y: page.y + TH + LH / 2 },
      innerMarker: { x: inner.x + IND, y: inner.y + TH + LH / 2 },
      content: { x: greet.x + IND, y: greet.y + TH + LH / 2 },
      headerClose: { x: page.x + IND, y: inner.y + inner.h + LH / 2 },
    },
  };
}

const CACHE = { x: 1262, y: 36, w: 598 };
const CALLS = { x: 1262, y: 378, w: 598, h: 300 };
const CODE = { x: 60, y: 36 };
const PAGE = { x: 1262, y: 706, w: 598, h: 314 };

// A labelled box of the nesting diagram.
function box(ctx, r, { title, sub = null, color, alpha = 1, glow = 0, fill = 0.05, dashed = false }) {
  withAlpha(ctx, alpha, () => {
    fillRR(ctx, r.x, r.y, r.w, r.h, 14, rgba(color, fill));
    if (glow > 0) withGlow(ctx, rgba(color, 0.8 * glow), 26 * glow, () => strokeRR(ctx, r.x, r.y, r.w, r.h, 14, rgba(color, glow), 2.5));
    ctx.save();
    if (dashed) ctx.setLineDash([8, 7]);
    strokeRR(ctx, r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1, 14, rgba(color, 0.6), 1.8);
    ctx.restore();
    const tw = text(ctx, title, r.x + 18, r.y + TH / 2 + 2, { font: sans(25, 650), color, baseline: "middle" });
    if (sub) text(ctx, sub, r.x + 18 + tw + 14, r.y + TH / 2 + 2, { font: mono(23, 500), color: C.text3, baseline: "middle" });
  });
}

// The three steps a ChildPart takes with a template, as small pills.
// state[i]: 0 idle .. 1 lit; done[i]: check.
const STEPS = ["look up", "create", "update"];
function steps(ctx, xr, y, { alpha = 1, lit = [0, 0, 0], dim = false }) {
  const f = sans(21, 650);
  const ws = STEPS.map((s) => measure(ctx, s, f) + 30);
  const gap = 28;
  let x = xr - ws.reduce((a, b) => a + b, 0) - gap * 2;
  withAlpha(ctx, alpha, () => {
    STEPS.forEach((s, i) => {
      const u = lit[i];
      const col = dim ? C.text3 : C.accent;
      if (u > 0) withGlow(ctx, rgba(col, 0.7 * u), 16 * u, () => fillRR(ctx, x, y - 17, ws[i], 34, 17, rgba(col, 0.28 * u)));
      strokeRR(ctx, x + 1, y - 16, ws[i] - 2, 32, 16, u > 0 ? col : rgba(col, 0.55), 1.8);
      text(ctx, s, x + ws[i] / 2, y + 1, { font: f, color: u > 0.5 ? C.white : dim ? C.text3 : C.text2, align: "center", baseline: "middle" });
      x += ws[i];
      if (i < 2) text(ctx, "→", x + gap / 2, y, { font: sans(21, 500), color: C.text4, align: "center", baseline: "middle" });
      x += gap;
    });
  });
}

// A strings-array key: glyph + label.
function keyChip(ctx, x, y, label, { alpha = 1, color = C.text2, hl = 0, hlColor = C.ok } = {}) {
  const f = mono(22, 550);
  const w = measure(ctx, label, f) + 78;
  withAlpha(ctx, alpha, () => {
    fillRR(ctx, x, y - 20, w, 40, 10, hl > 0 ? rgba(hlColor, 0.1 + 0.12 * hl) : C.panel2);
    strokeRR(ctx, x + 0.5, y - 19.5, w - 1, 39, 10, hl > 0 ? rgba(hlColor, 0.4 + 0.5 * hl) : C.border2, 1.5);
    miniStrings(ctx, x + 12, y - 11, color, 0.75);
    text(ctx, label, x + 64, y + 1, { font: f, color: C.text, baseline: "middle" });
  });
  return w;
}

export function draw(F, S) {
  const { ctx, t } = F;
  const d = data();
  const L = layout();
  const m = (k) => S.m(k);

  // ------------------------------------------------------------ timing
  const enter = prog(t, S.start - 0.3, 0.7, ease.outCubic);
  const which = t < m("switch") - 0.2 ? 0 : t < m("back") - 0.2 ? 1 : 2; // which render
  // the greeting instance showing in the inner part
  const clear1 = prog(t, m("clear") - 0.05, 0.5);                   // button instance goes
  const make1 = prog(t, S.word(1, "creates") - 0.35, 0.45, ease.outBack); // p instance comes
  const clear2 = prog(t, S.word(1, "but") - 0.2, 0.45);             // p instance goes
  const make2 = prog(t, S.word(1, "create", 0) - 0.1, 0.45, ease.outBack); // new button instance
  const dirU = prog(t, m("directive") - 0.1, 0.5);

  // ------------------------------------------------------------ code
  const c = d.code;
  const cw = c.width(ctx);
  const pw = cw + 96, ph = c.height + 44 + 48;
  // which template literal is live
  const pLit = window(t, m("switch") - 0.2, m("back") - 0.3, 0.4, 0.4);
  const bLit = Math.max(window(t, m("nested") - 0.1, m("switch") - 0.3, 0.4, 0.4), prog(t, m("back") - 0.2, 0.4));
  withAlpha(ctx, enter, () => {
    panel(ctx, { x: CODE.x, y: CODE.y, w: pw, h: ph, title: "greeting.js", accent: SYN.fn });
    const x = CODE.x + 48, y = CODE.y + 44 + 22;
    const litRange = (k) => {
      const tok = c.tokens.filter((tk) => tk.tpl === k);
      return tok;
    };
    // washes on the two greeting templates (template literals 0 and 1)
    for (const [k, u] of [[0, pLit], [1, bLit]]) {
      if (u <= 0) continue;
      const toks = litRange(k);
      const first = toks[0], last = toks.at(-1);
      const r = c.rect(ctx, x, y, first.line, first.col - 5, last.col + last.text.length - first.col + 5);
      fillRR(ctx, r.x - 4, r.y, r.w + 8, r.h, 7, rgba(OBJ.template, 0.14 * u));
      withAlpha(ctx, u, () => strokeRR(ctx, r.x - 4, r.y, r.w + 8, r.h, 7, rgba(OBJ.template, 0.75), 1.8));
    }
    // the directive, written into the page template
    c.draw(ctx, x, y);
  });

  // ------------------------------------------------------------ calls
  const calls = ["render(page(null), document.body)", "render(page('Ada'), document.body)", "render(page(null), document.body)"];
  const callT = [S.start - 0.3, m("switch") - 0.3, m("back") - 0.3];
  withAlpha(ctx, enter * (1 - dirU), () => {
    panel(ctx, { x: CALLS.x, y: CALLS.y, w: CALLS.w, h: CALLS.h, title: "renders", accent: C.accent });
    calls.forEach((s, i) => {
      const u = prog(t, callT[i], 0.45);
      if (u <= 0) return;
      const cur = i === which;
      const y = CALLS.y + 44 + 52 + i * 78;
      withAlpha(ctx, u * (cur ? 1 : 0.45), () => {
        if (cur) fillRR(ctx, CALLS.x + 16, y - 30, CALLS.w - 32, 60, 10, rgba(C.accent, 0.12));
        text(ctx, String(i + 1), CALLS.x + 40, y + 1, { font: sans(22, 700), color: cur ? C.accent : C.text3, align: "center", baseline: "middle" });
        const cc = callCode(s);
        cc.draw(ctx, CALLS.x + 66, y - cc.lh / 2);
      });
    });
  });

  // ------------------------------------------------------------ cache
  const hitU = window(t, S.word(1, "skips") - 0.15, m("directive") - 0.2, 0.4, 0.5);
  // page('Ada'): the <p> template is looked up first; a miss, so it's prepared
  // and cached before the part compares templates and clears.
  const pEntry = prog(t, S.word(1, "template") - 0.1, 0.5);
  const cacheIn = enter * lerp(0.45, 1, prog(t, m("lookup") - 0.2, 0.5));
  const entries = [
    { key: "<header>…", u: 1 },
    { key: "<button>…", u: 1, hl: hitU, hlColor: C.ok },
    { key: "<p>…", u: pEntry, hl: pulse(t, S.word(1, "template") + 0.1, 1.3) },
  ];
  const ct = cacheTable(ctx, { x: CACHE.x, y: CACHE.y, w: CACHE.w, entries, alpha: cacheIn * (1 - 0.6 * dirU), minRows: 3 });
  // hit: prepare skipped
  const hitRow = ct.rows[1];
  check(ctx, hitRow.x + hitRow.w - 26, hitRow.y + hitRow.h / 2, 26, C.ok, prog(t, S.word(1, "skips") + 0.05, 0.4) * (1 - dirU));
  const skipU = window(t, S.word(1, "prepare,") - 0.1, m("directive") - 0.2, 0.4, 0.5);
  tag(ctx, { x: CACHE.x + CACHE.w, y: ct.y + ct.h + 16, text: "hit: prepare skipped", color: C.ok, align: "right", alpha: skipU, font: sans(22, 650), h: 38 });

  // ------------------------------------------------------------ diagram
  const nestU = prog(t, m("nested") - 0.3, 0.6);
  const innerHot = window(t, m("nested") + 0.3, m("same") + 0.4, 0.4, 0.6);
  const greetHot = window(t, S.word(0, "whole") - 0.1, m("same") + 0.4, 0.4, 0.6);
  withAlpha(ctx, enter, () => {
    box(ctx, L.root, { title: "ChildPart", sub: "(root, from render())", color: OBJ.root, alpha: 1 });
    htmlLine(ctx, [{ text: "<!---->", role: "comment" }], L.lines.rootMarker.x, L.lines.rootMarker.y, { size: FS });
    box(ctx, L.page, { title: "TemplateInstance", sub: "<header>…", color: OBJ.instance });
    htmlLine(ctx, [{ text: "<", role: "punct" }, { text: "header", role: "tag" }, { text: ">", role: "punct" }], L.lines.headerOpen.x, L.lines.headerOpen.y, { size: FS });
    htmlLine(ctx, [{ text: "</", role: "punct" }, { text: "header", role: "tag" }, { text: ">", role: "punct" }], L.lines.headerClose.x, L.lines.headerClose.y, { size: FS });
    // the inner child part, and what it holds
    withAlpha(ctx, nestU, () => {
      box(ctx, L.inner, { title: "ChildPart", color: OBJ.root, glow: innerHot, fill: 0.07 });
      htmlLine(ctx, [{ text: `<!--${d.markerComment.data}-->`, role: "comment" }], L.lines.innerMarker.x, L.lines.innerMarker.y, { size: FS });
    });
    // the greeting instances: the Sign in button, then Ada's, then a new button
    const g = L.greet;
    const inst = (u, segs, sub, extra = {}) => {
      if (u <= 0) return;
      const k = lerp(0.94, 1, clamp(u));
      ctx.save();
      ctx.translate(g.x + g.w / 2, g.y + g.h / 2);
      ctx.scale(k, k);
      ctx.translate(-(g.x + g.w / 2), -(g.y + g.h / 2));
      box(ctx, g, { title: "TemplateInstance", sub, color: OBJ.instance, alpha: clamp(u), fill: 0.08, ...extra });
      htmlLine(ctx, segs, L.lines.content.x, L.lines.content.y, { size: FS, alpha: clamp(u) });
      ctx.restore();
    };
    withAlpha(ctx, nestU, () => {
      inst(1 - clear1, d.segs.button, "<button>…", { glow: Math.max(greetHot, pulse(t, m("create") - 0.1, 1.0)) });
      inst(make1 * (1 - clear2), d.segs.p, "<p>…", { glow: pulse(t, S.word(1, "creates") - 0.1, 1.1) });
      inst(make2, d.segs.button2, "<button>…", { glow: pulse(t, S.word(1, "create", 0) - 0.05, 1.1) });
    });
    // "new instance" when it's created again
    const ni = window(t, S.word(1, "create", 0) + 0.2, m("directive") + 0.4, 0.35, 0.4);
    tag(ctx, { x: g.x + g.w - 18, y: g.y + 5, text: "new instance", color: OBJ.instance, align: "right", alpha: ni, font: sans(20, 650), h: 34 });
    const ni1 = window(t, S.word(1, "creates") + 0.2, m("back") - 0.3, 0.35, 0.4);
    tag(ctx, { x: g.x + g.w - 18, y: g.y + 5, text: "new instance", color: OBJ.instance, align: "right", alpha: ni1, font: sans(20, 650), h: 34 });
  });

  // steps: the root part did these; the inner part does the same
  const stepsU = window(t, m("same") - 0.2, m("switch") - 0.2, 0.4, 0.4);
  const lit = [prog(t, m("lookup") - 0.1, 0.3), prog(t, m("create") - 0.1, 0.3), prog(t, m("update") - 0.1, 0.3)];
  steps(ctx, L.root.x + L.root.w - 18, L.root.y + TH / 2 + 2, { alpha: stepsU * 0.9, lit: [0, 0, 0], dim: true });
  steps(ctx, L.inner.x + L.inner.w - 18, L.inner.y + TH / 2 + 2, { alpha: stepsU, lit });
  const sameU = window(t, m("same") + 0.2, m("lookup") + 0.3, 0.4, 0.4);
  text(ctx, "same steps as the root part", L.root.x + L.root.w - 18, L.root.y + TH + 18, { font: sans(20, 600), color: C.text3, align: "right", baseline: "middle", alpha: sameU });
  // the lookup goes to the cache
  const lk = window(t, m("lookup") + 0.1, m("create") + 0.2, 0.4, 0.4);
  if (lk > 0) {
    const from = { x: L.inner.x + L.inner.w - 300, y: L.inner.y + 6 };
    arrow(ctx, from, { x: ct.rows[1].x - 10, y: ct.rows[1].y + ct.rows[1].h / 2 }, { color: C.accent, width: 2.5, bend: 90, progress: prog(t, m("lookup") + 0.1, 0.5), alpha: lk });
  }

  // different template: the new result's strings aren't the instance's
  const diffU = window(t, S.word(1, "different") - 0.2, m("clear") + 0.6, 0.4, 0.4);
  const diff2 = window(t, m("back") - 0.1, S.word(1, "since") - 0.1, 0.4, 0.4);
  const diffRow = (a, b, u) => {
    if (u <= 0) return;
    const y = L.inner.y + TH / 2 + 2;
    let x = L.inner.x + L.inner.w - 18;
    withAlpha(ctx, u, () => {
      const f = mono(22, 550);
      const wb = measure(ctx, b, f) + 78, wa = measure(ctx, a, f) + 78;
      x -= wb;
      keyChip(ctx, x, y, b);
      text(ctx, "≠", x - 26, y + 1, { font: sans(30, 700), color: C.bad, align: "center", baseline: "middle" });
      keyChip(ctx, x - 52 - wa, y, a, { hl: 1, hlColor: C.accent });
      text(ctx, "new", x - 52 - wa - 14, y + 1, { font: sans(20, 650), color: C.accent, align: "right", baseline: "middle" });
    });
  };
  diffRow("<p>…", "<button>…", diffU);
  diffRow("<button>…", "<p>…", diff2);

  // ------------------------------------------------------------ the page
  withAlpha(ctx, enter, () => {
    const pg = browserWindow(ctx, { ...PAGE, url: "localhost:8000/greeting.html", title: "" });
    const cx = pg.x + pg.w / 2, cy = pg.y + pg.h / 2;
    const signIn = (a) => withAlpha(ctx, a, () => {
      fillRR(ctx, cx - 110, cy - 32, 220, 64, 12, "#e8ebf3");
      strokeRR(ctx, cx - 109.5, cy - 31.5, 219, 63, 12, "#aab2c8", 2);
      text(ctx, "Sign in", cx, cy + 2, { font: sans(30, 550), color: "#1c2233", align: "center", baseline: "middle" });
    });
    signIn((1 - clear1) + clamp(make2));
    withAlpha(ctx, clamp(make1) * (1 - clear2), () =>
      text(ctx, "Welcome back, Ada!", cx, cy + 2, { font: sans(38, 600), color: "#1c2233", align: "center", baseline: "middle" }));
  });

  // ------------------------------------------------------------ the cache directive
  if (dirU > 0) {
    const sx = CALLS.x, sy = CALLS.y;
    withAlpha(ctx, dirU, () => {
      panel(ctx, { x: sx, y: sy, w: CALLS.w, h: 122, title: "the cache directive", accent: OBJ.cache });
      const cc = callCode("${cache(greeting(user))}", 30);
      cc.draw(ctx, sx + 30, sy + 44 + 39 - cc.lh / 2, {
        style: (tok) => (tok.text === "cache" ? { color: OBJ.cache } : {}),
      });
    });
    const ku = prog(t, S.word(1, "keeps") - 0.15, 0.5, ease.outCubic);
    const kr = { x: sx, y: sy + 146, w: CALLS.w, h: TH + LH + PAD + 34 };
    withAlpha(ctx, ku, () => {
      box(ctx, kr, { title: "kept by cache()", color: OBJ.cache, dashed: true, fill: 0.04 });
      const ir = { x: kr.x + 12, y: kr.y + TH, w: kr.w - 24, h: TH + LH - 8 };
      box(ctx, ir, { title: "TemplateInstance", sub: "<p>…", color: OBJ.instance, fill: 0.08, alpha: 0.85 });
      const short = d.segs.p.map((sg) => (sg.role === "comment" ? { ...sg, text: "<!--?lit$…$-->" } : sg));
      htmlLine(ctx, short, ir.x + 18, ir.y + TH + (LH - 8) / 2 - 1, { size: 23, alpha: 0.85 });
    });
    const both = window(t, S.word(1, "both") - 0.1, S.end + 1, 0.4, 0.4);
    text(ctx, "both instances kept", L.root.x + L.root.w, L.root.y + L.root.h + 42, { font: sans(26, 650), color: OBJ.cache, align: "right", baseline: "middle", alpha: both });
  }
}

const CALLC = new Map();
function callCode(s, size = 24) {
  const k = `${size}|${s}`;
  if (!CALLC.has(k)) CALLC.set(k, new Code(s, { size }));
  return CALLC.get(k);
}
